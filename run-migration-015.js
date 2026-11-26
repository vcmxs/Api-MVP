// run-migration-015.js
//
// Applies migrations/015_tier_lineup.sql: the plan line-up changed to
// Starter 1 · Bronze 5 · Silver 15 · Gold unlimited, so every paying coach is
// parked on Bronze (the owner re-assigns each plan by hand afterwards).
// Coaches on `starter` are left alone, and retired names (`olympian`, `basic`,
// `enterprise`) are swept into the same update.
//
// Usage:
//   node run-migration-015.js                → DATABASE_URL (.env staging)
//   node run-migration-015.js --dry-run      → counts the rows and rolls back
//   node run-migration-015.js --production   → PRODUCTION_DATABASE_URL
//                                              (requires CONFIRM_PROD_MIGRATION=YES)
//
// A JSON snapshot of the affected rows is written to backups/ (git-ignored)
// before the UPDATE runs, so any coach can be restored to their old tier.
// The migration is idempotent: re-running it is safe.

require('dotenv').config({ quiet: true });

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const useProduction = process.argv.includes('--production');
const dryRun = process.argv.includes('--dry-run');

/** Same predicate as migrations/015_tier_lineup.sql. */
const AFFECTED_WHERE = `role = 'coach'
   AND (subscription_tier IS NULL OR lower(subscription_tier) <> 'starter')`;

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

async function describeTiers(client) {
    const result = await client.query(`
        SELECT COALESCE(NULLIF(lower(subscription_tier), ''), '(null)') AS tier,
               COUNT(*)::int AS total
          FROM users
         WHERE role IN ('coach', 'admin')
         GROUP BY 1
         ORDER BY 2 DESC, 1
    `);
    return result.rows;
}

function formatTiers(rows) {
    if (!rows.length) return 'no rows';
    return rows.map(row => `${row.tier}: ${row.total}`).join(' · ');
}

function writeSnapshot(rows) {
    const dir = path.join(__dirname, 'backups');
    fs.mkdirSync(dir, { recursive: true });

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = path.join(dir, `tier_lineup_before_${stamp}.json`);
    fs.writeFileSync(file, JSON.stringify({
        capturedAt: new Date().toISOString(),
        target: useProduction ? 'production' : 'staging',
        rowCount: rows.length,
        rows,
    }, null, 2), 'utf8');

    return file;
}

async function runMigration() {
    const connectionString = resolveConnectionString();
    if (!connectionString) {
        console.error('❌ No database connection string available for this target.');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 1,
        connectionTimeoutMillis: 15000,
    });

    let client;
    try {
        try {
            client = await pool.connect();
        } catch (err) {
            console.error(`❌ Could not connect to ${describeTarget(connectionString)}: ${err.message}`);
            console.error('ℹ️  Railway staging sleeps when idle — wake it, or run with --production.');
            process.exitCode = 1;
            return;
        }

        await migrate(client, connectionString);
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

async function migrate(client, connectionString) {
    console.log('🔄 Running Migration 015 (plan line-up → Bronze 5 / Silver 15 / Gold unlimited)...');
    console.log(`🎯 Target: ${describeTarget(connectionString)}${useProduction ? '  ⚠️  PRODUCTION' : '  (staging)'}`);
    if (dryRun) console.log('🧪 Dry run: the UPDATE will be rolled back.');

    const before = await describeTiers(client);
    console.log(`📊 Tiers before: ${formatTiers(before)}`);

    await client.query('BEGIN');

    try {
        const affected = await client.query(`
            SELECT id, email, role, subscription_tier, subscription_status,
                   subscription_start_date, subscription_end_date, is_comped
              FROM users
             WHERE ${AFFECTED_WHERE}
             ORDER BY id
        `);

        if (!affected.rows.length) {
            await client.query('ROLLBACK');
            console.log('ℹ️  Every coach is already on Starter or Bronze — nothing to change.');
            return;
        }

        const snapshotFile = writeSnapshot(affected.rows);
        console.log(`💾 Snapshot: ${path.relative(__dirname, snapshotFile)} (${affected.rows.length} row(s))`);

        const sqlFile = path.join(__dirname, 'migrations', '015_tier_lineup.sql');
        await client.query(fs.readFileSync(sqlFile, 'utf8'));

        if (dryRun) {
            await client.query('ROLLBACK');
            console.log(`🧪 Dry run: ${affected.rows.length} coach(es) would move to bronze. Rolled back.`);
            return;
        }

        await client.query('COMMIT');
        const after = await describeTiers(client);
        console.log(`✅ Migration 015 completed: ${affected.rows.length} coach(es) parked on bronze.`);
        console.log(`📊 Tiers after:  ${formatTiers(after)}`);
        console.log('ℹ️  Restart the API so /coaches limits and the admin revenue panel see the new line-up.');
        console.log('👉 Next: open /admin and re-assign each coach to Silver or Gold as agreed.');
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch { /* ignore */ }
        console.error('❌ Migration failed:', err.message);
        process.exitCode = 1;
    }
}

runMigration();
