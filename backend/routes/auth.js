// routes/auth.js
const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/register
 * Body: { name, password, email }
 */
router.post(
  '/register',
  [
    body('name').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  authController.register
);

/**
 * POST /api/auth/login
 * Body: { username (name or email), password }
 */
router.post(
  '/login',
  [
    body('username').isLength({ min: 2 }).withMessage('Username must be at least 2 characters'),
    body('password').exists().withMessage('Password is required')
  ],
  authController.login
);

/**
 * GET /api/auth/me
 * Headers: Authorization: Bearer <token> OR cookie 'accessToken'
 * Protected route — requires authMiddleware
 */
router.get('/me', authMiddleware, authController.getMe);

// Update current user's profile
router.put('/me', authMiddleware, authController.updateMe);

/**
 * POST /api/auth/refresh
 * Body: none (reads refreshToken from httpOnly cookie)
 * Rotates refresh token and issues new access cookie (and new refresh cookie).
 */
router.post('/refresh', authController.refresh);

/**
 * POST /api/auth/logout
 * Body: none (reads refreshToken from httpOnly cookie)
 * Revokes refresh token and clears auth cookies.
 */
router.post('/logout', authController.logout);


// Route to send verification email
router.post('/send-verification-email', authController.sendVerificationEmail);

// Route to verify email
router.get('/verify-email', authController.verifyEmail);

module.exports = router;
