// controllers/admin.controller.js
const pool = require('../config/database');
const { SUBSCRIPTION_TIERS, isValidTier, getTierInfo } = require('../config/subscriptionTiers');

/**
 * Get all users (Admin only)
 */
exports.getAllUsers = async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        id, name, email, role, 
        subscription_status, subscription_tier,
        subscription_start_date, subscription_end_date,
        status, created_at,
        referred_by, referral_discount_used
      FROM users 
      ORDER BY created_at DESC
    `);

        res.json({
            users: result.rows.map(user => ({
                id: user.id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
                subscriptionStatus: user.subscription_status,
                subscriptionTier: user.subscription_tier,
                subscriptionStartDate: user.subscription_start_date,
                subscriptionEndDate: user.subscription_end_date,
                status: user.status,
                createdAt: user.created_at,
                referredBy: user.referred_by,
                referralDiscountUsed: user.referral_discount_used
            }))
        });
    } catch (err) {
        console.error('Get all users error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Update user role (Admin only)
 */
exports.updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;

        if (!['coach', 'trainee', 'admin'].includes(role)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Invalid role'
            });
        }

        const result = await pool.query(
            'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, email, role',
            [role, req.params.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Not Found', message: 'User not found' });
        }

        res.json({ user: result.rows[0] });
    } catch (err) {
        console.error('Update user role error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Update user subscription status (Admin only)
 */
/**
 * Update user subscription status and tier (Admin only)
 */
exports.updateSubscription = async (req, res) => {
    try {
        const { status, tier } = req.body;

        if (status && !['free', 'active'].includes(status)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Status must be "free" or "active"'
            });
        }

        if (tier && !isValidTier(tier)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Invalid subscription tier'
            });
        }

        // Check if user is a coach
        const userCheck = await pool.query(
            'SELECT role, subscription_status, subscription_start_date, referred_by, referral_discount_used, subscription_tier FROM users WHERE id = $1',
            [req.params.userId]
        );

        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Not Found', message: 'User not found' });
        }

        const currentUser = userCheck.rows[0];

        if (currentUser.role !== 'coach') {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Subscription can only be changed for coaches'
            });
        }

        // Build dynamic query
        let query = 'UPDATE users SET updated_at = NOW()';
        const values = [];
        let valueIndex = 1;
        let shouldUpdateDates = false;

        // Determine if logic suggests we should update dates
        const newStatus = status ? status.toLowerCase() : null;
        const currentStatus = currentUser.subscription_status;
        const hasDates = !!currentUser.subscription_start_date;

        // Logic: Update dates if:
        // 1. Status is being set to 'active' explicitly
        // 2. Status is NOT changing, but is already 'active', AND dates are missing (self-healing)
        // 3. Tier is being changed (subscription renewal/upgrade)
        if (newStatus === 'active') {
            shouldUpdateDates = true;
        } else if (!newStatus && currentStatus === 'active' && !hasDates) {
            shouldUpdateDates = true;
        } else if (tier) {
            // If tier is being changed, update dates (subscription renewal/upgrade)
            shouldUpdateDates = true;
        }

        if (status) {
            query += `, subscription_status = $${valueIndex}`;
            values.push(status.toLowerCase()); // Ensure lowercase
            valueIndex++;
        }

        if (shouldUpdateDates) {
            query += `, subscription_start_date = NOW(), subscription_end_date = NOW() + INTERVAL '30 days'`;
        }

        if (tier) {
            query += `, subscription_tier = $${valueIndex}`;
            values.push(tier);
            valueIndex++;
        }

        query += ` WHERE id = $${valueIndex} RETURNING id, name, email, role, subscription_status, subscription_tier, subscription_start_date, subscription_end_date`;
        values.push(req.params.userId);

        const result = await pool.query(query, values);

        // --- REFERRAL COMMISSION LOGIC ---
        // Trigger only if status becomes active (or is active) and we just updated/renewed (tier change or status change)
        // We assume if admin updates subscription to Active, payment was verified.
        // Logic: If user has a Referrer, calculate commission.
        if (shouldUpdateDates && (newStatus === 'active' || currentStatus === 'active')) {
            const referrerId = currentUser.referred_by;
            if (referrerId) {
                const finalTier = tier || currentUser.subscription_tier || 'starter';
                const tierInfo = getTierInfo(finalTier);
                const basePrice = tierInfo?.price || 0;

                if (basePrice > 0) {
                    let effectivePrice = basePrice;
                    const isFirstDiscount = !currentUser.referral_discount_used;

                    // If discount hasn't been used, mark it as used NOW (assuming this is the first payment)
                    // The 20% discount applies to the First Month.
                    // If isFirstDiscount, then the user PAID 80% of price.
                    // Commission is 10% of what they PAID (or 10% of base? Prompt said "10% commission on referred coach payments").
                    // Usually commission follows revenue.
                    if (isFirstDiscount) {
                        effectivePrice = basePrice * 0.80; // User paid 80%
                        // Mark discount as used
                        await pool.query('UPDATE users SET referral_discount_used = TRUE WHERE id = $1', [req.params.userId]);
                        console.log(`[Referral] Marked discount used for user ${req.params.userId}`);
                    }

                    const commissionAmount = effectivePrice * 0.10; // 10% commission

                    if (commissionAmount > 0) {
                        await pool.query(
                            `INSERT INTO referral_earnings (referrer_id, referred_user_id, amount, status, created_at)
                             VALUES ($1, $2, $3, 'pending', NOW())`,
                            [referrerId, req.params.userId, commissionAmount]
                        );
                        console.log(`[Referral] Commission of $${commissionAmount} recorded for referrer ${referrerId}`);
                    }
                }
            }
        }
        // --------------------------------

        res.json({ user: result.rows[0] });
    } catch (err) {
        console.error('Update subscription error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Get available subscription tiers (Admin only)
 */
exports.getSubscriptionTiers = async (req, res) => {
    try {
        res.json({ tiers: SUBSCRIPTION_TIERS });
    } catch (err) {
        console.error('Get subscription tiers error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Get platform statistics (Admin only)
 */
exports.getStats = async (req, res) => {
    try {
        const stats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE role = 'coach') as total_coaches,
        COUNT(*) FILTER (WHERE role = 'trainee') as total_trainees,
        COUNT(*) FILTER (WHERE role = 'admin') as total_admins,
        COUNT(*) FILTER (WHERE subscription_status = 'active') as active_subscriptions,
        COUNT(*) FILTER (WHERE subscription_status = 'free') as free_users,
        COUNT(*) as total_users
      FROM users
    `);

        res.json({ stats: stats.rows[0] });
    } catch (err) {
        console.error('Get stats error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Get detailed user information (Admin only)
 */
exports.getUserDetails = async (req, res) => {
    try {
        const { userId } = req.params;

        // Get user with full profile
        const userResult = await pool.query(`
            SELECT id, name, email, role, age, sex, phone, gym, notes,
                   subscription_status, subscription_tier, subscription_start_date, subscription_end_date,
                   status, created_at, profile_pic_url
            FROM users WHERE id = $1
        `, [userId]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Not Found', message: 'User not found' });
        }

        const user = userResult.rows[0];
        const details = {
            id: user.id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            age: user.age,
            sex: user.sex,
            phone: user.phone,
            gym: user.gym,
            notes: user.notes,
            subscriptionStatus: user.subscription_status,
            subscriptionTier: user.subscription_tier,
            subscriptionStartDate: user.subscription_start_date,
            subscriptionEndDate: user.subscription_end_date,
            status: user.status,
            createdAt: user.created_at,
            profile_pic_url: user.profile_pic_url
        };

        // If coach, get trainees
        if (user.role === 'coach') {
            const traineesResult = await pool.query(`
                SELECT u.id, u.name, u.email
                FROM users u
                INNER JOIN coach_trainee ct ON u.id = ct.trainee_id
                WHERE ct.coach_id = $1
                ORDER BY u.name
            `, [userId]);

            details.trainees = traineesResult.rows.map(t => ({
                id: t.id.toString(),
                name: t.name,
                email: t.email
            }));
            details.traineeCount = traineesResult.rows.length;
        }

        // If trainee, get assigned coach
        if (user.role === 'trainee') {
            const coachResult = await pool.query(`
                SELECT u.id, u.name, u.email
                FROM users u
                INNER JOIN coach_trainee ct ON u.id = ct.coach_id
                WHERE ct.trainee_id = $1
                LIMIT 1
            `, [userId]);

            if (coachResult.rows.length > 0) {
                const coach = coachResult.rows[0];
                details.assignedCoach = {
                    id: coach.id.toString(),
                    name: coach.name,
                    email: coach.email
                };
            }
        }

        res.json({ user: details });
    } catch (err) {
        console.error('Get user details error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Block or unblock a user (Admin only)
 */
exports.blockUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.body;

        if (!['active', 'blocked'].includes(status)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Status must be "active" or "blocked"'
            });
        }

        const result = await pool.query(
            'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, email, status',
            [status, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Not Found', message: 'User not found' });
        }

        res.json({ user: result.rows[0] });
    } catch (err) {
        console.error('Block user error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Delete a user (Admin only)
 */
exports.deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        // Check if user exists
        const userCheck = await pool.query('SELECT id, name FROM users WHERE id = $1', [userId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Not Found', message: 'User not found' });
        }

        // Delete user (cascade will handle related data)
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);

        res.json({ message: 'User deleted successfully', userId });
    } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

