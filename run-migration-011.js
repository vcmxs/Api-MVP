// run-migration-011.js
//
// Applies migrations/011_coach_invites.sql: creates the coach_invites table
// that backs the shareable coach -> trainee invite links (/join/<code>).
//
// Usage:
//   node run-migration-011.js                → DATABASE_URL (.env staging)
//   node run-migration-011.js --production   → PRODUCTION_DATABASE_URL
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

async function describeInvites(client) {
    const result = await client.query(`
        SELECT COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE revoked = FALSE)::int AS active
          FROM coach_invites
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
        console.log('🔄 Running Migration 011 (coach invite links)...');
        console.log(`🎯 Target: ${describeTarget(connectionString)}${useProduction ? '  ⚠️  PRODUCTION' : '  (staging)'}`);

        const sqlFile = path.join(__dirname, 'migrations', '011_coach_invites.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');

        const stats = await describeInvites(client);

        console.log('✅ Migration 011 completed successfully!');
        console.log(`🔗 coach_invites: ${stats.total} row(s) · ${stats.active} active invite link(s)`);
        console.log('ℹ️  Restart the API so GET /coaches/:coachId/invite can serve links.');

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
