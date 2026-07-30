const express = require('express');
const mongoose = require('mongoose');
const PatientProfile = require('../../models/PatientProfile');
const DoctorProfile = require('../../models/DoctorProfile');
const User = require('../../models/User');
const { authenticateToken } = require('../../middleware/auth');
const { requireVerified } = require('../../middleware/requireVerified');
const { logEvent } = require('../../services/securityLogger');
const { sendEmail } = require('../../services/emailService');

const router = express.Router();

// Doctor requests access to patient's private profile
router.post('/request-access', authenticateToken, requireVerified, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only medical doctors can request patient profile access' });
    }

    const { qrCodeId } = req.body;
    if (!qrCodeId) {
      return res.status(400).json({ error: 'Patient QR Code ID is required' });
    }

    const patientProfile = await PatientProfile.findOne({ qrCodeId }).populate('userId', 'name email');
    if (!patientProfile) {
      return res.status(404).json({ error: 'Patient profile not found' });
    }

    const doctorUser = await User.findById(req.user.userId);
    const doctorProfile = await DoctorProfile.findOne({ userId: req.user.userId });
    if (!doctorProfile || !doctorUser) {
      return res.status(404).json({ error: 'Doctor profile not found' });
    }

    // Check if already authorized
    const alreadyAuthorized = patientProfile.authorizedDoctors.some(
      doc => String(doc.doctorId) === String(req.user.userId)
    );
    if (alreadyAuthorized) {
      return res.status(400).json({ error: 'You are already authorized to access this patient profile' });
    }

    // Check if there is already a pending request to prevent spam
    const hasPending = patientProfile.activities.some(
      act => act.type === 'Access Request' && 
             act.metadata && 
             String(act.metadata.doctorId) === String(req.user.userId) && 
             act.metadata.status === 'pending'
    );
    if (hasPending) {
      return res.status(400).json({ error: 'A pending access request already exists for this patient' });
    }

    // Create request ID
    const requestId = new mongoose.Types.ObjectId();

    // Push access request to patient activities
    patientProfile.activities.unshift({
      type: 'Access Request',
      title: 'Doctor Access Request',
      description: `Dr. ${doctorUser.name} (${doctorProfile.specialization}) requested access to your medical records.`,
      metadata: {
        requestId,
        doctorId: doctorUser._id,
        doctorName: doctorUser.name,
        specialization: doctorProfile.specialization,
        hospital: doctorProfile.hospital,
        status: 'pending'
      },
      timestamp: new Date()
    });

    await patientProfile.save();

    // Trigger email alert to patient
    const patientUser = patientProfile.userId;
    if (patientUser && patientUser.email) {
      sendEmail({
        to: patientUser.email,
        subject: 'LifeQR Access Request from Doctor',
        text: `Hello ${patientUser.name},\n\nDr. ${doctorUser.name} has requested access to view your private medical records and reports. Please log in to your dashboard to approve or reject this request.`,
        html: `<p>Hello ${patientUser.name},</p><p>Dr. <strong>${doctorUser.name}</strong> has requested access to view your private medical records and reports.</p><p>Please log in to your dashboard to approve or reject this request.</p>`
      }).catch(err => console.error('Failed to dispatch request alert email:', err));
    }

    logEvent('ACCESS_REQUESTED', { doctorId: doctorUser._id, patientId: patientUser._id });

    res.json({ message: 'Access request successfully sent to the patient' });
  } catch (error) {
    console.error('Doctor request access error:', error);
    res.status(500).json({ error: 'Failed to send access request' });
  }
});

// Patient gets pending access requests list
router.get('/requests', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const profile = await PatientProfile.findOne({ userId: req.user.userId });
    if (!profile) {
      return res.status(404).json({ error: 'Patient profile not found' });
    }

    // Filter activities list for pending access requests
    const pendingRequests = profile.activities.filter(
      act => act.type === 'Access Request' && act.metadata && act.metadata.status === 'pending'
    );

    res.json({ requests: pendingRequests });
  } catch (error) {
    console.error('Error fetching access requests:', error);
    res.status(500).json({ error: 'Failed to fetch access requests list' });
  }
});

