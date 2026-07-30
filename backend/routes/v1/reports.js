const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const PatientProfile = require('../../models/PatientProfile');
const User = require('../../models/User');
const { authenticateToken } = require('../../middleware/auth');
const { logEvent } = require('../../services/securityLogger');

const router = express.Router();

const reportsDir = path.join(__dirname, '../../uploads/reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// Multer storage configuration for medical reports
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, reportsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.user.userId}_report_${Date.now()}${ext}`);
  }
});

const uploadReport = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only PDF, JPEG, JPG, and PNG files are allowed.'), false);
    }
    cb(null, true);
  }
});

// Upload report
router.post('/upload', authenticateToken, (req, res) => {
  uploadReport.single('report')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Please select a report file to upload' });
    }

    try {
      if (req.user.role !== 'patient') {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ error: 'Only patient accounts can upload medical reports' });
      }

      const profile = await PatientProfile.findOne({ userId: req.user.userId });
      if (!profile) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Patient profile not found' });
      }

      const { category, description } = req.body;
      const report = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        url: `/api/v1/reports/${req.file.filename}`,
        category: category || 'General',
        description: description || '',
        uploadedAt: new Date()
      };

      profile.reports.unshift(report);
      profile.activities.unshift({
        type: 'Report Uploaded',
        title: `Uploaded ${req.file.originalname}`,
        description: report.description || `Uploaded medical report: ${req.file.originalname}`,
        metadata: { reportId: req.file.filename, category: report.category },
        timestamp: new Date()
      });

      await profile.save();

      logEvent('REPORT_UPLOADED', { userId: req.user.userId, filename: req.file.filename });

      res.json({ message: 'Report uploaded successfully', report });
    } catch (error) {
      console.error('Report upload database error:', error);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: 'Failed to upload report' });
    }
  });
});

// Retrieve paginated reports
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const profile = await PatientProfile.findOne({ userId: req.user.userId });
    if (!profile) {
      return res.status(404).json({ error: 'Patient profile not found' });
    }

    // Pagination
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '5');
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const reportsList = profile.reports || [];
    const paginatedReports = reportsList.slice(startIndex, endIndex);

    res.json({
      reports: paginatedReports,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(reportsList.length / limit),
        totalItems: reportsList.length,
        hasNextPage: endIndex < reportsList.length,
        hasPrevPage: startIndex > 0
      }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports list' });
  }
});

/**
 * Secure medical report streaming endpoint.
 * 
 * Pipeline:
 * 1. Cookie authentication
 * 2. Role check (patient for own report, authorized doctor)
 * 3. Patient authorization check for doctors
 * 4. Audit log
 * 5. Stream file with correct Content-Type
 * 
 * Medical reports are NEVER served via static file serving.
 */
router.get('/:reportId', authenticateToken, async (req, res) => {
  try {
    const { reportId } = req.params;
    
    // Sanitize reportId to prevent path traversal attacks
    const sanitizedReportId = path.basename(reportId);
    if (sanitizedReportId !== reportId || reportId.includes('..')) {
      return res.status(400).json({ error: 'Invalid report identifier' });
    }

    // Find which patient this report belongs to
    const profile = await PatientProfile.findOne({
      'reports.filename': sanitizedReportId
    });

    if (!profile) {
      return res.status(404).json({ error: 'Medical report not found' });
    }

    const report = profile.reports.find(r => r.filename === sanitizedReportId);
    if (!report) {
      return res.status(404).json({ error: 'Medical report not found' });
    }

    // Authorization check
    const isOwner = String(profile.userId) === String(req.user.userId);
    const isAuthorizedDoctor = req.user.role === 'doctor' && profile.authorizedDoctors.some(
      doc => String(doc.doctorId) === String(req.user.userId)
    );
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAuthorizedDoctor && !isAdmin) {
      logEvent('REPORT_ACCESS_DENIED', {
        userId: req.user.userId,
        role: req.user.role,
        reportId: sanitizedReportId,
        patientId: profile.userId
      });
      return res.status(403).json({ error: 'You are not authorized to view this medical report' });
    }

    // Verify file exists on disk
    const filePath = path.join(reportsDir, sanitizedReportId);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Report file not found on server' });
    }

    // Audit log the access
    logEvent('REPORT_ACCESSED', {
      userId: req.user.userId,
      role: req.user.role,
      reportId: sanitizedReportId,
      patientId: profile.userId,
      originalName: report.originalName
    });

    // Stream the file with correct content type
    res.setHeader('Content-Type', report.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${report.originalName}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error streaming medical report:', error);
    res.status(500).json({ error: 'Failed to retrieve medical report' });
  }
});

module.exports = router;
