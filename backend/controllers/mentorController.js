const User = require('../models/user');
const RVVerification = require('../models/RVVerification');

// Browse/search mentors by skill, rating, and simple filters
// query params: skill, minRating, limit, page
exports.browseMentors = async (req, res, next) => {
  try {
    const { skill, minRating, limit = 12, page = 1 } = req.query;
    const skip = (page - 1) * limit;
    const filterRating = Number(minRating || 0);

    const filter = { rating: { $gte: filterRating } };
    if (skill) {
      // Search in teaches skill names (simple rule-based match)
      filter['teaches.name'] = { $regex: skill, $options: 'i' };
    }

    const mentors = await User.find(filter)
      .select('name email avatarUrl rating reviewsCount teaches learns badges credits title')
      .limit(Number(limit))
      .skip(skip)
      .sort({ rating: -1, reviewsCount: -1 });

    const mentorIds = mentors.map(m => m._id);
    const verifications = await RVVerification.find({ 
      userId: { $in: mentorIds }, 
      status: 'verified' 
    }).select('userId').lean();
    
    const verifiedUserIds = new Set(verifications.map(v => v.userId.toString()));
    const mentorsWithRV = mentors.map(m => {
      const mentorObj = m.toObject();
      mentorObj.rvVerificationStatus = verifiedUserIds.has(m._id.toString()) ? 'verified' : null;
      return mentorObj;
    });

    const total = await User.countDocuments(filter);

    res.json({ mentors: mentorsWithRV, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

// Get a mentor's profile details (public)
exports.getMentorProfile = async (req, res, next) => {
  try {
    const { mentorId } = req.params;
    const mentor = await User.findById(mentorId).select('-passwordHash -__v');
    if (!mentor) return res.status(404).json({ message: 'Mentor not found' });
    
    const rvVerification = await RVVerification.findOne({ userId: mentorId }).select('status').lean();
    
    res.json({ 
      mentor: {
        id: mentor._id,
        name: mentor.name,
        email: mentor.email,
        avatarUrl: mentor.avatarUrl,
        rating: mentor.rating,
        reviewsCount: mentor.reviewsCount,
        teaches: mentor.teaches || [],
        learns: mentor.learns || [],
        badges: mentor.badges || [],
        bio: mentor.bio,
        github: mentor.github,
        linkedin: mentor.linkedin,
        twitter: mentor.twitter,
        website: mentor.website,
        title: mentor.title,
        location: mentor.location,
        yearsOfExperience: mentor.yearsOfExperience,
        isVerified: mentor.isVerified,
        rvVerificationStatus: rvVerification?.status === 'verified' ? 'verified' : null,
        demoVideos: mentor.demoVideos || [],
        projectFiles: mentor.projectFiles || [],
        credits: mentor.points
      }
    });
  } catch (err) {
    next(err);
  }
};
