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
    enum: ['patient', 'doctor', 'crew'],
    default: 'patient'
  },
  
  // Patient-specific fields
  age: {
    type: Number,
    min: 0,
    max: 150
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', '']
  },
  healthIssues: String,
  allergies: String,
  medications: String,
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  qrCode: String,
  qrCodeId: String,
  lastLocation: {
    lat: Number,
    lng: Number,
    updatedAt: Date
  },
  publicProfile: {
    type: Boolean,
    default: true
  },
  reports: [
    {
      filename: String,
      originalName: String,
      mimeType: String,
      url: String,
      category: String,
      description: String,
      uploadedAt: Date
    }
  ],
  activities: [
    {
      type: String,
      title: String,
      description: String,
      metadata: mongoose.Schema.Types.Mixed,
      timestamp: Date
    }
  ],
  sosAlerts: [
    {
      status: {
        type: String,
        default: 'pending'
      },
      location: {
        lat: Number,
        lng: Number
      },
      message: String,
      sentTo: [String],
      createdAt: Date
    }
  ],
  authorizedDoctors: [
    {
      doctorId: mongoose.Schema.Types.ObjectId,
      name: String,
      email: String,
      grantedAt: Date
    }
  ],
  
  // Doctor-specific fields
  specialization: String,
  licenseNumber: String,
  hospital: String,
  
  // Crew-specific fields
  vehicleNumber: String,
  crewType: {
    type: String,
    enum: ['ambulance', 'fire', 'police', '']
  },
  station: String,
  
  // Common fields
  phone: String,
  address: String,
  city: String,
  state: String,
  verified: {
    type: Boolean,
    default: false
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries (email index already created by unique: true)
userSchema.index({ qrCodeId: 1 });

module.exports = mongoose.model("User", userSchema);
