const cron = require('node-cron');
const pool = require('../config/database');
const notificationController = require('../controllers/notification.controller');

// Cron job to check for expired subscriptions & send reminders
// Runs every day at midnight (00:00)
const checkExpiredSubscriptions = () => {
    // Schedule task
    cron.schedule('0 0 * * *', async () => {
        console.log('🔄 Running daily subscription check & reminders...');
        const client = await pool.connect();

        try {
            const now = new Date();

            // -----------------------------------------------------
            // 1. DOWNGRADE EXPIRED SUBSCRIPTIONS
            // -----------------------------------------------------
            const expiredResult = await client.query(
                `UPDATE users 
                 SET subscription_status = 'free', 
                     subscription_tier = 'starter' 
                 WHERE subscription_status = 'active' 
                 AND subscription_end_date < $1 
                 RETURNING id, email`,
                [now]
            );

            if (expiredResult.rowCount > 0) {
                console.log(`✅ Downgraded ${expiredResult.rowCount} expired subscriptions.`);
                // Notify user they have been downgraded
                for (const user of expiredResult.rows) {
                    await notificationController.createNotification(
                        user.id,
                        'Subscription Expired',
                        'Your premium subscription has expired. You have been reverted to the Starter plan.',
                        'subscription_expired',
                        null
                    );
                }
            } else {
                console.log('✅ No expired subscriptions found to downgrade.');
            }

            // -----------------------------------------------------
            // 2. SEND 3-DAY REMINDER
            // -----------------------------------------------------
            const reminder3Days = await client.query(
                `SELECT id, name, email, subscription_end_date 
                 FROM users 
                 WHERE subscription_status = 'active' 
                 AND subscription_end_date::date = (CURRENT_DATE + INTERVAL '3 days')::date`
            );

            if (reminder3Days.rowCount > 0) {
                console.log(`📢 Sending 3-day reminder to ${reminder3Days.rowCount} users.`);
                for (const user of reminder3Days.rows) {
                    await notificationController.createNotification(
                        user.id,
                        'Subscription Ending Soon',
                        `Your subscription expires in 3 days (${new Date(user.subscription_end_date).toLocaleDateString()}). Renew now to keep your benefits!`,
                        'subscription_reminder',
                        null
                    );
                }
            }

            // -----------------------------------------------------
            // 3. SEND 1-DAY REMINDER
            // -----------------------------------------------------
            const reminder1Day = await client.query(
                `SELECT id, name, email, subscription_end_date 
                 FROM users 
                 WHERE subscription_status = 'active' 
                 AND subscription_end_date::date = (CURRENT_DATE + INTERVAL '1 day')::date`
            );

            if (reminder1Day.rowCount > 0) {
                console.log(`📢 Sending 1-day reminder to ${reminder1Day.rowCount} users.`);
                for (const user of reminder1Day.rows) {
                    await notificationController.createNotification(
                        user.id,
                        'Subscription Expires Tomorrow',
                        'Your subscription expires tomorrow! Renew now to avoid losing access to premium features.',
                        'subscription_reminder',
                        null
                    );
                }
            }

        } catch (error) {
            console.error('❌ Error running subscription check cron:', error);
        } finally {
            client.release();
        }
    });

    console.log('⏰ Subscription expiration checker scheduled (Daily at 00:00).');
};

module.exports = checkExpiredSubscriptions;
