// run-migration-012.js
//
// Applies migrations/012_add_user_language.sql: adds `users.language`, used to
// render push notifications in the recipient's language.
//
// Usage:
//   node run-migration-012.js                → DATABASE_URL (.env staging)
//   node run-migration-012.js --production   → PRODUCTION_DATABASE_URL
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

async function describeLanguages(client) {
    const result = await client.query(`
        SELECT COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE language = 'es')::int AS spanish,
               COUNT(*) FILTER (WHERE language = 'en')::int AS english
          FROM users
    `);
    return result.rows[0];
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
        console.log('🔄 Running Migration 012 (per-user language)...');
        console.log(`🎯 Target: ${describeTarget(connectionString)}${useProduction ? '  ⚠️  PRODUCTION' : '  (staging)'}`);

        const sqlFile = path.join(__dirname, 'migrations', '012_add_user_language.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');

        const stats = await describeLanguages(client);

        console.log('✅ Migration 012 completed successfully!');
        console.log(`🌐 users: ${stats.total} row(s) · ${stats.spanish} es · ${stats.english} en`);
        console.log('ℹ️  Restart the API so push notifications pick up the language column.');

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
