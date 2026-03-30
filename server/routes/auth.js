const router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Officer = require('../models/Officer');
const Citizen = require('../models/Citizen');
const { sendOTP } = require('../services/email');

function isBcryptHash(value = '') {
  return /^\$2[aby]\$\d{2}\$/.test(value);
}

function normalizeEmail(value = '') {
  return String(value).trim().toLowerCase();
}

function normalizeText(value = '') {
  return String(value).trim();
}

function escapeRegex(value = '') {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildOtpResponse(base, otp, otpResult) {
  const isProduction = process.env.NODE_ENV === 'production';
  if (otpResult?.success) {
    return {
      ...base,
      deliveryFailed: false
    };
  }

  return {
    ...base,
    deliveryFailed: true,
    message: 'OTP generated but email delivery failed. Use the stored OTP for verification.',
    ...(isProduction ? {} : { debugOtp: otp })
  };
}

async function findOfficerByEmail(email) {
  if (!email) return null;
  const exact = await Officer.findOne({ email });
  if (exact) return exact;

  return Officer.findOne({
    email: { $regex: `^\\s*${escapeRegex(email)}\\s*$`, $options: 'i' }
  });
}

// POST /api/auth/officer/send-otp
router.post('/officer/send-otp', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = normalizeText(req.body.password);
    const officer = await findOfficerByEmail(email);

    if (!officer || !officer.isActive) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    let validPassword = false;

    if (isBcryptHash(officer.password)) {
      validPassword = await officer.comparePassword(password);
    } else if (password === officer.password) {
      // Upgrade legacy plain-text passwords on first successful login.
      officer.password = password;
      validPassword = true;
    }

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    officer.otp = otp;
    officer.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await officer.save();

    const otpResult = await sendOTP(officer.email, otp);

    res.json(buildOtpResponse({
      message: 'OTP sent to officer email',
      email: officer.email
    }, otp, otpResult));
  } catch (err) {
    console.error('Officer send OTP error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/officer/login
router.post('/officer/login', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = normalizeText(req.body.otp);
    const officer = await findOfficerByEmail(email);

    if (!officer || !officer.isActive) {
      return res.status(401).json({ error: 'Invalid officer account' });
    }
    if (!officer.otp || officer.otp !== otp) {
      return res.status(401).json({ error: 'Invalid OTP' });
    }
    if (!officer.otpExpiry || officer.otpExpiry < new Date()) {
      return res.status(401).json({ error: 'OTP expired. Request a new one.' });
    }

    officer.otp = undefined;
    officer.otpExpiry = undefined;
    await officer.save();

    const token = jwt.sign(
      { id: officer._id, role: officer.role, type: 'officer' },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      officer: {
        id: officer._id,
        name: officer.name,
        department: officer.department,
        zone: officer.zone,
        role: officer.role
      }
    });
  } catch (err) {
    console.error('Officer login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/citizen/send-otp
router.post('/citizen/send-otp', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    let citizen = await Citizen.findOne({ email });
    if (!citizen) {
      citizen = new Citizen({ email });
    }
    citizen.otp = otp;
    citizen.otpExpiry = otpExpiry;
    await citizen.save();

    const otpResult = await sendOTP(email, otp);

    res.json(buildOtpResponse({ message: 'OTP sent to your email', email }, otp, otpResult));
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// POST /api/auth/citizen/verify-otp
router.post('/citizen/verify-otp', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = normalizeText(req.body.otp);
    const citizen = await Citizen.findOne({ email });

    if (!citizen) return res.status(404).json({ error: 'Email not found. Request OTP first.' });
    if (citizen.otp !== otp) return res.status(401).json({ error: 'Invalid OTP' });
    if (citizen.otpExpiry < new Date()) return res.status(401).json({ error: 'OTP expired. Request a new one.' });

    citizen.isVerified = true;
    citizen.otp = undefined;
    citizen.otpExpiry = undefined;
    await citizen.save();

    const token = jwt.sign(
      { id: citizen._id, email: citizen.email, type: 'citizen' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      citizen: {
        id: citizen._id,
        email: citizen.email,
        name: citizen.name,
        phone: citizen.phone
      }
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// PATCH /api/auth/citizen/profile
router.patch('/citizen/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'citizen') return res.status(403).json({ error: 'Not a citizen token' });

    const { name, phone } = req.body;
    const citizen = await Citizen.findById(decoded.id);
    if (!citizen) return res.status(404).json({ error: 'Citizen not found' });

    if (name) citizen.name = name;
    if (phone) citizen.phone = phone;
    await citizen.save();

    res.json({ citizen: { id: citizen._id, email: citizen.email, name: citizen.name, phone: citizen.phone } });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

module.exports = router;
