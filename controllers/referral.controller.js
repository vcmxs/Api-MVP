const pool = require('../config/database');
const User = require('../models/User');

/**
 * Get referral statistics for the current user
 */
exports.getStats = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get user's referral code
        let user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Lazy generation: If user has no code, generate one now
        if (!user.referral_code) {
            const generateCode = () => Math.random().toString(36).substring(2, 10).toUpperCase();
            let newCode = generateCode();

            // Try to update - simple retry logic for collisions could be added here if needed
            // For now we assume low collision probability with 8 chars alphanum
            try {
                await pool.query('UPDATE users SET referral_code = $1 WHERE id = $2', [newCode, userId]);
                user.referral_code = newCode;
            } catch (err) {
                // If collision, try one more time
                console.log('Referral code collision, retrying generation...');
                newCode = generateCode();
                await pool.query('UPDATE users SET referral_code = $1 WHERE id = $2', [newCode, userId]);
                user.referral_code = newCode;
            }
        }

        // Get referral count
        const countResult = await pool.query(
            'SELECT COUNT(*) FROM users WHERE referred_by = $1',
            [userId]
        );
        const referralCount = parseInt(countResult.rows[0].count);

        // Get earnings
        const earningsResult = await pool.query(
            'SELECT COALESCE(SUM(amount), 0) as total FROM referral_earnings WHERE referrer_id = $1',
            [userId]
        );
        const totalEarnings = parseFloat(earningsResult.rows[0].total);

        // Get current balance (pending earnings)
        const balanceResult = await pool.query(
            "SELECT COALESCE(SUM(amount), 0) as balance FROM referral_earnings WHERE referrer_id = $1 AND status = 'pending'",
            [userId]
        );
        const currentBalance = parseFloat(balanceResult.rows[0].balance);

        // Get recent referrals (name, date, status, tier, earnings)
        const recentResult = await pool.query(
            `SELECT u.id, u.name, u.email, u.subscription_status, u.subscription_tier, u.created_at,
                    COALESCE(SUM(re.amount), 0) as total_earnings
             FROM users u
             LEFT JOIN referral_earnings re ON u.id = re.referred_user_id
             WHERE u.referred_by = $1
             GROUP BY u.id
             ORDER BY u.created_at DESC
             LIMIT 10`,
            [userId]
        );

        res.json({
            referralCode: user.referral_code,
            referralCount,
            totalEarnings,
            currentBalance,
            recentReferrals: recentResult.rows
        });
    } catch (err) {
        console.error('Error fetching referral stats:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get system-wide referral statistics (Admin only)
 */
exports.getAdminStats = async (req, res) => {
    try {
        // Double check admin role although middleware should handle it
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Total referrals in system
        const referralsResult = await pool.query(
            'SELECT COUNT(*) FROM users WHERE referred_by IS NOT NULL'
        );

        // Total earnings pending/paid
        const earningsResult = await pool.query(
            `SELECT 
                status, 
                COUNT(*) as count, 
                COALESCE(SUM(amount), 0) as total 
             FROM referral_earnings 
             GROUP BY status`
        );

        // Top referrers
        const topReferrersResult = await pool.query(`
            SELECT u.name, u.email, COUNT(r.id) as referral_count, COALESCE(SUM(re.amount), 0) as total_earnings
            FROM users u
            JOIN users r ON u.id = r.referred_by
            LEFT JOIN referral_earnings re ON u.id = re.referrer_id
            GROUP BY u.id, u.name, u.email
            ORDER BY referral_count DESC
            LIMIT 10
        `);

        res.json({
            totalReferrals: parseInt(referralsResult.rows[0].count),
            earningsByStatus: earningsResult.rows,
            topReferrers: topReferrersResult.rows
        });
    } catch (err) {
        console.error('Error fetching admin referral stats:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
/**
 * Get all referral earnings records (Admin only)
 */
exports.getAdminEarnings = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const result = await pool.query(`
            SELECT re.id, re.amount, re.status, re.created_at,
                   referrer.name as coach_name, referrer.email as coach_email,
                   referred.name as source_user_name
            FROM referral_earnings re
            JOIN users referrer ON re.referrer_id = referrer.id
            JOIN users referred ON re.referred_user_id = referred.id
            ORDER BY re.created_at DESC
        `);

        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching admin earnings:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Update earning status (Admin only)
 */
exports.updateEarningStatus = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { id } = req.params;
        const { status } = req.body; // 'paid' or 'pending'

        if (!['paid', 'pending'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const result = await pool.query(
            'UPDATE referral_earnings SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Earning record not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating earning status:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
