const express = require('express');
const router = express.Router();
const plansController = require('../controllers/training_plans.controller');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all plan routes
router.use(authMiddleware);

// Routes
router.get('/users/:userId', plansController.getPlans);
router.post('/', plansController.createPlan);
router.put('/:id', plansController.updatePlan);
router.delete('/:id', plansController.deletePlan);

module.exports = router;
