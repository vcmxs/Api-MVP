#!/usr/bin/env node
// scripts/backfill-exercise-library-links.js
//
// Fills `exercises.exercise_library_id` for plans created before the catalog
// link existed (and for rows created by clients that only sent a name).
//
// Matching is deliberately conservative:
//   1. exact normalized name against exercise_library.name_norm
//   2. exact normalized name against published Spanish translations
//   3. anything ambiguous or unmatched stays NULL and is reported
//
// No name, id, log or prescription is changed. The link only controls which
// localised name the API renders; a NULL link keeps the original snapshot.
//
// Usage:
//   node scripts/backfill-exercise-library-links.js --dry-run
//   node scripts/backfill-exercise-library-links.js --apply
//   node scripts/backfill-exercise-library-links.js --apply --production
//       (requires CONFIRM_PROD_MIGRATION=YES)

require('dotenv').config({ quiet: true });

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const ROOT = path.join(__dirname, '..');
const BACKUP_DIR = path.join(ROOT, 'backups');
const argv = new Set(process.argv.slice(2));
const useProduction = argv.has('--production');
const apply = argv.has('--apply') && !argv.has('--dry-run');

function normalizeName(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

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
    if (!useProduction) return process.env.DATABASE_URL || '';
    if (String(process.env.CONFIRM_PROD_MIGRATION || '').toUpperCase() !== 'YES') {
        console.error('❌ --production requires CONFIRM_PROD_MIGRATION=YES in the environment.');
        process.exit(1);
    }
    return process.env.PRODUCTION_DATABASE_URL || '';
}

function addToIndex(index, norm, id) {
    if (!norm) return;
    if (!index.has(norm)) index.set(norm, new Set());
    index.get(norm).add(Number(id));
}

function writeSnapshot(rows, target) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = path.join(BACKUP_DIR, `exercise_library_links_before_${stamp}.json`);
    fs.writeFileSync(file, JSON.stringify({
        capturedAt: new Date().toISOString(),
        target,
        rowCount: rows.length,
        rows,
    }, null, 2), 'utf8');
    return file;
}

function writeReport(report) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = path.join(BACKUP_DIR, `exercise_library_links_report_${stamp}.json`);
    fs.writeFileSync(file, JSON.stringify(report, null, 2), 'utf8');
    return file;
}

