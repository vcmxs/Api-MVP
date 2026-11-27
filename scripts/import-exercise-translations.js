#!/usr/bin/env node
// scripts/import-exercise-translations.js
//
// Imports the AI-reviewed Spanish names into `exercise_translations` and the
// 86 legacy taxonomies into `exercise_library` (optional), without changing a
// single catalog id, canonical name or plan snapshot.
//
// Sources:
//   exports/biblioteca-ejercicios-2026-11-26/traduccion_resultado_tabla1.csv
//   exports/biblioteca-ejercicios-2026-11-26/revision_resultado_antiguos_tabla2.csv
//
// Safety:
//   - dry-run by default; writes only with --apply
//   - a JSON snapshot of the affected translations is written to backups/
//   - every row is validated against the live `exercise_library` ids
//   - the 8 orphans go to `exercise_translation_candidates`, never invented ids
//   - all names are published; `confidence`/`notes` keep the review trail
//
// Usage:
//   node scripts/import-exercise-translations.js --dry-run
//   node scripts/import-exercise-translations.js --apply
//   node scripts/import-exercise-translations.js --apply --with-taxonomy
//   node scripts/import-exercise-translations.js --table2-only --with-taxonomy
//   node scripts/import-exercise-translations.js --offline
//   node scripts/import-exercise-translations.js --apply --production
//       (requires CONFIRM_PROD_MIGRATION=YES)
//
// `--include-canonical` adds identity ES rows for the catalog rows that are
// already Spanish but never had a dataset id.

require('dotenv').config({ quiet: true });

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const ROOT = path.join(__dirname, '..');
const EXPORT_DIR = path.join(ROOT, 'exports', 'biblioteca-ejercicios-2026-11-26');
const TABLE1_FILE = path.join(EXPORT_DIR, 'traduccion_resultado_tabla1.csv');
const TABLE2_FILE = path.join(EXPORT_DIR, 'revision_resultado_antiguos_tabla2.csv');
const BACKUP_DIR = path.join(ROOT, 'backups');

const argv = new Set(process.argv.slice(2));
const useProduction = argv.has('--production');
const apply = argv.has('--apply') && !argv.has('--dry-run');
const offline = argv.has('--offline');
const withTaxonomy = argv.has('--with-taxonomy');
const includeCanonical = argv.has('--include-canonical');
const table2Only = argv.has('--table2-only');

const CONFIDENCE = new Set(['alta', 'media', 'baja']);

/**
 * Hand-tuned corrections agreed during the audit. Keep this list small and
 * explain every entry: it is the only place where the importer overrides the
 * AI output.
 */
const NAME_OVERRIDES = new Map([
    // "cable" → "polea" (glossary), and make the two calf-raise variants
    // distinguishable without changing their catalog row.
    ['546', 'Elevación de talones en polea, de pie'],
    ['554', 'Elevación de talones en polea unilateral, de pie'],
    ['634', 'Curl inverso de bíceps con mancuernas'],
    ['785', 'Curl de bíceps con agarre invertido y mancuernas'],
    ['373', 'Elevación de talones con barra, de pie'],
    ['378', 'Elevación de talones a una pierna con barra'],
    ['1294', 'Elevación de talones inversa en multipower'],
    ['1308', 'Elevación de puntillas en multipower'],
]);

/** Legacy rows with no category (or a category the app taxonomy rejects). */
const TAXONOMY_OVERRIDES = new Map([
    ['158', { muscle_category: 'CARDIO' }],
]);

