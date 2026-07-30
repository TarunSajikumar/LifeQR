const mongoose = require('mongoose');

const emergencyCredentialSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PatientProfile',
    required: true,
    index: true
  },
  credentialType: {
    type: String,
    enum: ['QR', 'NFC_CARD', 'NFC_WRISTBAND', 'NFC_TAG'],
    default: 'QR'
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  tokenPrefix: {
    type: String,
    default: 'EMG'
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'REVOKED', 'EXPIRED', 'LOST'],
    default: 'ACTIVE'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: Date,
  lastUsedAt: Date,
  revokedAt: Date,
  revokedReason: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('EmergencyCredential', emergencyCredentialSchema);