async function main() {
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
            process.exitCode = 1;
            return;
        }

        const target = useProduction ? 'production' : 'staging';
        console.log('🔗 Backfill exercises.exercise_library_id');
        console.log(`🎯 Target: ${describeTarget(connectionString)}${useProduction ? '  ⚠️  PRODUCTION' : '  (staging)'}`);

        const schema = await client.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                   AND table_name = 'exercises'
                   AND column_name = 'exercise_library_id'
            ) AS ok
        `);
        if (!schema.rows[0]?.ok) {
            console.error('❌ exercises.exercise_library_id no existe. Ejecuta run-migration-016.js primero.');
            process.exitCode = 1;
            return;
        }

        const library = await client.query('SELECT id, name, name_norm FROM exercise_library ORDER BY id');
        const translations = await client.query(
            `SELECT exercise_id, name, name_norm
               FROM exercise_translations
              WHERE locale = 'es' AND status = 'published'
              ORDER BY exercise_id`
        );
        const exercises = await client.query(
            `SELECT id, name
               FROM exercises
              WHERE exercise_library_id IS NULL
              ORDER BY id`
        );

        const canonicalIndex = new Map();
        for (const row of library.rows) addToIndex(canonicalIndex, row.name_norm || normalizeName(row.name), row.id);

        const translationIndex = new Map();
        for (const row of translations.rows) addToIndex(translationIndex, row.name_norm || normalizeName(row.name), row.exercise_id);

        const changes = [];
        const ambiguous = [];
        const unmatched = [];

        for (const exercise of exercises.rows) {
            const norm = normalizeName(exercise.name);
            if (!norm) {
                unmatched.push({ id: exercise.id, name: exercise.name, reason: 'empty' });
                continue;
            }

            const canonical = canonicalIndex.get(norm);
            const translated = translationIndex.get(norm);

            if (canonical?.size === 1) {
                changes.push({ exerciseId: Number(exercise.id), libraryId: [...canonical][0], method: 'canonical' });
            } else if (translated?.size === 1) {
                changes.push({ exerciseId: Number(exercise.id), libraryId: [...translated][0], method: 'translation' });
            } else if ((canonical?.size ?? 0) > 1 || (translated?.size ?? 0) > 1) {
                ambiguous.push({
                    id: exercise.id,
                    name: exercise.name,
                    canonicalIds: canonical ? [...canonical] : [],
                    translationIds: translated ? [...translated] : [],
                });
            } else {
                unmatched.push({ id: exercise.id, name: exercise.name, reason: 'not_found' });
            }
        }

        console.log(`📊 exercises sin enlace: ${exercises.rows.length} · resueltos: ${changes.length} · ambiguos: ${ambiguous.length} · sin match: ${unmatched.length}`);
        for (const item of ambiguous.slice(0, 10)) console.log(`   ⚠️ #${item.id} ${item.name} → canónicos ${item.canonicalIds.join(',')} / traducciones ${item.translationIds.join(',')}`);
        for (const item of unmatched.slice(0, 10)) console.log(`   · #${item.id} ${item.name}`);


        let snapshot = null;
        if (apply && changes.length > 0) {
            snapshot = writeSnapshot(changes, target);
            console.log(`💾 Snapshot: ${path.relative(ROOT, snapshot)}`);

            await client.query('BEGIN');
            try {
                for (let offset = 0; offset < changes.length; offset += 500) {
                    const chunk = changes.slice(offset, offset + 500);
                    const values = chunk.map((_, index) => `($${index * 2 + 1}::int, $${index * 2 + 2}::int)`).join(', ');
                    const params = chunk.flatMap(item => [item.exerciseId, item.libraryId]);
                    await client.query(
                        `UPDATE exercises AS e
                            SET exercise_library_id = v.library_id
                           FROM (VALUES ${values}) AS v(exercise_id, library_id)
                          WHERE e.id = v.exercise_id
                            AND e.exercise_library_id IS NULL`,
                        params
                    );
                }
                await client.query('COMMIT');
                console.log('✅ Backfill confirmado.');
            } catch (err) {
                try { await client.query('ROLLBACK'); } catch { /* ignore */ }
                throw err;
            }
        } else if (!apply) {
            console.log('🧪 Dry run: no se escribió nada.');
        }

        const coverage = await client.query(`
            SELECT COUNT(*)::int AS total,
                   COUNT(*) FILTER (WHERE exercise_library_id IS NOT NULL)::int AS linked
              FROM exercises
        `);
        const report = {
            generatedAt: new Date().toISOString(),
            mode: apply ? 'apply' : 'dry-run',
            target,
            counts: {
                candidates: exercises.rows.length,
                resolved: changes.length,
                ambiguous: ambiguous.length,
                unmatched: unmatched.length,
                total: coverage.rows[0].total,
                linked: coverage.rows[0].linked,
            },
            methods: {
                canonical: changes.filter(item => item.method === 'canonical').length,
                translation: changes.filter(item => item.method === 'translation').length,
            },
            ambiguous,
            unmatched,
            snapshot: snapshot ? path.relative(ROOT, snapshot) : null,
        };
        report.reportFile = path.relative(ROOT, writeReport(report));

        console.log(`📈 Cobertura: ${report.counts.linked}/${report.counts.total} ejercicios enlazados.`);
        console.log(`   Reporte: ${report.reportFile}`);
    } catch (err) {
        console.error('❌ Backfill failed:', err.message);
        process.exitCode = 1;
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

main();
