// controllers/user.controller.js
const User = require('../models/User');
const pool = require('../config/database');
const { getTraineeLimit, getTierInfo } = require('../config/subscriptionTiers');

/**
 * Get user details
 */
exports.getUserById = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, email, role, subscription_status, subscription_tier FROM users WHERE id = $1',
            [req.params.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Not Found', message: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Get user error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Get coach's trainees
 */
exports.getCoachTrainees = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.name, u.email, ct.assigned_at
       FROM users u
       INNER JOIN coach_trainee ct ON u.id = ct.trainee_id
       WHERE ct.coach_id = $1 AND u.role = 'trainee'
       ORDER BY u.name`,
            [req.params.coachId]
        );

        res.json({ trainees: result.rows });
    } catch (err) {
        console.error('Get trainees error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Assign trainee to coach
 */
exports.assignTrainee = async (req, res) => {
    const { coachId } = req.params;
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'Email is required'
        });
    }

    try {
        // 1. Check Coach's Subscription Limit
        const coachProfile = await pool.query(
            'SELECT subscription_status, subscription_tier FROM users WHERE id = $1',
            [coachId]
        );

        if (coachProfile.rows.length === 0) {
            return res.status(404).json({ error: 'Not Found', message: 'Coach not found' });
        }

        const { subscription_status, subscription_tier } = coachProfile.rows[0];

        // Only enforce limits if subscription is 'active' (or we can enforce for all, assuming free is restricted)
        // Default to 'starter' if no tier set
        const currentTier = subscription_tier || 'starter';
        const maxTrainees = getTraineeLimit(currentTier);

        const currentTraineeCountResult = await pool.query(
            'SELECT COUNT(*) FROM coach_trainee WHERE coach_id = $1',
            [coachId]
        );
        const currentCount = parseInt(currentTraineeCountResult.rows[0].count);

        if (currentCount >= maxTrainees) {
            const tierInfo = getTierInfo(currentTier);
            return res.status(403).json({
                error: 'Limit Reached',
                message: `Your ${tierInfo?.name || currentTier} plan is limited to ${maxTrainees} trainee${maxTrainees > 1 ? 's' : ''}. Upgrade your subscription to add more.`,
                currentCount,
                maxAllowed: maxTrainees,
                tier: currentTier
            });
        }
        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.status(404).json({ error: 'Not Found', message: 'User not found' });
        }

        // If user is a trainee, fetch assigned coach
        if (user.role === 'trainee') {
            const coachResult = await pool.query(
                `SELECT u.name as coach_name 
                 FROM users u 
                 INNER JOIN coach_trainee ct ON u.id = ct.coach_id 
                 WHERE ct.trainee_id = $1`,
                [req.params.userId]
            );

            if (coachResult.rows.length > 0) {
                user.assigned_coach = coachResult.rows[0].coach_name;
            }
        }

        res.json(user);
    } catch (err) {
        console.error('Get profile error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Update user profile
 */
exports.updateUserProfile = async (req, res) => {
    const { userId } = req.params;
    const { name, age, sex, phone, gym, notes } = req.body;

    try {
        const user = await User.updateProfile(userId, { name, age, sex, phone, gym, notes });

        if (!user) {
            return res.status(404).json({ error: 'Not Found', message: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Update profile picture
 */
exports.updateProfilePicture = async (req, res) => {
    const { userId } = req.params;

    // Check if file was uploaded
    if (!req.file) {
        return res.status(400).json({ error: 'Bad Request', message: 'No image file uploaded' });
    }

    try {
        // Create the URL path for the uploaded file
        const profilePicUrl = `/uploads/profile-pics/${req.file.filename}`;

        const user = await User.updateProfilePicture(userId, profilePicUrl);

        if (!user) {
            return res.status(404).json({ error: 'Not Found', message: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        console.error('Update profile picture error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};


/**
 * Remove coach-trainee connection
 */
exports.removeConnection = async (req, res) => {
    const { userId, targetId } = req.params; // Get both from params now

    console.log('Remove Connection Request (Params):', { userId, targetId });

    try {
        // We need to know who is who.
        // If userId is coach, targetId is trainee.
        // If userId is trainee, targetId is coach (or implied if they only have one).

        // Perform deletion matching either combination
        const result = await pool.query(
            `DELETE FROM coach_trainee 
             WHERE (coach_id = $1 AND trainee_id = $2) 
                OR (coach_id = $2 AND trainee_id = $1)
             RETURNING id`,
            [userId, targetId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Not Found', message: 'Connection not found' });
        }

        res.json({ message: 'Connection removed successfully' });
    } catch (err) {
        console.error('Remove connection error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};
