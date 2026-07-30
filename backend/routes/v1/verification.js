const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const User = require('../../models/User');
const VerificationDocument = require('../../models/VerificationDocument');
const { authenticateToken } = require('../../middleware/auth');
const { logEvent } = require('../../services/securityLogger');

const router = express.Router();

// Verification documents directory (NOT publicly served)
const verificationDir = path.join(__dirname, '../../uploads/verification');
if (!fs.existsSync(verificationDir)) {
  fs.mkdirSync(verificationDir, { recursive: true });
}

// Multer storage for verification documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, verificationDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.user.userId}_verification_${Date.now()}${ext}`);
  }
});

const uploadVerification = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for documents
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only PDF, JPEG, JPG, and PNG files are allowed.'), false);
    }
    cb(null, true);
  }
});

// Upload verification document (doctor or crew)
router.post('/upload-document', authenticateToken, (req, res) => {
  if (req.user.role !== 'doctor' && req.user.role !== 'crew') {
    return res.status(403).json({ error: 'Only doctor and crew accounts require verification documents' });
  }

  uploadVerification.single('document')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Please select a document file to upload' });
    }

    try {
      const { documentType } = req.body;
      if (!documentType) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Document type is required (e.g., medical_license, crew_id)' });
      }

      const validTypes = ['medical_license', 'degree_certificate', 'crew_id', 'organization_letter', 'other'];
      if (!validTypes.includes(documentType)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: `Invalid document type. Must be one of: ${validTypes.join(', ')}` });
      }

      // Create verification document record
      await VerificationDocument.create({
        userId: req.user.userId,
        documentType,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        uploadedAt: new Date()
      });

      // Update user verification status to UNDER_REVIEW
      const user = await User.findById(req.user.userId);
      if (user && (user.verificationStatus === 'PENDING' || user.verificationStatus === 'REVOKED')) {
        user.verificationStatus = 'UNDER_REVIEW';
        await user.save();
      }

      logEvent('VERIFICATION_DOCUMENT_UPLOADED', {
        userId: req.user.userId,
        documentType,
        filename: req.file.filename
      });

      res.json({
        message: 'Verification document uploaded successfully. Your account is now under review.',
        verificationStatus: 'UNDER_REVIEW'
      });
    } catch (error) {
      console.error('Verification document upload error:', error);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: 'Failed to upload verification document' });
    }
  });
});

// Check own verification status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor' && req.user.role !== 'crew') {
      return res.status(403).json({ error: 'Verification status is only applicable for doctor and crew accounts' });
    }

    const user = await User.findById(req.user.userId).select('verificationStatus verificationNote verificationReviewedAt');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const documents = await VerificationDocument.find({ userId: req.user.userId })
      .select('documentType originalName uploadedAt')
      .sort({ uploadedAt: -1 });

    res.json({
      verificationStatus: user.verificationStatus,
      verificationNote: user.verificationNote || null,
      reviewedAt: user.verificationReviewedAt || null,
      documents: documents.map(doc => ({
        type: doc.documentType,
        name: doc.originalName,
        uploadedAt: doc.uploadedAt
      }))
    });
  } catch (error) {
    console.error('Verification status check error:', error);
    res.status(500).json({ error: 'Failed to check verification status' });
  }
});

module.exports = router;
