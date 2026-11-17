// run-migration-013.js
//
// Applies migrations/013_add_agenda_indexes.sql: indexes that back the
// dashboard "Today's workouts" agenda (GET /agenda/today).
//
// Usage:
//   node run-migration-013.js                → DATABASE_URL (.env staging)
//   node run-migration-013.js --production   → PRODUCTION_DATABASE_URL
//                                              (requires CONFIRM_PROD_MIGRATION=YES)
//
// The migration is additive and idempotent: re-running it is safe.

require('dotenv').config({ quiet: true });

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const useProduction = process.argv.includes('--production');

function describeTarget(connectionString) {
    if (!connectionString) return 'not set';
    try {
        const parsed = new URL(connectionString);
        return `${parsed.hostname}:${parsed.port || '5432'}${parsed.pathname}`;
    } catch {
        return 'unparseable connection string';
    }
}

function resolveConnectionString() {
    if (!useProduction) {
        return process.env.DATABASE_URL || '';
    }

    if (String(process.env.CONFIRM_PROD_MIGRATION || '').toUpperCase() !== 'YES') {
        console.error('❌ --production requires CONFIRM_PROD_MIGRATION=YES in the environment.');
        process.exit(1);
    }

    return process.env.PRODUCTION_DATABASE_URL || '';
}

async function describeIndexes(client) {
    const result = await client.query(`
        SELECT indexname
          FROM pg_indexes
         WHERE tablename = 'workout_plans'
           AND indexname IN (
               'idx_workout_plans_trainee_scheduled',
               'idx_workout_plans_scheduled_date'
           )
         ORDER BY indexname
    `);
    return result.rows.map((row) => row.indexname);
}

async function runMigration() {
    const connectionString = resolveConnectionString();
    if (!connectionString) {
        console.error('❌ No database connection string available for this target.');
        process.exit(1);
    }

    const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();

    try {
        console.log('🔄 Running Migration 013 (agenda indexes)...');
        console.log(`🎯 Target: ${describeTarget(connectionString)}${useProduction ? '  ⚠️  PRODUCTION' : '  (staging)'}`);

        const sqlFile = path.join(__dirname, 'migrations', '013_add_agenda_indexes.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');

        const indexes = await describeIndexes(client);

        console.log('✅ Migration 013 completed successfully!');
        console.log(`🧭 workout_plans indexes: ${indexes.length ? indexes.join(', ') : 'MISSING'}`);
        console.log('ℹ️  The API can use them immediately; no restart required.');

        if (indexes.length < 2) {
            console.error('⚠️  Expected two agenda indexes, found ' + indexes.length + '.');
            process.exitCode = 1;
        }

    } catch (err) {
        try { await client.query('ROLLBACK'); } catch { /* ignore */ }
        console.error('❌ Migration failed:', err.message);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
