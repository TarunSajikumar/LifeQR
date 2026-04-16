const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const crypto = require('crypto');
const User = require('../models/User');

const router = express.Router();

function formatNamePrefix(name) {
  if (!name || typeof name !== 'string') return 'USER';
  const cleaned = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
  if (cleaned.length === 0) return 'USER';
  return cleaned.length <= 3 ? cleaned : cleaned.slice(0, 3);
}

function getDateSegment() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const segments = [day, month, year];
  return segments[Math.floor(Math.random() * segments.length)];
}

function randomSuffix(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < length; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return suffix;
}

async function generatePatientQrCodeId(name) {
  let id;
  do {
    const prefix = formatNamePrefix(name);
    const dateSegment = getDateSegment();
    const suffixLength = Math.random() < 0.5 ? 1 : 2;
    const suffix = randomSuffix(suffixLength);
    id = `${prefix}${dateSegment}${suffix}`;
  } while (await User.findOne({ qrCodeId: id }));
  return id;
}

// Register route
router.post('/register', async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password, 
      role,
      // Patient fields
      age,
      bloodGroup,
      healthIssues,
      allergies,
      medications,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelationship,
      // Doctor fields
      specialization,
      licenseNumber,
      hospital,
      // Crew fields
      vehicleNumber,
      crewType,
      station,
      // Common fields
      phone,
      address,
      city,
      state
    } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Prepare user data
    const userData = {
      name,
      email,
      password: hashedPassword,
      role,
      phone,
      address,
      city,
      state
    };

    // Add role-specific data
    if (role === 'patient') {
      userData.age = age;
      userData.bloodGroup = bloodGroup;
      userData.healthIssues = healthIssues;
      userData.allergies = allergies;
      userData.medications = medications;
      
      if (emergencyContactName && emergencyContactPhone) {
        userData.emergencyContact = {
          name: emergencyContactName,
          phone: emergencyContactPhone,
          relationship: emergencyContactRelationship
        };
      }
      
      // Generate unique patient QR code ID using the requested pattern
      const qrCodeId = await generatePatientQrCodeId(name);
      userData.qrCodeId = qrCodeId;
      
      // Generate QR code with URL that links to emergency access page
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
      const qrUrl = `${frontendUrl}/emergency_access.html?id=${qrCodeId}`;
      
      const qrCodeDataURL = await QRCode.toDataURL(qrUrl, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      userData.qrCode = qrCodeDataURL;
    } else if (role === 'doctor') {
      userData.specialization = specialization;
      userData.licenseNumber = licenseNumber;
      userData.hospital = hospital;
    } else if (role === 'crew') {
      userData.vehicleNumber = vehicleNumber;
      userData.crewType = crewType;
      userData.station = station;
    }

    // Create user
    const user = await User.create(userData);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role }, 
      process.env.JWT_SECRET || 'your-secret-key-change-this',
      { expiresIn: '7d' }
    );

    res.status(201).json({ 
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        qrCode: user.qrCode,
        qrCodeId: user.qrCodeId
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user is active
    if (!user.active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role }, 
      process.env.JWT_SECRET || 'your-secret-key-change-this',
      { expiresIn: '7d' }
    );

    res.json({ 
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        qrCode: user.qrCode,
        qrCodeId: user.qrCodeId
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Verify token route
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      valid: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        qrCode: user.qrCode,
        qrCodeId: user.qrCodeId
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
