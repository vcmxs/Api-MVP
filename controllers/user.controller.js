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
            `SELECT u.id, u.name, u.email, u.gym, u.role, ct.assigned_at, 
                    ct.subscription_status as coach_subscription_status, 
                    ct.subscription_end_date as coach_subscription_end_date
       FROM users u
       INNER JOIN coach_trainee ct ON u.id = ct.trainee_id
       WHERE ct.coach_id = $1
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

        if (trainee.role !== 'trainee' && trainee.role !== 'coach') {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'User must be a trainee or a coach to be assigned.'
            });
        }

        // [PEER COACHING LOGIC] If the person being assigned is ALSO a coach...
        if (trainee.role === 'coach') {
            // Check their limit as well (Peer Coaching consumes a slot on BOTH sides)
            // They are taking up 1 slot of their own business to be trained
            const traineeCoachProfile = await pool.query(
                'SELECT subscription_status, subscription_tier FROM users WHERE id = $1',
                [trainee.id]
            );

            const pTier = traineeCoachProfile.rows[0]?.subscription_tier || 'starter';
            const pMaxTrainees = getTraineeLimit(pTier);

            const pCurrentTraineeCountResult = await pool.query(
                'SELECT COUNT(*) FROM coach_trainee WHERE coach_id = $1',
                [trainee.id]
            );
            const pCurrentCount = parseInt(pCurrentTraineeCountResult.rows[0].count);

            if (pCurrentCount >= pMaxTrainees) {
                const tierInfo = getTierInfo(pTier);
                return res.status(403).json({
                    error: 'Limit Reached',
                    message: `The coach you are trying to add has reached their trainee limit (${pMaxTrainees}) on their ${tierInfo?.name || pTier} plan, so they cannot allocate a slot to be trained right now.`
                });
            }
        }

        // Check if trainee is already assigned to ANY coach (this coach OR another coach)
        // For peer coaches, we might allow multiple coaches in the future, but standardizing to 1 active assigned coach for now.
        const existingResult = await pool.query(
            'SELECT id FROM coach_trainee WHERE trainee_id = $1',
            [trainee.id]
        );

        if (existingResult.rows.length > 0) {
            return res.status(409).json({
                error: 'Conflict',
                message: 'This user is already assigned to a coach. They must leave their current coach before you can add them.'
            });
        }

        // Assign trainee to coach
        await pool.query(
            'INSERT INTO coach_trainee (coach_id, trainee_id) VALUES ($1, $2)',
            [coachId, trainee.id]
        );

        // Auto-friend logic: Create 'accepted' friendship
        // Standardize IDs: internal logic usually puts smaller ID first for the unique constraint
        const u1 = Math.min(coachId, trainee.id);
        const u2 = Math.max(coachId, trainee.id);

        try {
            await pool.query(
                `INSERT INTO friendships (user_id_1, user_id_2, status, action_user_id) 
                 VALUES ($1, $2, 'accepted', $3)
                 ON CONFLICT (user_id_1, user_id_2) 
                 DO UPDATE SET status = 'accepted', action_user_id = $3`,
                [u1, u2, coachId]
            );
            console.log(`Auto-fiended Coach ${coachId} and Trainee ${trainee.id}`);
        } catch (friendErr) {
            console.error('Auto-friend error (ignoring to prevent failure of main task):', friendErr);
            // We don't fail the request if this fails, as it's a secondary feature
        }

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
            let coachQuery = `
                SELECT u.id as coach_id, u.name as coach_name, 
                       ct.subscription_status, ct.subscription_end_date, ct.subscription_start_date
                FROM users u 
                INNER JOIN coach_trainee ct ON u.id = ct.coach_id 
                WHERE ct.trainee_id = $1
            `;
            const queryParams = [req.params.userId];

            // DEBUG LOGS
            console.log('getUserProfile - Trainee detected:', user.email);
            console.log('Requester:', req.user ? `${req.user.role} (${req.user.id})` : 'Unauthenticated/No User');

            // If requester is a coach, prioritize THEIR relationship
            // We use optional chaining in case req.user is not set (e.g. public route - though this is protected)
            if (req.user && req.user.role === 'coach') {
                coachQuery += ` AND ct.coach_id = $2`;
                queryParams.push(req.user.id);
                console.log('Filtering by requesting coach ID:', req.user.id);
            } else {
                // Otherwise show latest (for trainee viewing self)
                coachQuery += ` ORDER BY ct.subscription_end_date DESC LIMIT 1`;
                console.log('Showing latest subscription (Trainee View or Other)');
            }

            const coachResult = await pool.query(coachQuery, queryParams);

            console.log('Coach Result Rows:', coachResult.rows.length);
            if (coachResult.rows.length > 0) {
                console.log('Found Status:', coachResult.rows[0].subscription_status);
                user.assigned_coach = coachResult.rows[0].coach_name;
                user.coach_id = coachResult.rows[0].coach_id;
                user.coach_subscription_status = coachResult.rows[0].subscription_status;
                user.coach_subscription_end_date = coachResult.rows[0].subscription_end_date;
                user.subscription_start_date = coachResult.rows[0].subscription_start_date; // Override default
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
    const { name, age, sex, phone, gym, notes, height, weight, username } = req.body;

    // Validate username format
    if (username) {
        const codeRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!codeRegex.test(username)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Username must be 3-20 characters long and can only contain letters, numbers, and underscores.'
            });
        }
    }

    try {
        // [MODIFIED] Pass callback or handle inside User model? 
        // We can just add the logging logic here in controller for simplicity if User.updateProfile doesn't support it directly without modification
        // But better to keep business logic encapsulated or just do it here as a side effect.

        // Let's do it here:
        const user = await User.updateProfile(userId, { name, age, sex, phone, gym, notes, height, weight, username });

        if (!user) {
            return res.status(404).json({ error: 'Not Found', message: 'User not found' });
        }

        // [NEW] Log weight if provided AND changed
        if (weight) {
            // Check previous weight to avoid duplicate lots (flatlining the chart)
            // We can check the 'user' object returned above (which is the UPDATED one), 
            // BUT we need the OLD one. 
            // Actually, we can just check the last log in history.
            const lastLog = await pool.query('SELECT weight FROM weight_logs WHERE user_id = $1 ORDER BY logged_at DESC LIMIT 1', [userId]);

            let shouldLog = true;
            if (lastLog.rows.length > 0) {
                const lastWeight = parseFloat(lastLog.rows[0].weight);
                if (Math.abs(lastWeight - parseFloat(weight)) < 0.01) { // Float comparison
                    shouldLog = false;
                }
            }

            if (shouldLog) {
                await pool.query('INSERT INTO weight_logs (user_id, weight) VALUES ($1, $2)', [userId, weight]);
            }
        }

        res.json(user);
    } catch (err) {
        console.error('Update profile error:', err);
        if (err.message === 'Username already taken') {
            return res.status(409).json({ error: 'Conflict', message: 'This username is already taken. Please choose another one.' });
        }
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

    console.log('Update Subscription Request Body:', req.body); // DEBUG LOG

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

        console.log('Calculating Dates:', {
            inputStart: startDate,
            parsedStart: start,
            durationId,
            calculatedEnd: endDate
        }); // DEBUG LOG

        // 3. Update connection table (coach_trainee)
        await client.query(
            `UPDATE coach_trainee 
             SET subscription_status = 'active', 
                 subscription_start_date = $1,
                 subscription_end_date = $2
             WHERE coach_id = $3 AND trainee_id = $4`,
            [start, endDate, coachId, traineeId]
        );

        // 4. Log Payment History
        await client.query(
            `INSERT INTO coach_payments (coach_id, trainee_id, amount, duration_id, start_date, end_date) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [coachId, traineeId, amount || 0, durationId, start, endDate]
        );

        await client.query('COMMIT'); // Commit Transaction

        if (req.io) {
            req.io.to(`user_${traineeId}`).emit('subscription_updated', {
                status: 'active',
                subscription_end_date: endDate
            });
            console.log(`Emitted subscription_updated to user_${traineeId}`);
        }

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


/**
 * Get weight history
 */
exports.getWeightHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        // Verify access (self or coach) - simpler for now:
        if (req.user.id !== parseInt(userId) && req.user.role !== 'coach' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const result = await pool.query(
            'SELECT weight, logged_at FROM weight_logs WHERE user_id = $1 ORDER BY logged_at ASC',
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Get weight history error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};
