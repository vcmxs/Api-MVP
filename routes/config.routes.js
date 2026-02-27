const express = require('express');
const router = express.Router();

/**
 * @route   GET /api/v1/config/app-version
 * @desc    Get the latest mobile app version requirements
 * @access  Public (No Auth Required)
 */
router.get('/app-version', (req, res) => {
    try {
        // In a future update, these values could come from a database table (e.g. `app_config`)
        // or environment variables. Hardcoded for speed right now per user agreement.

        const latestVersion = "1.1.0"; // Current version in stores
        const minimumVersion = "1.0.0"; // Versions older than this MUST update

        // The exact bundle ID of the App in the Google Play Store
        const playStoreUrl = "market://details?id=fit.dupla.app";
        // To do: Add App Store URL when deployed to iOS
        const appStoreUrl = "";

        res.json({
            status: 'success',
            data: {
                latestVersion,
                minimumVersion,
                isMandatory: false, // Could be mathematically calculated: isMandatory = clientVersion < minimumVersion
                storeUrls: {
                    android: playStoreUrl,
                    ios: appStoreUrl
                },
                releaseNotes: "New Co-op workouts and custom Daystreak parameters!"
            }
        });
    } catch (err) {
        console.error('App Version Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
