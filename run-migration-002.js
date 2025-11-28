const pool = require('./db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    console.log('🔄 Running migration 002: Admin Role and Subscription Infrastructure...\n');

    try {
        // Read the migration SQL file
        const sqlPath = path.join(__dirname, 'migrations', '002_add_admin_and_subscription_fields.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Execute the migration
        await pool.query(sql);

        console.log('✅ Database schema updated successfully');
        console.log('✅ Subscription fields added to users table');
        console.log('✅ Admin role support enabled');
        console.log('✅ Performance indexes created\n');

        // Verify the migration
        const result = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('subscription_status', 'subscription_tier', 'stripe_customer_id')
      ORDER BY column_name
    `);

        console.log('📊 Verified new columns:');
        result.rows.forEach(col => {
            console.log(`   ✓ ${col.column_name} (${col.data_type})`);
        });

        // Check if admin user was created
        const adminCheck = await pool.query(
            "SELECT id, name, email, role FROM users WHERE role = 'admin' LIMIT 1"
        );

        if (adminCheck.rows.length > 0) {
            console.log('\n👤 Admin user created:');
            console.log(`   Email: ${adminCheck.rows[0].email}`);
            console.log(`   Password: admin123 (CHANGE THIS IN PRODUCTION!)`);
        }

        console.log('\n✅ Migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        console.error(err);
        process.exit(1);
    }
}

runMigration();
