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
            'SELECT id, name, email, role, subscription_status, subscription_tier, referral_code, referred_by, referral_discount_used FROM users WHERE id = $1',
            [req.params.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Not Found', message: 'User not found' });
        }

        const user = result.rows[0];

        // If trainee, fetch coach subscription status
        if (user.role === 'trainee') {
            const coachSubResult = await pool.query(
                `SELECT subscription_status, subscription_end_date, coach_id 
                 FROM coach_trainee 
                 WHERE trainee_id = $1 
                 ORDER BY subscription_end_date DESC 
                 LIMIT 1`,
                [user.id]
            );
            if (coachSubResult.rows.length > 0) {
                user.coach_subscription_status = coachSubResult.rows[0].subscription_status;
                user.coach_subscription_end_date = coachSubResult.rows[0].subscription_end_date;
                user.assigned_coach_id = coachSubResult.rows[0].coach_id;
            }
        }

        res.json(user);
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
            `SELECT u.id, u.name, u.email, u.gym, ct.assigned_at, 
                    ct.subscription_status as coach_subscription_status, 
                    ct.subscription_end_date as coach_subscription_end_date
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

        // If user is a trainee, fetch assigned coach AND subscription info
        if (user.role === 'trainee') {
            const coachResult = await pool.query(
                `SELECT u.id as coach_id, u.name as coach_name, 
                        ct.subscription_status, ct.subscription_end_date
                 FROM users u 
                 INNER JOIN coach_trainee ct ON u.id = ct.coach_id 
                 WHERE ct.trainee_id = $1
                 ORDER BY ct.subscription_end_date DESC
                 LIMIT 1`,
                [req.params.userId]
            );

            if (coachResult.rows.length > 0) {
                user.assigned_coach = coachResult.rows[0].coach_name;
                user.coach_id = coachResult.rows[0].coach_id;
                user.coach_subscription_status = coachResult.rows[0].subscription_status;
                user.coach_subscription_end_date = coachResult.rows[0].subscription_end_date;
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

    try {
        const user = await User.updateProfile(userId, { name, age, sex, phone, gym, notes, height, weight });

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
 * Update trainee subscription (Administrative - Coach)
 */
exports.updateTraineeSubscription = async (req, res) => {
    const { coachId, traineeId } = req.params;
    const { durationId, amount, startDate } = req.body;

    const client = await pool.connect(); // Get a client for transaction

    try {
        await client.query('BEGIN'); // Start Transaction

        // 1. Verify connection and get current subscription status
        const connectionCheck = await client.query(
            'SELECT id, subscription_end_date FROM coach_trainee WHERE coach_id = $1 AND trainee_id = $2',
            [coachId, traineeId]
        );

        if (connectionCheck.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Forbidden', message: 'You are not assigned to this trainee' });
        }

        // 2. Calculate new dates
        const now = new Date();
        let start = new Date();
        let endDate = new Date();

        if (startDate) {
            start = new Date(startDate);
            if (isNaN(start.getTime())) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Bad Request', message: 'Invalid Start Date' });
            }
            endDate = new Date(start);
        } else {
            // Default logic: Extend if active/future, else start now
            const currentEndStr = connectionCheck.rows[0].subscription_end_date;
            const currentEnd = currentEndStr ? new Date(currentEndStr) : null;

            if (currentEnd && currentEnd > now) {
                start = new Date(currentEnd); // Conceptually starts when the old one ends
                endDate = new Date(currentEnd);
            }
            // else start defaults to now()
        }

        if (durationId === '7days') {
            endDate.setDate(endDate.getDate() + 7);
        } else if (durationId === '15days') {
            endDate.setDate(endDate.getDate() + 15);
        } else if (durationId === '1month') {
            endDate.setMonth(endDate.getMonth() + 1);
        } else {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Bad Request', message: 'Invalid duration' });
        }

        // 3. Update connection table (coach_trainee)
        await client.query(
            `UPDATE coach_trainee 
             SET subscription_status = 'active', 
                 subscription_end_date = $1
             WHERE coach_id = $2 AND trainee_id = $3`,
            [endDate, coachId, traineeId]
        );

        // 4. Log Payment History
        // Explicitly removed start_date as it doesn't exist in schema
        await client.query(
            `INSERT INTO coach_payments (coach_id, trainee_id, amount, duration_id, end_date) 
             VALUES ($1, $2, $3, $4, $5)`,
            [coachId, traineeId, amount || 0, durationId, endDate]
        );

        await client.query('COMMIT'); // Commit Transaction

        res.json({
            message: 'Subscription updated successfully',
            subscription_end_date: endDate,
            status: 'active'
        });

    } catch (err) {
        await client.query('ROLLBACK'); // Rollback on error
        console.error('Update subscription error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    } finally {
        client.release(); // Release client back to pool
    }
};

/**
 * Get Coach-Trainee payment history
 */
exports.getCoachTraineeHistory = async (req, res) => {
    const { coachId, traineeId } = req.params;
    try {
        const result = await pool.query(
            `SELECT * FROM coach_payments 
             WHERE coach_id = $1 AND trainee_id = $2 
             ORDER BY payment_date DESC`,
            [coachId, traineeId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Get history error:', err);
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
