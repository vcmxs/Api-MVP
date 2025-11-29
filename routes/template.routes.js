// routes/template.routes.js
const express = require('express');
const router = express.Router();
const templateController = require('../controllers/template.controller');
const { authenticateToken } = require('../middleware/auth');

// All template routes require authentication
router.use(authenticateToken);

// Create a new template
router.post('/', templateController.createTemplate);

// Get all templates for a user
router.get('/users/:userId', templateController.getUserTemplates);

// Delete a template
router.delete('/:templateId', templateController.deleteTemplate);

module.exports = router;
