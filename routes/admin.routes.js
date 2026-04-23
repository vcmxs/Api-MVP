// routes/admin.routes.js
const express = require('express');
const adminController = require('../controllers/admin.controller');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require admin role
router.get('/users', requireAdmin, adminController.getAllUsers);
router.get('/users/:userId/details', requireAdmin, adminController.getUserDetails);
router.patch('/users/:userId/role', requireAdmin, adminController.updateUserRole);
router.patch('/users/:userId/subscription', requireAdmin, adminController.updateSubscription);
router.patch('/users/:userId/block', requireAdmin, adminController.blockUser);
router.delete('/users/:userId', requireAdmin, adminController.deleteUser);
router.get('/subscription/tiers', requireAdmin, adminController.getSubscriptionTiers);
router.get('/stats', requireAdmin, adminController.getStats);
router.get('/finance', requireAdmin, adminController.getFinance);
router.get('/referrals', requireAdmin, adminController.getReferrals);
router.patch('/referrals/:earningId/pay', requireAdmin, adminController.payReferral);

module.exports = router;


