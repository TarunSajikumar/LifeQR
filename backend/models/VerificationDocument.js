const mongoose = require("mongoose");

const verificationDocumentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  documentType: {
    type: String,
    required: true,
    enum: ['medical_license', 'degree_certificate', 'crew_id', 'organization_letter', 'other']
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

verificationDocumentSchema.index({ userId: 1 });

module.exports = mongoose.model("VerificationDocument", verificationDocumentSchema);
