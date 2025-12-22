const express = require('express');
const mentorController = require('../controllers/mentorController');

const router = express.Router();

// Browse/search mentors by skill, rating, etc.
router.get('/', mentorController.browseMentors);

// Get a mentor's public profile
router.get('/:mentorId', mentorController.getMentorProfile);

module.exports = router;
