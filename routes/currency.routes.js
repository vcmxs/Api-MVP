const express = require('express');
const router = express.Router();
const currencyController = require('../controllers/currency.controller');

// Public route to get current BCV rate
router.get('/rate', currencyController.getUsdRate);

module.exports = router;
