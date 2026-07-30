const mongoose = require("mongoose");

const crewProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  vehicleNumber: {
    type: String,
    required: true
  },
  crewType: {
    type: String,
    enum: ['ambulance', 'fire', 'police', ''],
    required: true
  },
  station: {
    type: String,
    required: true
  },
  organization: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("CrewProfile", crewProfileSchema);
