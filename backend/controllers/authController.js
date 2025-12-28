// controllers/authController.js
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const RVVerification = require('../models/RVVerification');
const { createAccessToken, createRefreshToken, rotateRefreshToken, revokeRefreshToken } = require('../utils/tokenService');
const nodemailer = require('nodemailer');

const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);

const cookieOptions = (maxAgeMs) => {
  const secure = process.env.COOKIE_SECURE === 'true';
  const sameSite = secure ? 'none' : 'lax';
  const domain = process.env.COOKIE_DOMAIN && process.env.COOKIE_DOMAIN.length ? process.env.COOKIE_DOMAIN : undefined;
  const opts = {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: maxAgeMs
  };
  if (domain) opts.domain = domain;
  return opts;
};

// helper to set cookies for access + refresh tokens
async function setAuthCookies(res, user) {
  // create tokens
  const accessToken = createAccessToken({ id: user._id });
  const refreshToken = await createRefreshToken(user._id);

  // compute expiry milliseconds for cookie
  // access token TTL (approx)
  const accessTTL = parseAccessTTLMs(process.env.ACCESS_TOKEN_EXPIRES_IN || '15m');
  const refreshTTL = parseAccessTTLMs(process.env.REFRESH_TOKEN_EXPIRES_IN || '7d');

  // set cookies
  res.cookie('accessToken', accessToken, cookieOptions(accessTTL));
  res.cookie('refreshToken', refreshToken, cookieOptions(refreshTTL));

  return { accessToken };
}

// parse TTL strings like '15m','7d' -> milliseconds
function parseAccessTTLMs(ttl) {
  if (!ttl) return 15 * 60 * 1000;
  if (ttl.endsWith('d')) return parseInt(ttl.slice(0, -1), 10) * 24 * 60 * 60 * 1000;
  if (ttl.endsWith('h')) return parseInt(ttl.slice(0, -1), 10) * 60 * 60 * 1000;
  if (ttl.endsWith('m')) return parseInt(ttl.slice(0, -1), 10) * 60 * 1000;
  return 15 * 60 * 1000;
}

// Register
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password } = req.body;
    
    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    // Check if name already exists (case-insensitive)
    const existingName = await User.findOne({ name: { $regex: new RegExp('^' + name + '$', 'i') } });
    if (existingName) return res.status(400).json({ message: 'Name already taken' });
    
    // Check if email already exists (case-insensitive)
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) return res.status(400).json({ message: 'Email already registered' });

    const salt = await bcrypt.genSalt(saltRounds);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash
    });

    await user.save();

    const { accessToken } = await setAuthCookies(res, user);

    res.status(201).json({
      message: 'registered',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        points: user.points,
        teaches: user.teaches || [],
        learns: user.learns || [],
        badges: user.badges || [],
        rating: user.rating || 0,
        reviewsCount: user.reviewsCount || 0
      },
      accessToken
    });
  } catch (err) {
    console.error('Registration error:', err);
    if (err.code === 11000) {
      // MongoDB duplicate key error
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ message: `${field} already exists` });
    }
    next(err);
  }
};

// Login
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    // username can be either name or email (case-insensitive for email)
    const user = await User.findOne({
      $or: [
        { name: username },
        { email: username.toLowerCase() }
      ]
    });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const { accessToken } = await setAuthCookies(res, user);

    res.json({
      message: 'logged_in',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        points: user.points,
        teaches: user.teaches || [],
        learns: user.learns || [],
        badges: user.badges || [],
        rating: user.rating || 0,
        reviewsCount: user.reviewsCount || 0
      },
      accessToken
    });
  } catch (err) {
    console.error('Login error:', err);
    next(err);
  }
};

// Protected route uses existing middleware/auth.js but we should update it to read accessToken from cookie as well
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash -__v');
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const rvVerification = await RVVerification.findOne({ userId: req.user.id }).select('status').lean();
    const userObj = user.toObject();
    userObj.rvVerificationStatus = rvVerification?.status === 'verified' ? 'verified' : null;
    
    res.json({ user: userObj });
  } catch (err) {
    next(err);
  }
};

