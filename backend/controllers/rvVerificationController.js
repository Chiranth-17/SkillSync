const User = require('../models/user');
const RVVerification = require('../models/RVVerification');
const { sendRVVerificationOTP } = require('../services/emailService');

const RV_EMAIL_REGEX = /^[^\s@]+@(rvce\.edu\.in|rv\.edu\.in|ms\.rvce\.edu\.in)$/i;

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

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

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

    if (verification.otp !== otp.trim()) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid OTP' 
      });
    }

    if (new Date() > verification.otpExpiresAt) {
      return res.status(400).json({ 
        success: false,
        message: 'OTP has expired. Please request a new one.' 
      });
    }

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
