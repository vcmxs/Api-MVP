// routes/auth.routes.js
const express = require('express');
const authController = require('../controllers/auth.controller');
const upload = require('../config/upload');

const router = express.Router();

// POST /api/v1/auth/register - with optional profile picture upload
router.post('/register', upload.single('profilePic'), authController.register);

// POST /api/v1/auth/login
router.post('/login', authController.login);

module.exports = router;
