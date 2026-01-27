// models/User.js
const pool = require('../config/database');

class User {
    /**
     * Find user by email
     */
    static async findByEmail(email) {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        return result.rows[0];
    }

    /**
     * Find user by Referral Code
     */
    static async findByReferralCode(code) {
        const result = await pool.query(
            'SELECT * FROM users WHERE referral_code = $1',
            [code]
        );
        return result.rows[0];
    }

    /**
     * Find user by ID
     */
    static async findById(id) {
        const result = await pool.query(
            'SELECT id, name, email, role, age, sex, phone, gym, profile_pic_url, notes, height, weight, created_at, subscription_status, subscription_tier, referral_code FROM users WHERE id = $1',
            [id]
        );
        return result.rows[0];
    }

    /**
     * Create new user
     */
    static async create(userData) {
        const { name, email, password, role, age, sex, phone, gym, notes, height, weight, profilePicUrl,
            subscription_tier = 'starter', subscription_status = 'active', referredBy = null } = userData;

        // Generate unique referral code
        // Simple alphanumeric code logic
        const generateCode = () => Math.random().toString(36).substring(2, 10).toUpperCase();
        let referralCode = generateCode();

        // Ensure uniqueness loop could be added here, but for now we rely on DB constraint and chance
        // In a high volume system, we'd want a retry loop

        const result = await pool.query(
            `INSERT INTO users (name, email, password, role, age, sex, phone, gym, notes, height, weight, profile_pic_url, subscription_tier, subscription_status, referral_code, referred_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
       RETURNING id, name, email, role, age, sex, phone, gym, notes, height, weight, profile_pic_url, subscription_tier, subscription_status, referral_code, referral_discount_used`,
            [name, email, password, role, age, sex, phone, gym, notes, height, weight, profilePicUrl, subscription_tier, subscription_status, referralCode, referredBy]
        );

        return result.rows[0];
    }

    /**
     * Authenticate user
     */
    static async authenticate(email, password) {
        const result = await pool.query(
            'SELECT id, name, email, role, subscription_status, status FROM users WHERE email = $1 AND password = $2',
            [email, password]
        );
        return result.rows[0];
    }

    /**
     * Update user profile
     */
    static async updateProfile(userId, profileData) {
        const { name, age, sex, phone, gym, notes, height, weight } = profileData;

        const result = await pool.query(
            `UPDATE users 
       SET name = COALESCE($1, name),
           age = COALESCE($2, age),
           sex = COALESCE($3, sex),
           phone = COALESCE($4, phone),
           gym = COALESCE($5, gym),
           notes = COALESCE($6, notes),
           height = COALESCE($7, height),
           weight = COALESCE($8, weight)
       WHERE id = $9
       RETURNING id, name, email, role, age, sex, phone, gym, profile_pic_url, notes, height, weight`,
            [name, age, sex, phone, gym, notes, height, weight, userId]
        );

        return result.rows[0];
    }

    /**
     * Update profile picture
     */
    static async updateProfilePicture(userId, profilePicUrl) {
        const result = await pool.query(
            'UPDATE users SET profile_pic_url = $1 WHERE id = $2 RETURNING id, profile_pic_url',
            [profilePicUrl, userId]
        );
        return result.rows[0];
    }
}

module.exports = User;
