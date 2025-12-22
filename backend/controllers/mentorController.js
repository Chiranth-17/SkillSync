const User = require('../models/user');

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

    const total = await User.countDocuments(filter);

    res.json({ mentors, total, page: Number(page), limit: Number(limit) });
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
        demoVideos: mentor.demoVideos || [],
        projectFiles: mentor.projectFiles || [],
        credits: mentor.points
      }
    });
  } catch (err) {
    next(err);
  }
};