// Refresh endpoint - reads refreshToken cookie, rotates it, issues new access token cookie
exports.refresh = async (req, res, next) => {
  try {
    const incoming = req.cookies && req.cookies.refreshToken;
    if (!incoming) return res.status(401).json({ message: 'No refresh token' });

    const newToken = await rotateRefreshToken(incoming);
    if (!newToken) {
      // invalid or expired -> clear cookies
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // get the refresh token doc to find user
    const RefreshToken = require('../models/RefreshToken');
    const doc = await RefreshToken.findOne({ token: newToken });
    const userId = doc.user;

    // create new access token
    const UserModel = require('../models/user');
    const user = await UserModel.findById(userId);
    if (!user) return res.status(401).json({ message: 'User not found' });

    const accessToken = createAccessToken({ id: user._id });

    // set cookies: new refreshToken and accessToken
    const accessTTL = parseAccessTTLMs(process.env.ACCESS_TOKEN_EXPIRES_IN || '15m');
    const refreshTTL = parseAccessTTLMs(process.env.REFRESH_TOKEN_EXPIRES_IN || '7d');

    res.cookie('accessToken', accessToken, cookieOptions(accessTTL));
    res.cookie('refreshToken', newToken, cookieOptions(refreshTTL));

    res.json({ message: 'refreshed', accessToken });
  } catch (err) {
    next(err);
  }
};

// Logout - revoke refresh token and clear cookies
exports.logout = async (req, res, next) => {
  try {
    const incoming = req.cookies && req.cookies.refreshToken;
    if (incoming) await revokeRefreshToken(incoming);

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.json({ message: 'logged_out' });
  } catch (err) {
    next(err);
  }
};

// Update current user profile (allowed fields only)
exports.updateMe = async (req, res, next) => {
  try {
    // allowed updates: name, avatarUrl, bio, github, linkedin, demoVideos, projectFiles
    const updates = {};
    if (typeof req.body.name === 'string' && req.body.name.trim().length) updates.name = req.body.name.trim();
    if (typeof req.body.avatarUrl === 'string') updates.avatarUrl = req.body.avatarUrl.trim();
    if (typeof req.body.bio === 'string') updates.bio = req.body.bio.trim();
    if (typeof req.body.location === 'string') updates.location = req.body.location.trim();
    if (typeof req.body.github === 'string') updates.github = req.body.github.trim();
    if (typeof req.body.linkedin === 'string') updates.linkedin = req.body.linkedin.trim();
    if (typeof req.body.twitter === 'string') updates.twitter = req.body.twitter.trim();
    if (typeof req.body.website === 'string') updates.website = req.body.website.trim();
    if (typeof req.body.title === 'string') updates.title = req.body.title.trim();
    if (typeof req.body.yearsOfExperience === 'number') updates.yearsOfExperience = req.body.yearsOfExperience;

    // Handle demoVideos: expect array of {url, description}
    if (Array.isArray(req.body.demoVideos)) {
      updates.demoVideos = req.body.demoVideos.map(v => ({
        url: v.url,
        description: v.description || ''
      }));
    }

    // Handle projectFiles: expect array of {url, description}
    if (Array.isArray(req.body.projectFiles)) {
      updates.projectFiles = req.body.projectFiles.map(f => ({
        url: f.url,
        description: f.description || '',
        uploadedAt: new Date()
      }));
    }

    if (Object.keys(updates).length === 0) return res.status(400).json({ message: 'No valid fields to update' });

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-passwordHash -__v');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'profile_updated', user });
  } catch (err) {
    next(err);
  }
};


// Send verification email
exports.sendVerificationEmail = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ collegeEmail: email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const verificationToken = Math.random().toString(36).substring(2, 15);
    user.verificationToken = verificationToken;
    await user.save();

    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify Your College Email',
      text: `Please verify your email by clicking the following link: ${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Verification email sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Verify email
exports.verifyEmail = async (req, res) => {
  const { token } = req.query;

  try {
    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return res.status(404).json({ message: 'Invalid or expired token' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
