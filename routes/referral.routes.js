const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referral.controller');
const { authenticateToken } = require('../middleware/auth');

// All routes here should be protected
router.use(authenticateToken);

router.get('/stats', referralController.getStats);
router.get('/admin/stats', referralController.getAdminStats);
router.get('/admin/earnings', referralController.getAdminEarnings);
router.patch('/admin/earnings/:id/status', referralController.updateEarningStatus);
router.post('/admin/payouts/user/:userId', referralController.markAllUserEarningsPaid);

module.exports = router;