// Patient responds to doctor request (Accept / Reject)
router.post('/respond', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { requestId, approve } = req.body;
    if (!requestId) {
      return res.status(400).json({ error: 'Request ID is required' });
    }

    const profile = await PatientProfile.findOne({ userId: req.user.userId });
    if (!profile) {
      return res.status(404).json({ error: 'Patient profile not found' });
    }

    // Find the specific activity entry
    const requestActivityIndex = profile.activities.findIndex(
      act => act.type === 'Access Request' && 
             act.metadata && 
             String(act.metadata.requestId) === String(requestId) &&
             act.metadata.status === 'pending'
    );

    if (requestActivityIndex === -1) {
      return res.status(404).json({ error: 'Pending access request not found' });
    }

    const doctorId = profile.activities[requestActivityIndex].metadata.doctorId;
    const doctorName = profile.activities[requestActivityIndex].metadata.doctorName;

    const doctorUser = await User.findById(doctorId);
    if (!doctorUser) {
      return res.status(404).json({ error: 'Requesting doctor not found' });
    }

    if (approve === true) {
      // Set status in activity metadata
      profile.activities[requestActivityIndex].metadata.status = 'approved';
      
      // Add doctor details to authorizedDoctors list
      profile.authorizedDoctors.push({
        doctorId,
        name: doctorName,
        email: doctorUser.email,
        grantedAt: new Date()
      });

      profile.activities.unshift({
        type: 'Access Approved',
        title: 'Doctor Access Authorized',
        description: `You authorized Dr. ${doctorName} to access your medical records.`,
        timestamp: new Date()
      });

      logEvent('ACCESS_APPROVED', { patientId: req.user.userId, doctorId });
    } else {
      profile.activities[requestActivityIndex].metadata.status = 'rejected';
      
      profile.activities.unshift({
        type: 'Access Rejected',
        title: 'Doctor Access Denied',
        description: `You declined Dr. ${doctorName}'s request for profile access.`,
        timestamp: new Date()
      });

      logEvent('ACCESS_REJECTED', { patientId: req.user.userId, doctorId });
    }

    // Mark Mongoose array index as modified
    profile.markModified('activities');
    await profile.save();

    res.json({ message: approve ? 'Access request approved' : 'Access request rejected' });
  } catch (error) {
    console.error('Error responding to access request:', error);
    res.status(500).json({ error: 'Failed to process access request response' });
  }
});

// Patient revokes doctor access
router.post('/revoke', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { doctorId } = req.body;
    if (!doctorId) {
      return res.status(400).json({ error: 'Doctor ID is required for revocation' });
    }

    const profile = await PatientProfile.findOne({ userId: req.user.userId });
    if (!profile) {
      return res.status(404).json({ error: 'Patient profile not found' });
    }

    // Filter out the doctor from authorizedDoctors list
    const doctorExists = profile.authorizedDoctors.some(
      doc => String(doc.doctorId) === String(doctorId)
    );
    if (!doctorExists) {
      return res.status(400).json({ error: 'Doctor is not currently authorized' });
    }

    const doctorObj = profile.authorizedDoctors.find(doc => String(doc.doctorId) === String(doctorId));

    profile.authorizedDoctors = profile.authorizedDoctors.filter(
      doc => String(doc.doctorId) !== String(doctorId)
    );

    profile.activities.unshift({
      type: 'Access Revoked',
      title: 'Doctor Access Revoked',
      description: `You revoked medical profile access from Dr. ${doctorObj.name}.`,
      timestamp: new Date()
    });

    await profile.save();

    logEvent('ACCESS_REVOKED', { patientId: req.user.userId, doctorId });

    res.json({ message: 'Doctor access revoked successfully' });
  } catch (error) {
    console.error('Revocation error:', error);
    res.status(500).json({ error: 'Failed to revoke doctor access privileges' });
  }
});

// Doctor checks connection with a specific patient
router.get('/status/:qrCodeId', authenticateToken, requireVerified, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Doctor access required' });
    }

    const { qrCodeId } = req.params;
    const profile = await PatientProfile.findOne({ qrCodeId }).populate('userId', 'name gender phone profilePhoto');
    if (!profile) {
      return res.status(404).json({ error: 'Patient profile not found' });
    }

    const isAuthorized = profile.authorizedDoctors.some(
      doc => String(doc.doctorId) === String(req.user.userId)
    );

    const hasPending = profile.activities.some(
      act => act.type === 'Access Request' && 
             act.metadata && 
             String(act.metadata.doctorId) === String(req.user.userId) && 
             act.metadata.status === 'pending'
    );

    res.json({
      name: profile.userId.name,
      gender: profile.userId.gender,
      phone: profile.userId.phone,
      profilePhoto: profile.userId.profilePhoto,
      isAuthorized,
      hasPending,
      publicProfile: profile.publicProfile
    });
  } catch (error) {
    console.error('Access status check failed:', error);
    res.status(500).json({ error: 'Failed to check patient access status' });
  }
});

// Doctor gets authorized patient list
router.get('/patients', authenticateToken, requireVerified, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Doctor access required' });
    }

    const patients = await PatientProfile.find({
      'authorizedDoctors.doctorId': req.user.userId
    }).populate('userId', 'name email phone profilePhoto');

    const result = patients.map(p => ({
      id: p.userId._id,
      name: p.userId.name,
      email: p.userId.email,
      phone: p.userId.phone,
      profilePhoto: p.userId.profilePhoto,
      qrCodeId: p.qrCodeId,
      bloodGroup: p.bloodGroup,
      age: p.age
    }));

    res.json({ patients: result });
  } catch (error) {
    console.error('Failed to get authorized patients list:', error);
    res.status(500).json({ error: 'Failed to retrieve patients list' });
  }
});

module.exports = router;
