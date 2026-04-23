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
        const { status, tier, isComped } = req.body;

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
            'SELECT role, subscription_status, subscription_start_date, referred_by, referral_discount_used, subscription_tier, is_comped FROM users WHERE id = $1',
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

        if (isComped !== undefined) {
            query += `, is_comped = $${valueIndex}`;
            values.push(isComped);
            valueIndex++;
        }

        query += ` WHERE id = $${valueIndex} RETURNING id, name, email, role, subscription_status, subscription_tier, subscription_start_date, subscription_end_date, is_comped`;
        values.push(req.params.userId);

        const result = await pool.query(query, values);

        // --- PAYMENT LEDGER + REFERRAL COMMISSION LOGIC ---
        // Only fires if a real subscription change happened (dates updated)
        if (shouldUpdateDates && (newStatus === 'active' || currentStatus === 'active')) {
            const finalComped = isComped !== undefined ? isComped : currentUser.is_comped;
            const finalTier = tier || currentUser.subscription_tier || 'starter';
            const tierInfo = getTierInfo(finalTier);
            const basePrice = tierInfo?.price || 0;

            // 1. Log the payment in the payments ledger (only if this is a REAL payment, not comped)
            if (!finalComped && basePrice > 0) {
                await pool.query(
                    'INSERT INTO payments (coach_id, amount, tier, status, created_at) VALUES ($1, $2, $3, $4, NOW())',
                    [req.params.userId, basePrice, finalTier, 'succeeded']
                );
                console.log(`[Payments] Logged $${basePrice} payment for coach ${req.params.userId} (${finalTier})`);
            }

            // 2. Referral commission logic (skip entirely for comped subs)
            if (!finalComped) {
                const referrerId = currentUser.referred_by;
                if (referrerId && basePrice > 0) {
                    let effectivePrice = basePrice;
                    const isFirstDiscount = !currentUser.referral_discount_used;

                    if (isFirstDiscount) {
                        effectivePrice = basePrice * 0.80; // First month: coach got 20% off
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
            } else {
                console.log(`[Comped] Skipping payment + referral for comped coach ${req.params.userId}`);
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
        COUNT(*) FILTER (WHERE subscription_status = 'active' AND role = 'coach') as active_subscriptions,
        COUNT(*) FILTER (WHERE subscription_status = 'free' OR role != 'coach') as free_users,
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

/**
 * Get platform financials (Admin only)
 */
exports.getFinance = async (req, res) => {
    try {
        const activeUsers = await pool.query(`
            SELECT subscription_tier, COUNT(*) as count 
            FROM users 
            WHERE subscription_status = 'active' AND role = 'coach' AND is_comped = false
            GROUP BY subscription_tier
        `);
        
        let mrr = 0;
        let arr = 0;
        const revenue_by_tier = [];
        
        activeUsers.rows.forEach(row => {
            const tierInfo = getTierInfo(row.subscription_tier || 'starter');
            const price = tierInfo ? tierInfo.price : 0;
            const tierTotal = price * parseInt(row.count);
            mrr += tierTotal;
            revenue_by_tier.push({ tier: (row.subscription_tier || 'Starter').toUpperCase(), amount: tierTotal });
        });
        arr = mrr * 12;

        const churnRes = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE subscription_status = 'inactive' AND updated_at >= NOW() - INTERVAL '30 days') as cancelled_recently,
                COUNT(*) FILTER (WHERE subscription_status = 'active') as currently_active
            FROM users WHERE role = 'coach'
        `);
        const cancelled = parseInt(churnRes.rows[0].cancelled_recently) || 0;
        const active = parseInt(churnRes.rows[0].currently_active) || 0;
        const totalLastMonth = cancelled + active;
        const churn_rate = totalLastMonth > 0 ? ((cancelled / totalLastMonth) * 100).toFixed(1) + '%' : '0.0%';

        const histRes = await pool.query(`
            SELECT TO_CHAR(created_at, 'Mon') as month, SUM(amount) as amount 
            FROM payments 
            WHERE created_at >= NOW() - INTERVAL '6 months' 
            GROUP BY month, DATE_TRUNC('month', created_at)
            ORDER BY DATE_TRUNC('month', created_at) ASC
        `);
        const historical_revenue = histRes.rows.map(r => ({ month: r.month, amount: parseFloat(r.amount) }));
        // Empty array when no payments logged yet

        const payoutsRes = await pool.query(`SELECT SUM(amount) as total FROM payouts WHERE created_at >= NOW() - INTERVAL '30 days'`);
        const recentPayouts = parseFloat(payoutsRes.rows[0].total) || 0;
        const net_profit = mrr - recentPayouts;

        // Recent individual payments this month (with coach name)
        const recentPaymentsRes = await pool.query(`
            SELECT p.id, p.coach_id, u.name as coach_name, u.email as coach_email,
                   p.amount, p.tier, p.status, p.created_at
            FROM payments p
            JOIN users u ON p.coach_id = u.id
            WHERE p.created_at >= DATE_TRUNC('month', NOW())
            ORDER BY p.created_at DESC
            LIMIT 50
        `);
        const recent_payments = recentPaymentsRes.rows.map(r => ({
            id: r.id, coachId: r.coach_id, coachName: r.coach_name, coachEmail: r.coach_email,
            amount: parseFloat(r.amount), tier: r.tier, status: r.status, createdAt: r.created_at
        }));
        const month_total = recent_payments.reduce((sum, p) => sum + p.amount, 0);

        res.json({
            finance: { mrr, arr, churn_rate, net_profit, revenue_by_tier, historical_revenue, recent_payments, month_total }
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

exports.getReferrals = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT re.id, re.referrer_id as "coachId", u.name as "coachName", u.email as "coachEmail",
                   re.amount, re.status, re.created_at as "createdAt", t.name as "traineeName"
            FROM referral_earnings re
            JOIN users u ON re.referrer_id = u.id
            LEFT JOIN users t ON re.referred_user_id = t.id
            ORDER BY re.created_at DESC
        `);
        res.json({ earnings: result.rows.map(r => ({ ...r, amount: parseFloat(r.amount) })) });
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.payReferral = async (req, res) => {
    try {
        const { earningId } = req.params;
        const earningResult = await pool.query('SELECT * FROM referral_earnings WHERE id = $1', [earningId]);
        if (earningResult.rows.length === 0) return res.status(404).json({ error: 'Not Found' });
        
        const earning = earningResult.rows[0];
        if (earning.status === 'paid') return res.status(400).json({ error: 'Already paid' });

        await pool.query('UPDATE referral_earnings SET status = $1 WHERE id = $2', ['paid', earningId]);
        await pool.query('INSERT INTO payouts (coach_id, amount, status, created_at) VALUES ($1, $2, $3, NOW())', [earning.referrer_id, earning.amount, 'paid']);

        res.json({ message: 'Marked as paid' });
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
