// routes/auth.js - Authentication Routes
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { User } = require('../models/models');

// JWT tokens generate karo
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
};

// ─── REGISTER ───
// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Naam, email aur password zaroori hain'
      });
    }
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password kam se kam 8 characters ka hona chahiye'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Is email se account pehle se exist karta hai'
      });
    }

    // User create karo
    const user = await User.create({ name, email, password });
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Refresh token save karo
    user.refreshTokens.push(refreshToken);
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Account successfully bana gaya! Welcome to IntellMeet 🎉',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error. Dobara try karein.' });
  }
});

// ─── LOGIN ───
// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email aur password daalein'
      });
    }

    // User find karo with password
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ya password galat hai'
      });
    }

    // Password check karo
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email ya password galat hai'
      });
    }

    const { accessToken, refreshToken } = generateTokens(user._id);

    // Refresh token store karo
    user.refreshTokens.push(refreshToken);
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Successfully login ho gaye! 👋',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error. Dobara try karein.' });
  }
});

// ─── REFRESH TOKEN ───
// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token chahiye' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    // Purana remove karo, naya generate karo
    user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
    const tokens = generateTokens(user._id);
    user.refreshTokens.push(tokens.refreshToken);
    await user.save();

    res.json({ success: true, ...tokens });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token invalid ya expire ho gaya' });
  }
});

// ─── LOGOUT ───
// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const user = await User.findById(decoded.id);
      if (user) {
        user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
        user.isOnline = false;
        user.lastSeen = new Date();
        await user.save();
      }
    }
    res.json({ success: true, message: 'Successfully logout ho gaye!' });
  } catch (error) {
    res.json({ success: true, message: 'Logout successful' });
  }
});

module.exports = router;

// ─────────────────────────────────────────────
// middleware/auth.js - JWT Middleware
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Pehle login karein.'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User nahi mila. Dobara login karein.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session expire ho gaya. Dobara login karein.',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Role-based access
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Aapke paas is action ke liye permission nahi hai'
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
