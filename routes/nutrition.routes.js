const express = require('express');
const router = express.Router();
const NutritionController = require('../controllers/nutrition.controller');
const auth = require('../middleware/auth');

// Public or Protected routes? Foods can be public or protected. Let's make them protected to be safe.
// Food routes
router.get('/foods', auth, NutritionController.searchFoods);
router.get('/foods/:id', auth, NutritionController.getFoodById);

// Meal Logging routes
router.post('/meals', auth, NutritionController.logMeal);
router.delete('/meals/:id', auth, NutritionController.deleteMealLog);

// Daily Summary routes
router.get('/summary/:date', auth, NutritionController.getDailySummary);
router.put('/goals', auth, NutritionController.updateGoals);

module.exports = router;
