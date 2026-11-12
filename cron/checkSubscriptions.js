const cron = require('node-cron');
const pool = require('../config/database');
const notificationController = require('../controllers/notification.controller');

// Local YYYY-MM-DD (never shifts the day, unlike toISOString on a date-only value)
const toDateOnly = (value) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return undefined;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

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
                    // No `name` param: clients render the "your own plan" copy
                    const params = JSON.stringify({});
                    await notificationController.createNotification(
                        user.id,
                        params,
                        params,
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
                    const params = JSON.stringify({
                        days: 3,
                        date: toDateOnly(user.subscription_end_date),
                    });
                    await notificationController.createNotification(
                        user.id,
                        params,
                        params,
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
                    const params = JSON.stringify({
                        days: 1,
                        date: toDateOnly(user.subscription_end_date),
                    });
                    await notificationController.createNotification(
                        user.id,
                        params,
                        params,
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
