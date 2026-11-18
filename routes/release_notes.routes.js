// routes/release_notes.routes.js
//
// Read side of the "What's new" notes for the dashboard Settings section.
// Authoring lives in routes/admin.routes.js (`/admin/release-notes`).
const express = require('express');
const router = express.Router();
const releaseNotesController = require('../controllers/release_notes.controller');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', releaseNotesController.listReleaseNotes);

module.exports = router;
