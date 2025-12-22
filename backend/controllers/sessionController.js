const User = require('../models/user');
const Skill = require('../models/skill');
const { Session, Exchange } = require('../models/session');

// Create a new session booking (learner requests a session with mentor)
exports.requestSession = async (req, res, next) => {
  try {
    const learnerId = req.user.id;
    const { mentorId, skillId, skillName, scheduledAt, durationMins, pointsCost } = req.body;

    if (!mentorId || !scheduledAt) return res.status(400).json({ message: 'mentorId and scheduledAt are required' });

    const mentor = await User.findById(mentorId);
    if (!mentor) return res.status(404).json({ message: 'Mentor not found' });

    const learner = await User.findById(learnerId);
    if (!learner) return res.status(404).json({ message: 'Learner not found' });

    const cost = Number(pointsCost || 1);
    if ((learner.points || 0) < cost) return res.status(400).json({ message: 'Insufficient points' });

    // deduct learner points immediately (simple flow)
    learner.points = (learner.points || 0) - cost;
    await learner.save();

    const session = new Session({
      mentor: mentorId,
      learner: learnerId,
      skillRef: skillId || undefined,
      skillName: skillName || undefined,
      scheduledAt: new Date(scheduledAt),
      durationMins: durationMins || 60,
      pointsCost: cost,
      status: 'pending'
    });

    await session.save();
    res.status(201).json({ message: 'requested', session });
  } catch (err) {
    next(err);
  }
};

// List sessions for current user
exports.listMySessions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const query = { $or: [ { mentor: userId }, { learner: userId } ] };
    const sessions = await Session.find(query).sort({ scheduledAt: -1 }).populate('mentor', 'name email avatarUrl').populate('learner', 'name email avatarUrl');
    res.json({ sessions });
  } catch (err) {
    next(err);
  }
};

// Mentor confirms a session
exports.confirmSession = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.mentor.toString() !== userId) return res.status(403).json({ message: 'Only mentor can confirm' });
    if (session.status !== 'requested') return res.status(400).json({ message: 'Session is not in requested state' });

    session.status = 'confirmed';
    await session.save();
    res.json({ message: 'confirmed', session });
  } catch (err) {
    next(err);
  }
};

// Mark session complete and apply credits to mentor, add feedback/rating
exports.completeSession = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;
    const { rating, feedback } = req.body;

    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    // only mentor or learner can mark complete
    if (![session.mentor.toString(), session.learner.toString()].includes(userId)) return res.status(403).json({ message: 'Not allowed' });

    if (session.status === 'completed') return res.status(400).json({ message: 'Already completed' });

    session.status = 'completed';
    session.rating = rating || session.rating;
    session.feedback = feedback || session.feedback;
    await session.save();

    // award mentor points (simple rule: mentor earns 80% of cost)
    const mentor = await User.findById(session.mentor);
    if (mentor) {
      const reward = Math.max(0, Math.round((session.pointsCost || 0) * 0.8));
      mentor.points = (mentor.points || 0) + reward;
      await mentor.save();
    }

    res.json({ message: 'completed', session });
  } catch (err) {
    next(err);
  }
};

// Cancel session: if learner cancels after deduction, simple policy: refund if cancelled sufficiently early
exports.cancelSession = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    // only learner or mentor can cancel
    if (![session.mentor.toString(), session.learner.toString()].includes(userId)) return res.status(403).json({ message: 'Not allowed' });

    if (session.status === 'completed' || session.status === 'cancelled') return res.status(400).json({ message: 'Cannot cancel' });

    // refund policy: if cancelled more than 24 hours before scheduledAt, refund credits
    const now = new Date();
    const scheduled = new Date(session.scheduledAt);
    const diffMs = scheduled - now;
    let refund = 0;
    if (diffMs > 24 * 60 * 60 * 1000) refund = session.pointsCost || 0;

    if (refund > 0) {
      const learner = await User.findById(session.learner);
      if (learner) { learner.points = (learner.points || 0) + refund; await learner.save(); }
    }

    session.status = 'cancelled';
    await session.save();
    res.json({ message: 'cancelled', session, refund });
  } catch (err) {
    next(err);
  }
};

// Submit rating and feedback after session completion
exports.submitRating = async (req, res, next) => {
  try {
    const learnerId = req.user.id;
    const { sessionId } = req.params;
    const { rating, feedback } = req.body;

    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be 1-5' });

    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    if (session.learner.toString() !== learnerId) return res.status(403).json({ message: 'Only learner can rate' });

    session.rating = rating;
    session.feedback = feedback || '';
    await session.save();

    // Update mentor reputation: add rating to their profile and compute average
    const mentor = await User.findById(session.mentor);
    if (mentor) {
      if (!mentor.reviews) mentor.reviews = [];
      mentor.reviews.push({ from: learnerId, rating, feedback, createdAt: new Date() });
      const avg = mentor.reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / mentor.reviews.length;
      mentor.rating = Math.round(avg * 10) / 10;
      mentor.reviewsCount = mentor.reviews.length;
      await mentor.save();
    }

    res.json({ message: 'rated', session });
  } catch (err) {
    next(err);
  }
};

// Create a new exchange
exports.createExchange = async (req, res) => {
  try {
    const exchange = new Exchange(req.body);
    await exchange.save();
    res.status(201).json(exchange);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all exchanges
exports.getExchanges = async (req, res) => {
  try {
    const exchanges = await Exchange.find().populate('participants skills');
    res.status(200).json(exchanges);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update an exchange by ID
exports.updateExchange = async (req, res) => {
  try {
    const exchange = await Exchange.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!exchange) {
      return res.status(404).json({ message: 'Exchange not found' });
    }
    res.status(200).json(exchange);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Accept a request with meeting link
exports.acceptRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Only the mentor (receiver) can accept the request
    if (session.mentor.toString() !== userId) {
      return res.status(403).json({ message: 'Only the mentor can accept this request' });
    }

    if (session.status !== 'pending') {
      return res.status(400).json({ message: 'Session is not pending' });
    }

    const meetingId = Math.random().toString(36).substr(2, 11);
    const meetingLink = `https://zoom.us/meeting/${meetingId}`;
    
    session.status = 'accepted';
    session.meetingLink = meetingLink;
    await session.save();

    res.status(200).json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Reject a request
exports.rejectRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Only the mentor (receiver) can reject the request
    if (session.mentor.toString() !== userId) {
      return res.status(403).json({ message: 'Only the mentor can reject this request' });
    }

    if (session.status !== 'pending') {
      return res.status(400).json({ message: 'Session is not pending' });
    }

    session.status = 'rejected';
    await session.save();

    res.status(200).json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Schedule a session after acceptance
exports.scheduleSession = async (req, res) => {
  try {
    const { scheduledAt, durationMins, meetingLink } = req.body;
    const updateData = {
      status: 'scheduled',
      scheduledAt: new Date(scheduledAt),
      durationMins: durationMins || 60
    };
    
    if (meetingLink) {
      updateData.meetingLink = meetingLink;
    } else {
      const meetingId = Math.random().toString(36).substr(2, 11);
      updateData.meetingLink = `https://zoom.us/meeting/${meetingId}`;
    }
    
    const session = await Session.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    res.status(200).json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
