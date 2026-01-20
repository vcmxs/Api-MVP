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
            `SELECT u.id, u.name, u.email, u.gym, ct.assigned_at
       FROM users u
       INNER JOIN coach_trainee ct ON u.id = ct.trainee_id
       WHERE ct.coach_id = $1 AND u.role = 'trainee'
       ORDER BY ct.assigned_at ASC`,
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

        // 2. Find trainee by email
        const trainee = await User.findByEmail(email);

        if (!trainee) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'No user found with that email'
            });
        }

        if (trainee.role !== 'trainee') {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'User is not a trainee'
            });
        }

        // Check if trainee is already assigned to ANY coach
        const existingResult = await pool.query(
            'SELECT id FROM coach_trainee WHERE trainee_id = $1',
            [trainee.id]
        );

        if (existingResult.rows.length > 0) {
            return res.status(409).json({
                error: 'Conflict',
                message: 'This trainee is already assigned to a coach. They must leave their current coach before you can add them.'
            });
        }

        // Assign trainee to coach
        await pool.query(
            'INSERT INTO coach_trainee (coach_id, trainee_id) VALUES ($1, $2)',
            [coachId, trainee.id]
        );

        res.status(201).json({
            id: trainee.id,
            name: trainee.name,
            email: trainee.email
        });
    } catch (err) {
        console.error('Assign trainee error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Get user profile
 */
exports.getUserProfile = async (req, res) => {
    try {
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
    const { name, age, sex, phone, gym, notes, height, weight } = req.body;
    console.log('Update Profile Req Body:', req.body);
    console.log('Update Profile Params:', { userId, height, weight });

    try {
        const user = await User.updateProfile(userId, { name, age, sex, phone, gym, notes, height, weight });

        if (!user) {
            return res.status(404).json({ error: 'Not Found', message: 'User not found' });
        }

        // DEBUG: Return received values to prove controller version
        res.json({ ...user, _debug_received: { height, weight }, _debug_version: '1.2' });
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

/**
 * Delete own account (authenticated user)
 */
exports.deleteOwnAccount = async (req, res) => {
    const { userId } = req.params;

    try {
        // Security: Verify user is deleting their own account
        if (req.user.id !== parseInt(userId)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You can only delete your own account'
            });
        }

        // Check if user exists
        const userCheck = await pool.query('SELECT id, name FROM users WHERE id = $1', [userId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Not Found', message: 'User not found' });
        }

        // Delete user (cascade will handle related data: workouts, logs, coach_trainee)
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);

        res.json({ message: 'Account deleted successfully' });
    } catch (err) {
        console.error('Delete own account error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};
