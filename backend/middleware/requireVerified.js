const User = require("../models/User");

/**
 * Middleware that ensures the authenticated user has a VERIFIED verification status.
 * Used to gate sensitive medical access routes for doctors and crew members.
 * Patients are auto-verified and will always pass this check.
 */
const requireVerified = async (req, res, next) => {
  try {
    // Patients are always auto-verified, skip DB lookup for them
    if (req.user.role === 'patient' || req.user.role === 'admin') {
      return next();
    }

    const user = await User.findById(req.user.userId).select('verificationStatus');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.verificationStatus !== 'VERIFIED') {
      const statusMessages = {
        'PENDING': 'Your account is pending verification. Please upload your professional credentials and wait for admin approval.',
        'UNDER_REVIEW': 'Your account verification is currently under review by our admin team. Please check back later.',
        'SUSPENDED': 'Your account has been suspended. Please contact the administrator for more information.',
        'REVOKED': 'Your verification has been revoked. Please contact the administrator.'
      };

      return res.status(403).json({
        error: 'Account not verified',
        message: statusMessages[user.verificationStatus] || 'Your account requires verification before accessing this resource.',
        verificationStatus: user.verificationStatus
      });
    }

    next();
  } catch (error) {
    console.error('Verification check error:', error);
    res.status(500).json({ error: 'Failed to verify account status' });
  }
};

module.exports = { requireVerified };
