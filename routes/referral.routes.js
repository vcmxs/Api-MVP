const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referral.controller');
const { authenticateToken } = require('../middleware/auth');

// All routes here should be protected
router.use(authenticateToken);

router.get('/stats', referralController.getStats);
router.get('/admin/stats', referralController.getAdminStats);

module.exports = router;
