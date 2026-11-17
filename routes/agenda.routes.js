// routes/agenda.routes.js
const express = require('express');
const agendaController = require('../controllers/agenda.controller');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Mounted at /agenda. The agenda is always scoped to the signed-in user by the
// controller, so no plan id (and no ownership middleware) is involved here.
router.get('/today', authenticateToken, agendaController.getTodayAgenda);

module.exports = router;
