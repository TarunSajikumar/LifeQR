const mongoose = require("mongoose");

const doctorProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  specialization: {
    type: String,
    required: true
  },
  licenseNumber: {
    type: String,
    required: true
  },
  hospital: {
    type: String,
    required: true
  },
  registrationCouncil: {
    type: String,
    default: ''
  },
  registrationYear: {
    type: Number
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("DoctorProfile", doctorProfileSchema);
