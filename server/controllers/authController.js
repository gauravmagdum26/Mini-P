const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');
const jwt = require('jsonwebtoken');

// Helper to get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });

  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    sameSite: 'Strict'
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        artisanData: user.artisanData
      }
    });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role, artisanData, location } = req.body;

  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (normalizedName.length < 2 || normalizedName.length > 80) {
    return res.status(400).json({ success: false, message: 'Name must be between 2 and 80 characters' });
  }
  if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizedEmail)) {
    return res.status(400).json({ success: false, message: 'Enter a valid email address' });
  }
  if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
    return res.status(400).json({ success: false, message: 'Password must be between 6 and 128 characters' });
  }
  if (!['buyer', 'artisan'].includes(role || 'buyer')) {
    return res.status(400).json({ success: false, message: 'Choose a valid account type' });
  }
  if (role === 'artisan') {
    const shopName = typeof artisanData?.shopName === 'string' ? artisanData.shopName.trim() : '';
    const upiId = typeof artisanData?.upiId === 'string' ? artisanData.upiId.trim() : '';
    const coordinates = location?.coordinates;
    if (shopName.length < 2 || shopName.length > 100) {
      return res.status(400).json({ success: false, message: 'Shop name must be between 2 and 100 characters' });
    }
    if (artisanData?.bio !== undefined && (typeof artisanData.bio !== 'string' || (artisanData.bio.trim().length > 0 && artisanData.bio.trim().length < 10) || artisanData.bio.trim().length > 500)) {
      return res.status(400).json({ success: false, message: 'Shop story must be empty or between 10 and 500 characters' });
    }
    if (!/^[A-Za-z0-9._-]+@[A-Za-z0-9][A-Za-z0-9.-]*$/.test(upiId) || upiId.length > 100) {
      return res.status(400).json({ success: false, message: 'Enter a valid UPI ID' });
    }
    if (!Array.isArray(coordinates) || coordinates.length !== 2 || !coordinates.every(Number.isFinite)) {
      return res.status(400).json({ success: false, message: 'Set a valid shop location' });
    }
    const [longitude, latitude] = coordinates;
    if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
      return res.status(400).json({ success: false, message: 'Set a valid shop location' });
    }
  }

  // Create user
  const user = await User.create({
    name: normalizedName,
    email: normalizedEmail,
    password,
    role: role || 'buyer',
    artisanData: role === 'artisan' ? {
      ...artisanData,
      shopName: artisanData.shopName.trim(),
      bio: artisanData.bio?.trim() || '',
      upiId: artisanData.upiId.trim(),
    } : undefined,
    location: role === 'artisan' ? location : undefined,
  });

  sendTokenResponse(user, 201, res);
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizedEmail) || normalizedEmail.length > 254) {
    return res.status(400).json({ success: false, message: 'Enter a valid email address' });
  }
  if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
    return res.status(400).json({ success: false, message: 'Password must be between 6 and 128 characters' });
  }

  // Check for user
  const user = await User.findOne({ email: normalizedEmail }).select('+password');
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  sendTokenResponse(user, 200, res);
});

// @desc    Log user out / clear cookie
// @route   GET /api/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    sameSite: 'Strict'
  });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: user
  });
});

