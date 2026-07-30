const express = require('express');
const fs = require('fs');
const path = require('path');
const User = require('../../models/User');
const PatientProfile = require('../../models/PatientProfile');
const DoctorProfile = require('../../models/DoctorProfile');
const CrewProfile = require('../../models/CrewProfile');
const VerificationDocument = require('../../models/VerificationDocument');
const { authenticateToken } = require('../../middleware/auth');
const { logEvent } = require('../../services/securityLogger');

const router = express.Router();

// Enforce admin permission middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  next();
};

// Get admin analytics statistics
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({});
    const patientsCount = await User.countDocuments({ role: 'patient' });
    const doctorsCount = await User.countDocuments({ role: 'doctor' });
    const crewCount = await User.countDocuments({ role: 'crew' });

    // Aggregate statistics across patient profiles
    const profiles = await PatientProfile.find({});
    
    let totalScans = 0;
    let totalSos = 0;

    profiles.forEach(p => {
      // Calculate QR scans from activities
      const scans = p.activities.filter(act => act.type && act.type.includes('Scan')).length;
      totalScans += scans;
      
      // Calculate SOS alerts
      totalSos += p.sosAlerts.length;
    });

    // Verification stats
    const pendingVerifications = await User.countDocuments({ 
      verificationStatus: { $in: ['PENDING', 'UNDER_REVIEW'] },
      role: { $in: ['doctor', 'crew'] }
    });
    const verifiedCount = await User.countDocuments({ verificationStatus: 'VERIFIED', role: { $in: ['doctor', 'crew'] } });

    res.json({
      users: {
        total: totalUsers,
        patient: patientsCount,
        doctor: doctorsCount,
        crew: crewCount
      },
      stats: {
        scans: totalScans,
        sos: totalSos
      },
      verification: {
        pending: pendingVerifications,
        verified: verifiedCount
      }
    });
  } catch (error) {
    console.error('Failed to aggregate admin stats:', error);
    res.status(500).json({ error: 'Failed to retrieve stats data' });
  }
});

// Retrieve all user records for admin user management table
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users list' });
  }
});

// Activate or Deactivate user account
router.put('/users/:id/toggle-status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    if (active === undefined) {
      return res.status(400).json({ error: 'Active boolean value is required' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.role === 'admin') {
      return res.status(400).json({ error: 'Cannot deactivate admin accounts' });
    }

    targetUser.active = active;
    await targetUser.save();

    logEvent('USER_STATUS_TOGGLED', {
      adminId: req.user.userId,
      targetUserId: targetUser._id,
      active
    });

    res.json({
      message: `User account has been successfully ${active ? 'activated' : 'deactivated'}`,
      user: {
        id: targetUser._id,
        name: targetUser.name,
        active: targetUser.active
      }
    });
  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({ error: 'Failed to toggle account activation status' });
  }
});

// ============================================================
// Verification Management Routes
// ============================================================

// List all pending verifications (filterable by status)
router.get('/verifications', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const statusFilter = req.query.status; // optional filter: PENDING, UNDER_REVIEW, VERIFIED, etc.
    const filter = { role: { $in: ['doctor', 'crew'] } };
    
    if (statusFilter) {
      filter.verificationStatus = statusFilter;
    } else {
      // Default: show actionable items (PENDING + UNDER_REVIEW)
      filter.verificationStatus = { $in: ['PENDING', 'UNDER_REVIEW'] };
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    // Enrich with profile details
    const enrichedUsers = await Promise.all(users.map(async (u) => {
      let profileDetails = null;
      if (u.role === 'doctor') {
        profileDetails = await DoctorProfile.findOne({ userId: u._id });
      } else if (u.role === 'crew') {
        profileDetails = await CrewProfile.findOne({ userId: u._id });
      }

      const documents = await VerificationDocument.find({ userId: u._id })
        .select('documentType originalName uploadedAt')
        .sort({ uploadedAt: -1 });

      return {
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        verificationStatus: u.verificationStatus,
        verificationNote: u.verificationNote,
        createdAt: u.createdAt,
        profile: profileDetails,
        documentsCount: documents.length,
        hasDocuments: documents.length > 0
      };
    }));

    res.json({ verifications: enrichedUsers });
  } catch (error) {
    console.error('Error fetching verifications:', error);
    res.status(500).json({ error: 'Failed to fetch verification queue' });
  }
});

