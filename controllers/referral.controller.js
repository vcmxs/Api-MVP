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

        // Get recent referrals (name and date)
        const recentResult = await pool.query(
            'SELECT name, created_at, subscription_status FROM users WHERE referred_by = $1 ORDER BY created_at DESC LIMIT 5',
            [userId]
        );

        res.json({
            referralCode: user.referral_code,
            referralCount,
            totalEarnings,
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
