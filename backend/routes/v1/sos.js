const express = require('express');
const User = require('../../models/User');
const PatientProfile = require('../../models/PatientProfile');
const { authenticateToken } = require('../../middleware/auth');
const { logEvent } = require('../../services/securityLogger');
const { sendEmail } = require('../../services/emailService');

const router = express.Router();

// Trigger SOS
router.post('/sos', authenticateToken, async (req, res) => {
  try {
    const { lat, lng, message } = req.body;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'Latitude and longitude coordinates are required' });
    }

    if (req.user.role !== 'patient') {
      return res.status(403).json({ error: 'Only patient users can trigger an SOS' });
    }

    const patient = await User.findById(req.user.userId);
    const profile = await PatientProfile.findOne({ userId: req.user.userId });
    if (!profile || !patient) {
      return res.status(404).json({ error: 'Patient profile not found' });
    }

    const emailList = profile.emergencyContacts.map(c => c.phone).filter(Boolean);

    const sosAlert = {
      status: 'sent',
      location: { lat, lng },
      message: message || 'Emergency SOS Alert triggered!',
      sentTo: emailList,
      createdAt: new Date()
    };

    profile.sosAlerts.unshift(sosAlert);
    profile.activities.unshift({
      type: 'SOS Triggered',
      title: 'SOS Emergency Broadcasted',
      description: sosAlert.message,
      metadata: { location: sosAlert.location },
      timestamp: new Date()
    });
    
    await profile.save();

    // Broadcast SOS event to verified crew members only
    const io = req.app.get('io');
    if (io) {
      io.to('crew:all').emit('sos-alert', {
        sosId: profile.sosAlerts[0]._id,
        patientId: patient._id,
        name: patient.name,
        age: profile.age,
        bloodGroup: profile.bloodGroup,
        allergies: profile.allergies,
        medications: profile.medications,
        location: { lat, lng },
        message: sosAlert.message,
        emergencyContacts: profile.emergencyContacts,
        timestamp: new Date()
      });
      console.log('📶 Real-time SOS alert sent to crew room via Socket.IO');
    }

    // Trigger emails to emergency contacts
    profile.emergencyContacts.forEach(contact => {
      // If contact has email details (for simplicity we check phone or assume mock notification flow)
      // Here we simulate alert dispatch using their phone or email if stored.
      // Let's print out notification in logs and email patient + family
      sendEmail({
        to: patient.email, // Notify the patient's own registered email as confirmation
        subject: '🚨 EMERGENCY ALERT: LifeQR SOS Triggered',
        text: `Hello,\n\nAn SOS alert was triggered for ${patient.name}. \nLocation: Latitude ${lat}, Longitude ${lng}.\nMessage: ${sosAlert.message}\nEmergency responders have been notified.`,
        html: `<p>🚨 <strong>EMERGENCY ALERT: LifeQR SOS Triggered</strong></p><p>An SOS alert was triggered for patient <strong>${patient.name}</strong>.</p><p>Location coordinates: <a href="https://maps.google.com/?q=${lat},${lng}">${lat}, ${lng}</a></p><p>Message: ${sosAlert.message}</p>`
      }).catch(err => console.error('Failed to send SOS notification:', err));
    });

    logEvent('SOS_TRIGGERED', { userId: patient._id, location: { lat, lng } });

    res.json({ message: 'SOS alert broadcasted successfully', sosAlert: profile.sosAlerts[0] });
  } catch (error) {
    console.error('Error triggering SOS:', error);
    res.status(500).json({ error: 'Failed to trigger emergency SOS alert' });
  }
});

// Acknowledge SOS alert (by Crew/Doctor)
router.post('/acknowledge/:qrCodeId/:sosId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'crew' && req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only ambulance crew or medical staff can acknowledge SOS alerts' });
    }

    const { qrCodeId, sosId } = req.params;
    const profile = await PatientProfile.findOne({ qrCodeId });
    if (!profile) {
      return res.status(404).json({ error: 'Patient profile not found' });
    }

    const alert = profile.sosAlerts.id(sosId);
    if (!alert) {
      return res.status(404).json({ error: 'SOS alert event not found' });
    }

    const responder = await User.findById(req.user.userId).select('name role');

    alert.status = 'acknowledged';
    alert.acknowledgedBy = {
      userId: req.user.userId,
      name: responder.name,
      timestamp: new Date()
    };

    profile.activities.unshift({
      type: 'SOS Acknowledged',
      title: 'SOS Acknowledged',
      description: `SOS alert was acknowledged by ${responder.name} (${responder.role}).`,
      timestamp: new Date()
    });

    await profile.save();

    // Emit targeted socket events to specific rooms
    const io = req.app.get('io');
    if (io) {
      // Notify the patient that their SOS was acknowledged
      io.to(`patient:${profile.userId}`).emit('sos-acknowledged', {
        sosId,
        responderName: responder.name,
        responderRole: responder.role
      });
      // Notify other crew members about the acknowledgement
      io.to('crew:all').emit('sos-acknowledged', {
        sosId,
        responderName: responder.name,
        responderRole: responder.role
      });
    }

    logEvent('SOS_ACKNOWLEDGED', { sosId, responderId: req.user.userId });

    res.json({ message: 'SOS alert acknowledged successfully', alert });
  } catch (error) {
    console.error('Error acknowledging SOS alert:', error);
    res.status(500).json({ error: 'Failed to acknowledge SOS alert' });
  }
});

module.exports = router;
