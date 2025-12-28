const User = require('../models/user');
const RVVerification = require('../models/RVVerification');
const { sendRVVerificationOTP } = require('../services/emailService');

const RV_EMAIL_REGEX = /^[^\s@]+@(rvce\.edu\.in|rv\.edu\.in|ms\.rvce\.edu\.in)$/i;

/**
 * Start RV College verification process
 * Validates RV email domain, generates 6-digit OTP, and sends it to the user's RV email
 * 
 * @route POST /api/rv-verification/start
 * @access Protected (requires authentication)
 * @param {Object} req.body - Request body
 * @param {string} req.body.rvEmail - RV College email address
 * @param {string} req.body.rvLoginId - Optional RV login ID
 * @param {string} req.body.idCardImageUrl - URL of uploaded ID card image
 * @returns {Object} 200 - Success response with status
 * @returns {Object} 400 - Validation error
 * @returns {Object} 404 - User not found
 * 
 * TODO: Add rate limiting to prevent OTP spam
 */
exports.startVerification = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { rvEmail, rvLoginId, idCardImageUrl } = req.body;

    if (!rvEmail || !idCardImageUrl) {
      return res.status(400).json({ 
        message: 'RV email and ID card image are required' 
      });
    }

    if (!RV_EMAIL_REGEX.test(rvEmail)) {
      return res.status(400).json({ 
        message: 'Invalid RV College email domain. Please use @rvce.edu.in, @rv.edu.in, or @ms.rvce.edu.in' 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate 6-digit OTP and set 10-minute expiration
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Upsert verification record (create if doesn't exist, update if exists)
    // This allows users to re-submit verification if previously rejected
    const verification = await RVVerification.findOneAndUpdate(
      { userId },
      {
        userId,
        rvEmail: rvEmail.toLowerCase().trim(),
        rvLoginId: rvLoginId ? rvLoginId.trim() : undefined,
        idCardImageUrl,
        otp,
        otpExpiresAt,
        emailVerified: false,
        status: 'pending'
      },
      { upsert: true, new: true }
    );

    sendRVVerificationOTP({
      userName: user.name,
      rvEmail: rvEmail.toLowerCase().trim(),
      otp,
      expiryMinutes: 10
    }).catch(err => {
      console.error('Failed to send RV verification OTP email:', err.message);
    });

    res.status(200).json({
      success: true,
      message: 'OTP sent to your RV email',
      status: 'pending',
      emailVerified: false
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Verify OTP for RV College email verification
 * Validates the OTP and checks expiration (10 minutes)
 * Upon success, marks verification as complete and clears OTP data
 * 
 * @route POST /api/rv-verification/verify-otp
 * @access Protected (requires authentication)
 * @param {Object} req.body - Request body
 * @param {string} req.body.otp - 6-digit OTP received via email
 * @returns {Object} 200 - Verification successful
 * @returns {Object} 400 - Invalid or expired OTP
 * @returns {Object} 404 - No pending verification found
 */
exports.verifyOTP = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ message: 'OTP is required' });
    }

    const verification = await RVVerification.findOne({ userId });

    if (!verification) {
      return res.status(404).json({ 
        success: false,
        message: 'No pending verification found. Please start verification first.' 
      });
    }

    // Validate OTP matches (plain text comparison - TODO: use bcrypt for production)
    if (verification.otp !== otp.trim()) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid OTP' 
      });
    }

    // Check if OTP has expired (10-minute window)
    if (new Date() > verification.otpExpiresAt) {
      return res.status(400).json({ 
        success: false,
        message: 'OTP has expired. Please request a new one.' 
      });
    }

    // Mark as verified and clear OTP data for security
    verification.emailVerified = true;
    verification.status = 'verified';
    verification.verifiedAt = new Date();
    verification.otp = undefined;
    verification.otpExpiresAt = undefined;
    await verification.save();

    res.status(200).json({
      success: true,
      emailVerified: true,
      status: 'verified',
      verifiedAt: verification.verifiedAt,
      message: 'RV College verification successful!'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get current RV verification status for the authenticated user
 * Returns different fields based on verification state (none/pending/verified/rejected)
 * 
 * @route GET /api/rv-verification/status
 * @access Protected (requires authentication)
 * @returns {Object} 200 - Current verification status with relevant fields
 * @returns {string} response.status - One of: 'none', 'pending', 'verified', 'rejected'
 * @returns {boolean} response.rvVerified - True if status is 'verified'
 * @returns {boolean} response.emailVerified - True if OTP was verified
 */
exports.getStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const verification = await RVVerification.findOne({ userId });

    if (!verification) {
      return res.status(200).json({
        rvVerified: false,
        status: 'none'
      });
    }

    const response = {
      rvVerified: verification.status === 'verified',
      status: verification.status,
      emailVerified: verification.emailVerified
    };

    // Include different fields based on verification status
    // This prevents exposing sensitive data (OTP, rejected notes) unnecessarily
    if (verification.status === 'verified') {
      response.rvEmail = verification.rvEmail;
      response.rvLoginId = verification.rvLoginId;
      response.idCardImageUrl = verification.idCardImageUrl;
      response.verifiedAt = verification.verifiedAt;
    } else if (verification.status === 'pending') {
      response.rvEmail = verification.rvEmail;
      response.idCardImageUrl = verification.idCardImageUrl;
    } else if (verification.status === 'rejected') {
      response.notes = verification.notes;
      response.rejectedAt = verification.rejectedAt;
    }

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
};

/**
 * Admin endpoint to review and approve/reject RV verification requests
 * Validates that email verification was completed before allowing approval
 * Updates status and sets appropriate timestamp (verifiedAt or rejectedAt)
 * 
 * @route POST /api/rv-verification/admin-review
 * @access Admin only (requires admin role)
 * @param {Object} req.body - Request body
 * @param {string} req.body.userId - ID of user being reviewed
 * @param {string} req.body.status - New status: 'verified' or 'rejected'
 * @param {string} req.body.notes - Optional admin notes (required for rejection)
 * @returns {Object} 200 - Review successful with updated verification data
 * @returns {Object} 400 - Validation error or email not verified
 * @returns {Object} 404 - Verification record not found
 */
exports.adminReview = async (req, res, next) => {
  try {
    const { userId, status, notes } = req.body;

    if (!userId || !status) {
      return res.status(400).json({ 
        message: 'userId and status are required' 
      });
    }

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ 
        message: 'Status must be either "verified" or "rejected"' 
      });
    }

    const verification = await RVVerification.findOne({ userId });

    if (!verification) {
      return res.status(404).json({ 
        message: 'No verification record found for this user' 
      });
    }

    if (status === 'verified' && !verification.emailVerified) {
      return res.status(400).json({ 
        message: 'Cannot verify: user has not completed email verification' 
      });
    }

    verification.status = status;
    verification.notes = notes || verification.notes;

    // Set appropriate timestamp and clear the opposite one
    // This ensures clean state transitions between verified/rejected
    if (status === 'verified') {
      verification.verifiedAt = new Date();
      verification.rejectedAt = undefined;
    } else if (status === 'rejected') {
      verification.rejectedAt = new Date();
      verification.verifiedAt = undefined;
    }

    await verification.save();

    res.status(200).json({
      success: true,
      verification: {
        userId: verification.userId,
        status: verification.status,
        notes: verification.notes,
        verifiedAt: verification.verifiedAt,
        rejectedAt: verification.rejectedAt
      }
    });
  } catch (err) {
    next(err);
  }
};
