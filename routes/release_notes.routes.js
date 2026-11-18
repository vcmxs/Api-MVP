// routes/release_notes.routes.js
//
// Read side of the release notes (the standalone Novedades page).
//
// The notes are global announcements, so this list is public: it answers
// without a token and the page works for visitors who are not signed in.
// Authoring stays admin-only in routes/admin.routes.js (/admin/release-notes).
const express = require('express');
const router = express.Router();
const releaseNotesController = require('../controllers/release_notes.controller');

router.get('/', releaseNotesController.listReleaseNotes);

module.exports = router;
