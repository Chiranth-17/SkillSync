const express = require('express');
const auth = require('../middleware/auth');
const sessionController = require('../controllers/sessionController');

const router = express.Router();

// Learner requests a session with a mentor
router.post('/', auth, sessionController.requestSession);

// Get sessions for current user
router.get('/me', auth, sessionController.listMySessions);

// Mentor confirms a requested session
router.put('/:sessionId/confirm', auth, sessionController.confirmSession);

// Mark a session completed (mentor or learner)
router.put('/:sessionId/complete', auth, sessionController.completeSession);

// Submit rating and feedback (learner)
router.post('/:sessionId/rate', auth, sessionController.submitRating);

// Cancel a session
router.delete('/:sessionId', auth, sessionController.cancelSession);

// Route to create a new exchange
router.post('/exchanges', auth, sessionController.createExchange);

// Route to get all exchanges
router.get('/exchanges', auth, sessionController.getExchanges);

// Route to update an exchange by ID
router.put('/exchanges/:id', auth, sessionController.updateExchange);

// Route to accept a request
router.put('/:id/accept', auth, sessionController.acceptRequest);

// Route to reject a request
router.put('/:id/reject', auth, sessionController.rejectRequest);

// Route to schedule a session after acceptance
router.put('/:id/schedule', auth, sessionController.scheduleSession);
module.exports = router;
