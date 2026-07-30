const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true,
    enum: ['patient', 'doctor', 'crew', 'admin'],
    default: 'patient'
  },
  gender: {
    type: String,
    required: true,
    enum: ['male', 'female', 'other'],
    lowercase: true,
    trim: true
  },
  phone: String,
  address: String,
  city: String,
  state: String,
  profilePhoto: {
    type: String,
    default: ''
  },
  verified: {
    type: Boolean,
    default: false
  },
  active: {
    type: Boolean,
    default: true
  },
  verificationStatus: {
    type: String,
    enum: ['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'SUSPENDED', 'REVOKED'],
    default: 'PENDING'
  },
  verificationNote: {
    type: String,
    default: ''
  },
  verificationReviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verificationReviewedAt: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, {
  timestamps: true
});

module.exports = mongoose.model("User", userSchema);
