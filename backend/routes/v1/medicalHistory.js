const express = require('express');
const PatientProfile = require('../../models/PatientProfile');
const User = require('../../models/User');
const { authenticateToken } = require('../../middleware/auth');
const { requireVerified } = require('../../middleware/requireVerified');
const { logEvent } = require('../../services/securityLogger');

const router = express.Router();

// Retrieve paginated medical history timeline
router.get('/:qrCodeId?', authenticateToken, async (req, res) => {
  try {
    let patientUserId = req.user.userId;
    let queryQrCodeId = req.params.qrCodeId;
    let profile = null;

    if (req.user.role === 'patient') {
      profile = await PatientProfile.findOne({ userId: patientUserId });
    } else if (req.user.role === 'doctor') {
      if (!queryQrCodeId) {
        return res.status(400).json({ error: 'Patient QR Code ID is required for doctors' });
      }
      profile = await PatientProfile.findOne({ qrCodeId: queryQrCodeId });
      if (!profile) {
        return res.status(404).json({ error: 'Patient profile not found' });
      }

      // Check if this doctor is authorized to view this patient profile
      const isAuthorized = profile.authorizedDoctors.some(
        doc => String(doc.doctorId) === String(req.user.userId)
      );
      if (!profile.publicProfile && !isAuthorized) {
        return res.status(403).json({ error: 'Not authorized to view this private patient profile' });
      }
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!profile) {
      return res.status(404).json({ error: 'Patient profile not found' });
    }

    // Pagination
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '10');
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const historyTimeline = profile.medicalHistory || [];
    const paginatedTimeline = historyTimeline.slice(startIndex, endIndex);

    res.json({
      history: paginatedTimeline,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(historyTimeline.length / limit),
        totalItems: historyTimeline.length,
        hasNextPage: endIndex < historyTimeline.length,
        hasPrevPage: startIndex > 0
      }
    });
  } catch (error) {
    console.error('Error fetching medical history:', error);
    res.status(500).json({ error: 'Failed to fetch medical history timeline' });
  }
});

// Add timeline entry (vitals/symptoms by patient, treatments by doctor)
router.post('/add/:qrCodeId?', authenticateToken, requireVerified, async (req, res) => {
  try {
    const { type, title, description } = req.body;
    if (!type || !title || !description) {
      return res.status(400).json({ error: 'Type, title, and description are required' });
    }

    if (!['treatment', 'vital', 'symptom'].includes(type)) {
      return res.status(400).json({ error: 'Invalid history timeline entry type' });
    }

    let queryQrCodeId = req.params.qrCodeId;
    let profile = null;
    const authorUser = await User.findById(req.user.userId).select('name role');

    if (req.user.role === 'patient') {
      profile = await PatientProfile.findOne({ userId: req.user.userId });
      if (type === 'treatment') {
        return res.status(403).json({ error: 'Patients cannot add treatment entries to their own records' });
      }
    } else if (req.user.role === 'doctor') {
      if (!queryQrCodeId) {
        return res.status(400).json({ error: 'Patient QR Code ID is required for doctors' });
      }
      profile = await PatientProfile.findOne({ qrCodeId: queryQrCodeId });
      if (!profile) {
        return res.status(404).json({ error: 'Patient profile not found' });
      }

      // Check authorization
      const isAuthorized = profile.authorizedDoctors.some(
        doc => String(doc.doctorId) === String(req.user.userId)
      );
      if (!isAuthorized) {
        return res.status(403).json({ error: 'You are not authorized by this patient to add treatment records' });
      }
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!profile) {
      return res.status(404).json({ error: 'Patient profile not found' });
    }

    const historyEntry = {
      type,
      title,
      description,
      author: {
        userId: req.user.userId,
        name: authorUser.name,
        role: authorUser.role
      },
      timestamp: new Date()
    };

    profile.medicalHistory.unshift(historyEntry);
    
    // Add to activity list as well
    profile.activities.unshift({
      type: 'Medical History Added',
      title: `Added timeline: ${title}`,
      description: `${authorUser.name} (${authorUser.role}) added a ${type} entry.`,
      timestamp: new Date()
    });

    await profile.save();

    logEvent('MEDICAL_HISTORY_ADDED', { patientId: profile.userId, authorId: req.user.userId, type });

    res.json({ message: 'Medical history entry added successfully', entry: historyEntry });
  } catch (error) {
    console.error('Error adding medical history:', error);
    res.status(500).json({ error: 'Failed to add medical history entry' });
  }
});

module.exports = router;
