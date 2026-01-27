const cron = require('node-cron');
const pool = require('../config/database');

// Cron job to check for expired subscriptions
// Runs every day at midnight (00:00)
const checkExpiredSubscriptions = () => {
    // Schedule task
    cron.schedule('0 0 * * *', async () => {
        console.log('🔄 Running daily subscription check...');
        try {
            const now = new Date();

            // Find users with active subscription whose end date has passed
            const result = await pool.query(
                `UPDATE users 
                 SET subscription_status = 'free', 
                     subscription_tier = 'starter' 
                 WHERE subscription_status = 'active' 
                 AND subscription_end_date < $1 
                 RETURNING id, email`,
                [now]
            );

            if (result.rowCount > 0) {
                console.log(`✅ Downgraded ${result.rowCount} expired subscriptions.`);
                result.rows.forEach(user => {
                    console.log(`   - Downgraded User: ${user.email} (ID: ${user.id})`);
                });
            } else {
                console.log('✅ No expired subscriptions found.');
            }

        } catch (error) {
            console.error('❌ Error running subscription check cron:', error);
        }
    });

    console.log('⏰ Subscription expiration checker scheduled (Daily at 00:00).');
};

module.exports = checkExpiredSubscriptions;
