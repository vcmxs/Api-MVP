const express = require('express');
const router = express.Router();
const NutritionController = require('../controllers/nutrition.controller');
const { authenticateToken } = require('../middleware/auth');

// Public or Protected routes? Foods can be public or protected. Let's make them protected to be safe.
// Food routes
// Food routes
router.get('/foods', authenticateToken, NutritionController.searchFoods);
router.get('/foods/:id', authenticateToken, NutritionController.getFoodById);

// Meal Logging routes
router.post('/meals', authenticateToken, NutritionController.logMeal);
router.delete('/meals/:id', authenticateToken, NutritionController.deleteMealLog);

// Daily Summary routes
router.get('/summary/:date', authenticateToken, NutritionController.getDailySummary);
router.put('/goals', authenticateToken, NutritionController.updateGoals);

// Manual Seed Route (Temporary for deployment) - Public GET so you can run it from browser
router.get('/seed-force', NutritionController.forceSeed);

module.exports = router;
