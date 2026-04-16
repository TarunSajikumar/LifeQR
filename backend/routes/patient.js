const express = require('express');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const QRCode = require('qrcode');
const User = require('../models/User');

const router = express.Router();

const uploadsDir = path.join(__dirname, '../uploads/reports');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({ dest: uploadsDir });

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get patient profile by ID (for emergency access via QR)
router.get('/profile/:qrCodeId', async (req, res) => {
  try {
    const { qrCodeId } = req.params;
    
    const patient = await User.findOne({ qrCodeId, role: 'patient' }).select('-password -__v');
    
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    if (!patient.publicProfile) {
      return res.json({
        qrCodeId: patient.qrCodeId,
        name: patient.name,
        age: patient.age,
        bloodGroup: patient.bloodGroup,
        emergencyContact: patient.emergencyContact,
        phone: patient.phone,
        lastLocation: patient.lastLocation,
        privateProfile: true,
        message: 'This user has chosen to keep a private profile. Only core emergency details are shown.'
      });
    }

    res.json({
      qrCodeId: patient.qrCodeId,
      name: patient.name,
      age: patient.age,
      bloodGroup: patient.bloodGroup,
      allergies: patient.allergies,
      healthIssues: patient.healthIssues,
      medications: patient.medications,
      emergencyContact: patient.emergencyContact,
      phone: patient.phone,
      lastLocation: patient.lastLocation
    });
  } catch (error) {
    console.error('Error fetching patient profile:', error);
    res.status(500).json({ error: 'Failed to fetch patient profile' });
  }
});

router.get('/doctor/patient/:qrCodeId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Doctor access required' });
    }

    const { qrCodeId } = req.params;
    const doctorId = req.user.userId;
    const patient = await User.findOne({ qrCodeId, role: 'patient' }).select('-password -__v');

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const isAuthorized = patient.authorizedDoctors?.some(auth => String(auth.doctorId) === String(doctorId));
    const canViewSensitive = patient.publicProfile || isAuthorized;

    const response = {
      qrCodeId: patient.qrCodeId,
      name: patient.name,
      age: patient.age,
      bloodGroup: patient.bloodGroup,
      emergencyContact: patient.emergencyContact,
      phone: patient.phone,
      lastLocation: patient.lastLocation,
      publicProfile: patient.publicProfile,
      authorized: isAuthorized,
      reports: canViewSensitive ? patient.reports || [] : [],
      activities: canViewSensitive ? patient.activities || [] : [],
      sosAlerts: canViewSensitive ? patient.sosAlerts || [] : []
    };

    if (!canViewSensitive) {
      response.privateProfile = true;
      response.message = 'Patient is private. Request access or use emergency access if appropriate.';
    }

    res.json(response);
  } catch (error) {
    console.error('Error fetching doctor patient details:', error);
    res.status(500).json({ error: 'Failed to fetch patient details' });
  }
});

router.get('/doctor/patients', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Doctor access required' });
    }

    const doctorId = req.user.userId;
    const patients = await User.find({
      role: 'patient',
      'authorizedDoctors.doctorId': doctorId
    }).select('name email qrCodeId publicProfile lastLocation reports sosAlerts activities');

    const summary = patients.map(patient => ({
      id: patient._id,
      name: patient.name,
      email: patient.email,
      qrCodeId: patient.qrCodeId,
      publicProfile: patient.publicProfile,
      lastLocation: patient.lastLocation,
      reportCount: (patient.reports || []).length,
      sosCount: (patient.sosAlerts || []).length,
      activityCount: (patient.activities || []).length
    }));

    res.json({ patients: summary });
  } catch (error) {
    console.error('Error fetching authorized patients:', error);
    res.status(500).json({ error: 'Failed to fetch authorized patients' });
  }
});

// Get authenticated user's full profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password -__v');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.post('/sos', authenticateToken, async (req, res) => {
  try {
    const { lat, lng, message, sentTo } = req.body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'patient') {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const sosAlert = {
      status: 'sent',
      location: { lat, lng },
      message: message || 'Emergency SOS request',
      sentTo: Array.isArray(sentTo) ? sentTo : [],
      createdAt: new Date()
    };

    user.sosAlerts.unshift(sosAlert);
    user.activities.unshift({
      type: 'SOS',
      title: 'Emergency SOS Sent',
      description: sosAlert.message,
      metadata: {
        location: sosAlert.location,
        sentTo: sosAlert.sentTo
      },
      timestamp: new Date()
    });

    await user.save();

    res.json({ message: 'SOS alert created successfully', sosAlert });
  } catch (error) {
    console.error('Error creating SOS alert:', error);
    res.status(500).json({ error: 'Failed to send SOS alert' });
  }
});