function parseCsv(text, delimiter = ';') {
    const input = String(text || '').replace(/^\uFEFF/, '');
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;

    for (let i = 0; i < input.length; i++) {
        const char = input[i];
        if (quoted) {
            if (char === '"') {
                if (input[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    quoted = false;
                }
            } else {
                field += char;
            }
            continue;
        }

        if (char === '"') {
            quoted = true;
        } else if (char === delimiter) {
            row.push(field);
            field = '';
        } else if (char === '\n') {
            row.push(field);
            if (row.some(value => String(value).trim() !== '')) rows.push(row);
            row = [];
            field = '';
        } else if (char !== '\r') {
            field += char;
        }
    }

    if (field !== '' || row.length > 0) {
        row.push(field);
        if (row.some(value => String(value).trim() !== '')) rows.push(row);
    }

    return rows;
}

function readCsv(file) {
    const rows = parseCsv(fs.readFileSync(file, 'utf8'));
    if (rows.length === 0) return [];
    const headers = rows[0].map(header => String(header).trim());
    return rows.slice(1).map(cells => {
        const record = {};
        headers.forEach((header, index) => {
            record[header] = String(cells[index] ?? '').trim();
        });
        return record;
    });
}


/** Same normalisation as exercise_normalize_name() in SQL. */
function normalizeName(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function confidenceOf(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return CONFIDENCE.has(normalized) ? normalized : 'media';
}

function splitMuscles(value) {
    return String(value || '')
        .split('|')
        .map(item => item.trim())
        .filter(Boolean);
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

function buildPlan(table1, table2) {
    const errors = [];
    const warnings = [];
    const translations = [];
    const candidates = [];
    const taxonomyRows = [];
    const seenIds = new Map();

    for (const row of table1) {
        const rawId = String(row.id_app || '').trim();
        const datasetId = String(row.dataset_id || '').trim() || null;
        const suggested = String(row.nombre_es_sugerido || '').trim();
        const name = NAME_OVERRIDES.get(rawId) || suggested;

        if (!rawId) {
            // Dataset rows without a catalog id: review them, never invent an id.
            if (!name) {
                errors.push(`Tabla 1 · dataset ${datasetId || '(sin id)'}: nombre vacío.`);
                continue;
            }
            candidates.push({
                datasetId,
                locale: 'es',
                name,
                notes: row.notas_revision || 'Dataset huérfano: no existe fila en exercise_library.',
            });
            continue;
        }

        const exerciseId = Number(rawId);
        if (!Number.isInteger(exerciseId) || exerciseId <= 0) {
            errors.push(`Tabla 1 · id_app inválido: ${rawId}`);
            continue;
        }
        if (!name) {
            errors.push(`Tabla 1 · id ${exerciseId}: nombre vacío.`);
            continue;
        }
        if (seenIds.has(exerciseId)) {
            errors.push(`Tabla 1 · id ${exerciseId} repetido (${seenIds.get(exerciseId)} y ${datasetId || 'sin dataset'}).`);
            continue;
        }
        seenIds.set(exerciseId, datasetId || 'sin dataset');

        translations.push({
            exerciseId,
            datasetId,
            name,
            confidence: confidenceOf(row.confianza),
            notes: row.notas_revision || '',
            source: 'ai',
            taxonomy: null,
        });
    }

    for (const row of table2) {
        const rawId = String(row.id_app || '').trim();
        const exerciseId = Number(rawId);
        const name = NAME_OVERRIDES.get(rawId)
            || String(row.nombre_estandarizado_sugerido || '').trim()
            || String(row.nombre_actual || '').trim();

        if (!Number.isInteger(exerciseId) || exerciseId <= 0) {
            errors.push(`Tabla 2 · id_app inválido: ${rawId || '(vacío)'}`);
            continue;
        }
        if (!name) {
            errors.push(`Tabla 2 · id ${exerciseId}: nombre vacío.`);
            continue;
        }
        if (seenIds.has(exerciseId)) {
            errors.push(`Tabla 2 · id ${exerciseId} repetido (${seenIds.get(exerciseId)} y tabla 2).`);
            continue;
        }
        seenIds.set(exerciseId, 'tabla 2');

        const taxonomy = {
            muscle_category: row.categoria_sugerida || null,
            body_part: row.body_part_sugerido || null,
            equipment: row.equipo_sugerido || null,
            target_muscle: row.musculo_objetivo_sugerido || null,
            muscle_group: row.grupo_muscular_sugerido || null,
            secondary_muscles: splitMuscles(row.musculos_secundarios_sugeridos),
        };

        translations.push({
            exerciseId,
            datasetId: null,
            name,
            confidence: confidenceOf(row.confianza),
            notes: row.notas_revision || '',
            source: 'ai',
            taxonomy,
        });
        taxonomyRows.push({ exerciseId, taxonomy });
    }

    for (const [rawId, taxonomy] of TAXONOMY_OVERRIDES) {
        const exerciseId = Number(rawId);
        if (!taxonomyRows.some(item => item.exerciseId === exerciseId)) {
            taxonomyRows.push({ exerciseId, taxonomy });
        }
    }

    // Duplicate display names are allowed by the schema (two different catalog
    // rows can share a Spanish name), but they deserve an explicit report so a
    // reviewer can decide whether they are real variants or dataset duplicates.
    const byName = new Map();
    for (const item of translations) {
        const key = normalizeName(item.name);
        if (!byName.has(key)) byName.set(key, []);
        byName.get(key).push(item);
    }
    for (const [normalized, items] of byName) {
        if (items.length < 2) continue;
        warnings.push(`Nombre compartido "${items[0].name}" (${normalized}): ids ${items.map(item => item.exerciseId).join(', ')}`);
    }

    return { errors, warnings, translations, candidates, taxonomyRows };
}

async function loadDbState(client) {
    const schema = await client.query(
        `SELECT to_regclass('public.exercise_translations') IS NOT NULL AS has_translations`
    );
    if (!schema.rows[0]?.has_translations) {
        throw new Error('exercise_translations no existe. Ejecuta run-migration-016.js primero.');
    }

    const library = await client.query(
        `SELECT id, dataset_id, name, muscle_category, body_part, equipment,
                target_muscle, muscle_group, secondary_muscles
           FROM exercise_library
          ORDER BY id`
    );
    const translations = await client.query(
        `SELECT exercise_id, name, status, source, confidence, notes
           FROM exercise_translations
          WHERE locale = 'es'`
    );

    return {
        libraryById: new Map(library.rows.map(row => [Number(row.id), row])),
        translationsByExercise: new Map(translations.rows.map(row => [Number(row.exercise_id), row])),
    };
}

function validateAgainstDb(plan, db) {
    const errors = [...plan.errors];
    const warnings = [...plan.warnings];

    for (const item of plan.translations) {
        const row = db.libraryById.get(item.exerciseId);
        if (!row) {
            errors.push(`id ${item.exerciseId}: no existe en exercise_library.`);
            continue;
        }
        if (item.datasetId && row.dataset_id && String(row.dataset_id) !== String(item.datasetId)) {
            warnings.push(`id ${item.exerciseId}: dataset_id ${item.datasetId} en CSV, ${row.dataset_id} en BD (se mantiene el id de la fila).`);
        }
    }

    for (const item of plan.taxonomyRows) {
        if (!db.libraryById.has(item.exerciseId)) {
            errors.push(`Taxonomía · id ${item.exerciseId}: no existe en exercise_library.`);
        }
    }

    return { errors, warnings };
}

function addCanonicalTranslations(plan, db) {
    const covered = new Set(plan.translations.map(item => item.exerciseId));
    let added = 0;
    for (const row of db.libraryById.values()) {
        const exerciseId = Number(row.id);
        if (covered.has(exerciseId) || db.translationsByExercise.has(exerciseId)) continue;
        plan.translations.push({
            exerciseId,
            datasetId: row.dataset_id,
            name: row.name,
            confidence: 'alta',
            notes: 'Fila canónica ya en español; traducción identidad.',
            source: 'canonical',
            taxonomy: null,
        });
        covered.add(exerciseId);
        added++;
    }
    return added;
}

function buildTaxonomyChanges(plan, db) {
    const changes = [];
    for (const item of plan.taxonomyRows) {
        const current = db.libraryById.get(item.exerciseId);
        if (!current) continue;

        const next = item.taxonomy;
        const nextSecondary = Array.isArray(next.secondary_muscles)
            ? next.secondary_muscles
            : null;
        const currentSecondary = JSON.stringify(current.secondary_muscles ?? []);
        const secondaryChanged = nextSecondary !== null
            && JSON.stringify(nextSecondary) !== currentSecondary;

        const fields = ['muscle_category', 'body_part', 'equipment', 'target_muscle', 'muscle_group'];
        const changedFields = fields.filter(field => next[field] != null && next[field] !== current[field]);
        if (secondaryChanged) changedFields.push('secondary_muscles');
        if (changedFields.length === 0) continue;

        changes.push({ exerciseId: item.exerciseId, fields: changedFields, next });
    }
    return changes;
}

async function applyPlan(client, plan, taxonomyChanges) {
    const summary = { inserted: 0, updated: 0, skipped: 0, candidates: 0, taxonomyUpdated: 0 };
    await client.query("SET LOCAL statement_timeout = '60000ms'");

    // Batch the 1324 translations: one round-trip per 100 rows instead of one
    // per row. A remote Railway database otherwise spends minutes on latency.
    const TRANSLATION_BATCH = 100;
    for (let offset = 0; offset < plan.translations.length; offset += TRANSLATION_BATCH) {
        const chunk = plan.translations.slice(offset, offset + TRANSLATION_BATCH);
        const params = [];
        const values = chunk.map((item, index) => {
            const base = index * 6;
            params.push(
                item.exerciseId,
                item.name,
                normalizeName(item.name),
                item.source,
                item.confidence,
                item.notes || null
            );
            return `($${base + 1}::int, 'es', $${base + 2}, $${base + 3}, NULL, '[]'::jsonb, 'published', $${base + 4}, $${base + 5}, $${base + 6})`;
        }).join(', ');

        await client.query(
            `INSERT INTO exercise_translations
               (exercise_id, locale, name, name_norm, instructions, instruction_steps, status, source, confidence, notes)
             VALUES ${values}
             ON CONFLICT (exercise_id, locale) DO UPDATE
                SET name = EXCLUDED.name,
                    name_norm = EXCLUDED.name_norm,
                    instructions = EXCLUDED.instructions,
                    instruction_steps = EXCLUDED.instruction_steps,
                    status = EXCLUDED.status,
                    source = EXCLUDED.source,
                    confidence = EXCLUDED.confidence,
                    notes = EXCLUDED.notes`,
            params
        );

        for (const item of chunk) {
            if (plan.existingTranslations.has(item.exerciseId)) summary.updated++;
            else summary.inserted++;
        }
        console.log(`   … ${Math.min(offset + TRANSLATION_BATCH, plan.translations.length)}/${plan.translations.length} traducciones`);
    }

    // One UPDATE … FROM (VALUES …) for every taxonomy row.
    if (taxonomyChanges.length > 0) {
        const params = [];
        const values = taxonomyChanges.map((change, index) => {
            const base = index * 7;
            const next = change.next;
            params.push(
                change.exerciseId,
                next.muscle_category || null,
                next.body_part || null,
                next.equipment || null,
                next.target_muscle || null,
                next.muscle_group || null,
                Array.isArray(next.secondary_muscles) ? JSON.stringify(next.secondary_muscles) : null
            );
            return `($${base + 1}::int, $${base + 2}::text, $${base + 3}::text, $${base + 4}::text, $${base + 5}::text, $${base + 6}::text, $${base + 7}::jsonb)`;
        }).join(', ');

        await client.query(
            `UPDATE exercise_library AS el
                SET muscle_category = COALESCE(v.muscle_category, el.muscle_category),
                    body_part = COALESCE(v.body_part, el.body_part),
                    equipment = COALESCE(v.equipment, el.equipment),
                    target_muscle = COALESCE(v.target_muscle, el.target_muscle),
                    muscle_group = COALESCE(v.muscle_group, el.muscle_group),
                    secondary_muscles = COALESCE(v.secondary_muscles, el.secondary_muscles)
               FROM (VALUES ${values}) AS v(id, muscle_category, body_part, equipment, target_muscle, muscle_group, secondary_muscles)
              WHERE el.id = v.id`,
            params
        );
        summary.taxonomyUpdated = taxonomyChanges.length;
    }

    // Orphans: 8 rows, keep them in the review queue (never invent an id).
    if (plan.candidates.length > 0) {
        const params = [];
        const values = plan.candidates.map((candidate, index) => {
            const base = index * 4;
            params.push(
                candidate.datasetId,
                candidate.name,
                normalizeName(candidate.name),
                candidate.notes || null
            );
            return `($${base + 1}, 'es', $${base + 2}, $${base + 3}, 'pending', $${base + 4})`;
        }).join(', ');

        await client.query(
            `INSERT INTO exercise_translation_candidates
               (dataset_id, locale, name, name_norm, status, notes)
             VALUES ${values}
             ON CONFLICT (dataset_id, locale) WHERE dataset_id IS NOT NULL
             DO UPDATE SET name = EXCLUDED.name,
                           name_norm = EXCLUDED.name_norm,
                           notes = EXCLUDED.notes,
                           updated_at = CURRENT_TIMESTAMP`,
            params
        );
        summary.candidates = plan.candidates.length;
    }

    return summary;
}

async function writeSnapshot(client, plan, target) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const ids = [...new Set(plan.translations.map(item => item.exerciseId))];
    const result = await client.query(
        `SELECT * FROM exercise_translations
          WHERE locale = 'es' AND exercise_id = ANY($1::int[])
          ORDER BY exercise_id`,
        [ids]
    );
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = path.join(BACKUP_DIR, `exercise_translations_before_${stamp}.json`);
    fs.writeFileSync(file, JSON.stringify({
        capturedAt: new Date().toISOString(),
        target,
        rowCount: result.rows.length,
        rows: result.rows,
    }, null, 2), 'utf8');
    return file;
}

function writeReport(report) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = path.join(BACKUP_DIR, `exercise_translation_import_${stamp}.json`);
    fs.writeFileSync(file, JSON.stringify(report, null, 2), 'utf8');
    return file;
}

async function main() {
    for (const file of [TABLE1_FILE, TABLE2_FILE]) {
        if (!fs.existsSync(file)) {
            console.error(`❌ No existe ${path.relative(ROOT, file)}`);
            process.exit(1);
        }
    }

    const table1 = table2Only ? [] : readCsv(TABLE1_FILE);
    const table2 = readCsv(TABLE2_FILE);
    const plan = buildPlan(table1, table2);

    console.log('📚 Importador de traducciones de ejercicios');
    console.log(`   Tabla 1: ${table1.length} filas · Tabla 2: ${table2.length} filas`);
    console.log(`   Traducciones: ${plan.translations.length} · Huérfanos: ${plan.candidates.length}`);

    const report = {
        generatedAt: new Date().toISOString(),
        mode: offline ? 'offline' : (apply ? 'apply' : 'dry-run'),
        target: 'offline',
        files: {
            table1: path.relative(ROOT, TABLE1_FILE),
            table2: path.relative(ROOT, TABLE2_FILE),
        },
        counts: {
            table1Rows: table1.length,
            table2Rows: table2.length,
            translationRows: plan.translations.length,
            orphanCandidates: plan.candidates.length,
            canonicalAdded: 0,
            taxonomyRows: plan.taxonomyRows.length,
            taxonomyChanges: 0,
            inserted: 0,
            updated: 0,
            skipped: 0,
            candidates: 0,
            taxonomyUpdated: 0,
        },
        corrections: Array.from(NAME_OVERRIDES.entries()).map(([id, name]) => ({ id, name })),
        errors: plan.errors,
        warnings: plan.warnings,
        snapshot: null,
        reportFile: null,
    };

    if (offline) {
        report.errors = [...plan.errors];
        report.reportFile = path.relative(ROOT, writeReport(report));
        printSummary(report);
        process.exitCode = plan.errors.length > 0 ? 1 : 0;
        return;
    }

    const connectionString = resolveConnectionString();
    if (!connectionString) {
        console.error('❌ No hay cadena de conexión. Usa DATABASE_URL, --production o --offline.');
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
            console.error(`❌ No se pudo conectar a ${describeTarget(connectionString)}: ${err.message}`);
            process.exitCode = 1;
            return;
        }

        report.target = useProduction ? 'production' : 'staging';
        const db = await loadDbState(client);
        plan.existingTranslations = db.translationsByExercise;

        const validation = validateAgainstDb(plan, db);
        plan.errors = validation.errors;
        plan.warnings = validation.warnings;
        report.errors = validation.errors;
        report.warnings = validation.warnings;

        if (includeCanonical) {
            report.counts.canonicalAdded = addCanonicalTranslations(plan, db);
        }
        report.counts.translationRows = plan.translations.length;

        const taxonomyChanges = withTaxonomy ? buildTaxonomyChanges(plan, db) : [];
        report.counts.taxonomyChanges = taxonomyChanges.length;
        if (withTaxonomy && taxonomyChanges.length > 0) {
            console.log(`🧬 Taxonomía: ${taxonomyChanges.length} fila(s) cambiarían.`);
        }

        if (plan.errors.length > 0) {
            report.reportFile = path.relative(ROOT, writeReport(report));
            printSummary(report);
            process.exitCode = 1;
            return;
        }


        if (apply) {
            const snapshot = await writeSnapshot(client, plan, report.target);
            report.snapshot = path.relative(ROOT, snapshot);
            console.log(`💾 Snapshot: ${report.snapshot}`);
        }

        await client.query('BEGIN');
        let summary;
        try {
            summary = await applyPlan(client, plan, taxonomyChanges);
            if (apply) {
                await client.query('COMMIT');
                console.log('✅ Cambios confirmados.');
            } else {
                await client.query('ROLLBACK');
                console.log('🧪 Dry run: cambios revertidos.');
            }
        } catch (err) {
            try { await client.query('ROLLBACK'); } catch { /* ignore */ }
            throw err;
        }

        report.counts.inserted = summary.inserted;
        report.counts.updated = summary.updated;
        report.counts.skipped = summary.skipped;
        report.counts.candidates = summary.candidates;
        report.counts.taxonomyUpdated = summary.taxonomyUpdated;
        report.reportFile = path.relative(ROOT, writeReport(report));
        printSummary(report);
    } catch (err) {
        console.error('❌ Import failed:', err.message);
        report.errors.push(err.message);
        report.reportFile = path.relative(ROOT, writeReport(report));
        process.exitCode = 1;
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

function printSummary(report) {
    const c = report.counts;
    console.log('');
    console.log(`📊 ${report.mode.toUpperCase()} · ${report.target}`);
    console.log(`   Traducciones: ${c.translationRows} (${c.inserted} insertadas, ${c.updated} actualizadas)`);
    console.log(`   Huérfanos: ${c.orphanCandidates} en candidatos`);
    console.log(`   Taxonomía: ${c.taxonomyChanges} propuestas, ${c.taxonomyUpdated} aplicadas`);
    if (c.canonicalAdded) console.log(`   Identidad canónica: ${c.canonicalAdded}`);
    console.log(`   Errores: ${report.errors.length} · Avisos: ${report.warnings.length}`);
    for (const error of report.errors.slice(0, 20)) console.log(`   ❌ ${error}`);
    for (const warning of report.warnings.slice(0, 20)) console.log(`   ⚠️  ${warning}`);
    if (report.errors.length > 20) console.log(`   … ${report.errors.length - 20} errores más en el reporte`);
    if (report.warnings.length > 20) console.log(`   … ${report.warnings.length - 20} avisos más en el reporte`);
    if (report.snapshot) console.log(`   Snapshot: ${report.snapshot}`);
    if (report.reportFile) console.log(`   Reporte: ${report.reportFile}`);
    if (!apply && !offline) console.log('👉 Vuelve a ejecutar con --apply para escribir.');
}

main();