// Get detailed verification info for a specific user
router.get('/verifications/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!['doctor', 'crew'].includes(user.role)) {
      return res.status(400).json({ error: 'Verification only applies to doctor and crew accounts' });
    }

    let profileDetails = null;
    if (user.role === 'doctor') {
      profileDetails = await DoctorProfile.findOne({ userId: user._id });
    } else if (user.role === 'crew') {
      profileDetails = await CrewProfile.findOne({ userId: user._id });
    }

    const documents = await VerificationDocument.find({ userId: user._id })
      .sort({ uploadedAt: -1 });

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        verificationStatus: user.verificationStatus,
        verificationNote: user.verificationNote,
        verificationReviewedAt: user.verificationReviewedAt,
        createdAt: user.createdAt
      },
      profile: profileDetails,
      documents: documents.map(doc => ({
        id: doc._id,
        type: doc.documentType,
        originalName: doc.originalName,
        mimeType: doc.mimeType,
        filename: doc.filename,
        uploadedAt: doc.uploadedAt
      }))
    });
  } catch (error) {
    console.error('Error fetching verification details:', error);
    res.status(500).json({ error: 'Failed to fetch verification details' });
  }
});

// Admin updates verification status (approve, reject, suspend, revoke)
router.put('/verifications/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, note } = req.body;

    const validStatuses = ['VERIFIED', 'SUSPENDED', 'REVOKED', 'PENDING'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!['doctor', 'crew'].includes(targetUser.role)) {
      return res.status(400).json({ error: 'Verification only applies to doctor and crew accounts' });
    }

    const previousStatus = targetUser.verificationStatus;
    targetUser.verificationStatus = status;
    targetUser.verificationNote = note || '';
    targetUser.verificationReviewedBy = req.user.userId;
    targetUser.verificationReviewedAt = new Date();
    await targetUser.save();

    logEvent('VERIFICATION_STATUS_CHANGED', {
      adminId: req.user.userId,
      targetUserId: targetUser._id,
      targetRole: targetUser.role,
      previousStatus,
      newStatus: status,
      note: note || ''
    });

    res.json({
      message: `Verification status updated to ${status}`,
      user: {
        id: targetUser._id,
        name: targetUser.name,
        role: targetUser.role,
        verificationStatus: targetUser.verificationStatus
      }
    });
  } catch (error) {
    console.error('Verification status update error:', error);
    res.status(500).json({ error: 'Failed to update verification status' });
  }
});

// Secure endpoint for admin to view verification documents
router.get('/verifications/:userId/documents/:filename', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId, filename } = req.params;
    
    // Sanitize filename
    const sanitizedFilename = path.basename(filename);
    if (sanitizedFilename !== filename || filename.includes('..')) {
      return res.status(400).json({ error: 'Invalid document identifier' });
    }

    // Verify the document belongs to the user
    const doc = await VerificationDocument.findOne({ userId, filename: sanitizedFilename });
    if (!doc) {
      return res.status(404).json({ error: 'Verification document not found' });
    }

    const filePath = path.join(__dirname, '../../uploads/verification', sanitizedFilename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Document file not found on server' });
    }

    logEvent('VERIFICATION_DOCUMENT_VIEWED', {
      adminId: req.user.userId,
      targetUserId: userId,
      filename: sanitizedFilename
    });

    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${doc.originalName}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error serving verification document:', error);
    res.status(500).json({ error: 'Failed to retrieve verification document' });
  }
});

module.exports = router;