router.post('/reports/upload', authenticateToken, upload.single('report'), async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'patient') {
      return res.status(404).json({ error: 'Patient not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Report file is required' });
    }

    const { category, description } = req.body;
    const report = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      url: `/uploads/${req.file.filename}`,
      category: category || 'General',
      description: description || '',
      uploadedAt: new Date()
    };

    user.reports.unshift(report);
    user.activities.unshift({
      type: 'Report Upload',
      title: `Uploaded ${req.file.originalname}`,
      description: report.description || `Uploaded medical report: ${req.file.originalname}`,
      metadata: { reportId: req.file.filename, category: report.category },
      timestamp: new Date()
    });

    await user.save();

    res.json({ message: 'Report uploaded successfully', report });
  } catch (error) {
    console.error('Error uploading report:', error);
    res.status(500).json({ error: 'Failed to upload report' });
  }
});

router.get('/reports', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('reports');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ reports: user.reports || [] });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

router.get('/activity', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('activities');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ activities: user.activities || [] });
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

router.put('/visibility', authenticateToken, async (req, res) => {
  try {
    const { publicProfile } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.publicProfile = publicProfile === true;
    await user.save();

    res.json({ message: 'Visibility updated', publicProfile: user.publicProfile });
  } catch (error) {
    console.error('Error updating visibility:', error);
    res.status(500).json({ error: 'Failed to update visibility' });
  }
});

// Update patient profile
router.put('/update', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      age,
      bloodGroup,
      healthIssues,
      allergies,
      medications,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelationship,
      specialization,
      licenseNumber,
      hospital,
      vehicleNumber,
      crewType,
      station,
      phone,
      address,
      city,
      state
    } = req.body;

    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update common fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (city) user.city = city;
    if (state) user.state = state;

    if (user.role === 'patient') {
      if (age) user.age = age;
      if (bloodGroup) user.bloodGroup = bloodGroup;
      if (healthIssues !== undefined) user.healthIssues = healthIssues;
      if (allergies !== undefined) user.allergies = allergies;
      if (medications !== undefined) user.medications = medications;
      
      if (emergencyContactName || emergencyContactPhone || emergencyContactRelationship) {
        user.emergencyContact = {
          name: emergencyContactName || user.emergencyContact?.name,
          phone: emergencyContactPhone || user.emergencyContact?.phone,
          relationship: emergencyContactRelationship || user.emergencyContact?.relationship
        };
      }

      // Regenerate QR code with updated data
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
      const qrUrl = `${frontendUrl}/emergency_access.html?id=${user.qrCodeId}`;

      const qrCodeDataURL = await QRCode.toDataURL(qrUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#6818f4',
          light: '#ffffff'
        }
      });

      user.qrCode = qrCodeDataURL;
    } else if (user.role === 'doctor') {
      if (specialization !== undefined) user.specialization = specialization;
      if (licenseNumber !== undefined) user.licenseNumber = licenseNumber;
      if (hospital !== undefined) user.hospital = hospital;
    } else if (user.role === 'crew') {
      if (vehicleNumber !== undefined) user.vehicleNumber = vehicleNumber;
      if (crewType !== undefined) user.crewType = crewType;
      if (station !== undefined) user.station = station;
    }

    await user.save();

    res.json({ 
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        qrCode: user.qrCode
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update live location for authenticated patient
router.put('/location', authenticateToken, async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'patient') {
      return res.status(404).json({ error: 'Patient not found' });
    }

    user.lastLocation = {
      lat,
      lng,
      updatedAt: new Date()
    };

    await user.save();

    res.json({
      message: 'Live location updated successfully',
      lastLocation: user.lastLocation
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Regenerate QR code
router.post('/regenerate-qr', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user || user.role !== 'patient') {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const qrUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/emergency_access.html?id=${user.qrCodeId}`;
    
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
    
    user.qrCode = qrCodeDataURL;
    await user.save();

    res.json({ 
      message: 'QR code regenerated successfully',
      qrCode: user.qrCode
    });
  } catch (error) {
    console.error('Error regenerating QR code:', error);
    res.status(500).json({ error: 'Failed to regenerate QR code' });
  }
});

// Log patient access (scan) - for doctor/crew scanning patient QR
router.post('/log-scan/:qrCodeId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor' && req.user.role !== 'crew') {
      return res.status(403).json({ error: 'Only doctors and crew can log scans' });
    }

    const { qrCodeId } = req.params;
    const scanner = await User.findById(req.user.userId).select('name role');
    
    if (!scanner) {
      return res.status(404).json({ error: 'Scanner not found' });
    }

    const patient = await User.findOne({ qrCodeId, role: 'patient' });
    
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Add activity log
    const activity = {
      type: req.user.role === 'doctor' ? 'Doctor Scan' : 'Crew Scan',
      title: `${req.user.role === 'doctor' ? 'Doctor' : 'Crew'} Access - ${scanner.name}`,
      description: `${scanner.name} (${req.user.role}) scanned your QR code`,
      metadata: {
        scannerId: scanner._id,
        scannerName: scanner.name,
        scannerRole: scanner.role,
        scanType: req.user.role
      },
      timestamp: new Date()
    };

    patient.activities.unshift(activity);
    await patient.save();

    res.json({ 
      message: 'Scan logged successfully',
      activity 
    });
  } catch (error) {
    console.error('Error logging scan:', error);
    res.status(500).json({ error: 'Failed to log scan' });
  }
});

module.exports = router;
