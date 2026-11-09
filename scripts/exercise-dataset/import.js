// scripts/exercise-dataset/import.js
//
// Imports the hasaneyldrm/exercises-dataset into `exercise_library`:
//   - rows that already exist in the coach catalog are ENRICHED in place
//     (same id, same Spanish name) with muscles, GIF/thumbnail file names and
//     Spanish instructions;
//   - the remaining dataset records are INSERTED with source = 'dataset'.
//
// Nothing is written until the review file has been inspected:
//
//   node scripts/exercise-dataset/import.js --dry-run   (default, safe)
//   node scripts/exercise-dataset/import.js --apply     (writes to DATABASE_URL)
//
// Options:
//   --dataset=<path>  dataset JSON (default: ../exercises-dataset-main/data/exercises.json)
//   --report=<path>   markdown report (default: frontend/data/DATASET_MATCH_REVIEW.md)
//
// Review file `scripts/exercise-dataset/match-overrides.json` can veto or force
// a match without touching the code:
//   { "exclude": ["0454"], "include": { "CURL ARAÑA": "0454" } }

require('dotenv').config({ quiet: true });

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const lib = require('./lib');

const DEFAULT_DATASET = 'C:/Users/admin/Documents/GitHub/exercises-dataset-main/data/exercises.json';
const REPORT_PATH = path.join(__dirname, '..', '..', 'frontend', 'data', 'DATASET_MATCH_REVIEW.md');
const PLAN_PATH = path.join(__dirname, 'last-plan.json');
const OVERRIDES_PATH = path.join(__dirname, 'match-overrides.json');

const args = process.argv.slice(2);
const applyChanges = args.includes('--apply');
const verifyOnly = args.includes('--verify');
const datasetPath = (args.find(arg => arg.startsWith('--dataset=')) ?? '').split('=')[1] || DEFAULT_DATASET;
const reportPath = (args.find(arg => arg.startsWith('--report=')) ?? '').split('=')[1] || REPORT_PATH;

/** Maps one dataset record to the exercise_library columns. */
function toRow(record) {
    return {
        datasetId: record.id,
        name: lib.cleanDatasetName(record.name),
        nameNorm: lib.normalizeExerciseName(record.name),
        muscleCategory: lib.categoryForDataset(record),
        bodyPart: record.body_part ?? null,
        equipment: record.equipment ?? null,
        targetMuscle: record.target ?? null,
        muscleGroup: record.muscle_group ?? null,
        secondaryMuscles: record.secondary_muscles ?? [],
        gifFile: record.gif_url ? path.basename(record.gif_url) : null,
        thumbFile: record.image ? path.basename(record.image) : null,
        instructionsEs: record.instructions?.es ?? null,
        instructionsEn: record.instructions?.en ?? null,
        instructionStepsEs: record.instruction_steps?.es ?? [],
        attribution: record.attribution ?? null,
    };
}

/** Loads the dataset, dropping duplicate names (the dataset repeats a few). */
function loadDataset(file) {
    const records = JSON.parse(fs.readFileSync(file, 'utf8'));
    const byName = new Map();
    const duplicates = [];

    for (const record of records) {
        const key = lib.normalizeExerciseName(record.name);
        if (byName.has(key)) {
            duplicates.push({ kept: byName.get(key).id, dropped: record.id, name: record.name });
            continue;
        }
        byName.set(key, record);
    }

    return { records: [...byName.values()], duplicates, total: records.length };
}

function loadOverrides() {
    if (!fs.existsSync(OVERRIDES_PATH)) return { exclude: new Set(), include: new Map() };
    const raw = JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf8'));
    return {
        exclude: new Set(raw.exclude ?? []),
        include: new Map(Object.entries(raw.include ?? {}).map(([name, id]) => [lib.normalizeExerciseName(name), String(id)])),
    };
}


/**
 * Builds the import plan: catalog enrichments, dataset inserts and the review
 * buckets (ambiguous / unmatched / conflicts).
 */
function buildPlan(catalog, datasetRecords, overrides) {
    const byId = new Map(datasetRecords.map(record => [record.id, record]));
    const claimed = new Map();
    const matched = [];
    const ambiguous = [];
    const unmatched = [];
    const conflicts = [];

    for (const row of catalog) {
        const forcedId = overrides.include.get(lib.normalizeExerciseName(row.name));
        let record = null;
        let reason = null;

        if (forcedId) {
            record = byId.get(forcedId) ?? null;
            if (!record) reason = 'override-missing';
        } else {
            const result = lib.matchCatalogRow(row, datasetRecords);
            record = result.record ?? null;
            reason = result.reason ?? null;
            if (!record && result.candidates) ambiguous.push({ row, candidates: result.candidates });
        }

        if (record && overrides.exclude.has(record.id)) {
            record = null;
            reason = 'excluded-by-override';
        }

        if (record) {
            const owner = claimed.get(record.id);
            if (owner) {
                conflicts.push({ row, record, owner });
                record = null;
                reason = 'already-claimed';
            }
        }

        if (record) {
            claimed.set(record.id, row.name);
            matched.push({ row, dataset: toRow(record) });
        } else if (!ambiguous.some(item => item.row.id === row.id)) {
            unmatched.push({ row, reason: reason ?? 'no-match' });
        }
    }

    const catalogNames = new Set(catalog.map(row => lib.normalizeExerciseName(row.name)));
    // A catalog row may already own a dataset record whose English name never
    // reaches the catalog (CAMINADORA → 3666 "walking on incline treadmill").
    // Inserting those records again would duplicate the GIF and instructions.
    const linkedDatasetIds = new Set(catalog.map(row => (row.dataset_id ? String(row.dataset_id) : '')).filter(Boolean));
    const inserts = datasetRecords
        .filter(record => !claimed.has(record.id))
        .filter(record => !linkedDatasetIds.has(String(record.id)))
        .filter(record => !catalogNames.has(lib.normalizeExerciseName(record.name)))
        .map(toRow);

    return { matched, ambiguous, unmatched, conflicts, inserts };
}

/** Writes the human review file (and a machine-readable plan for the media sync). */
function writeReport({ plan, datasetMeta, catalogCount }) {
    const lines = [];
    const today = new Date().toISOString().slice(0, 10);

    lines.push('# Dataset match review', '');
    lines.push(`Generado: ${today} · dry run sobre \`exercise_library\` (${catalogCount} filas de catálogo).`, '');
    lines.push('| Resultado | Filas |', '| --- | --- |');
    lines.push(`| Datos del dataset leídos | ${datasetMeta.total} (${datasetMeta.duplicates.length} nombres duplicados descartados) |`);
    lines.push(`| Catálogo enriquecido (UPDATE) | ${plan.matched.length} |`);
    lines.push(`| Nuevos ejercicios (INSERT) | ${plan.inserts.length} |`);
    lines.push(`| Ambiguos (revisión manual) | ${plan.ambiguous.length} |`);
    lines.push(`| Sin equivalente en el dataset | ${plan.unmatched.length} |`);
    lines.push(`| Conflictos (mismo registro para 2 filas) | ${plan.conflicts.length} |`);
    lines.push('');
    lines.push('> Para corregir cualquier match edita `scripts/exercise-dataset/match-overrides.json`');
    lines.push('> y vuelve a ejecutar el dry run. `--apply` escribe en `DATABASE_URL`.', '');

    const groups = new Map();
    for (const item of plan.matched) {
        const key = item.row.muscle_category || 'SIN CATEGORÍA';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(item);
    }

    lines.push('## Catálogo enriquecido', '');
    for (const [category, items] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        lines.push(`### ${category}`, '');
        lines.push('| Ejercicio del catálogo | Registro del dataset | Músculo objetivo |', '| --- | --- | --- |');
        for (const item of items) {
            lines.push(`| ${item.row.name} | ${item.dataset.datasetId} · ${item.dataset.name} | ${item.dataset.targetMuscle} |`);
        }
        lines.push('');
    }

    if (plan.ambiguous.length > 0) {
        lines.push('## Ambiguos — requieren decisión manual', '');
        for (const item of plan.ambiguous) {
            lines.push(`- **${item.row.name}** (${item.row.muscle_category || 'sin categoría'}): ${item.candidates.join(' · ')}`);
        }
        lines.push('');
    }

    if (plan.conflicts.length > 0) {
        lines.push('## Conflictos — dos filas apuntan al mismo registro', '');
        for (const item of plan.conflicts) {
            lines.push(`- **${item.row.name}** quería ${item.record.id} · ${lib.cleanDatasetName(item.record.name)} (ya usado por ${item.owner})`);
        }
        lines.push('');
    }

    lines.push('## Sin equivalente en el dataset', '');
    for (const item of plan.unmatched) {
        lines.push(`- ${item.row.name} (${item.row.muscle_category || 'sin categoría'}) — ${item.reason}`);
    }
    lines.push('');

    const insertGroups = new Map();
    for (const row of plan.inserts) {
        if (!insertGroups.has(row.muscleCategory)) insertGroups.set(row.muscleCategory, []);
        insertGroups.get(row.muscleCategory).push(row);
    }
    lines.push('## Nuevos ejercicios por categoría', '');
    lines.push('| Categoría | Nuevos |', '| --- | --- |');
    for (const [category, rows] of [...insertGroups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        lines.push(`| ${category} | ${rows.length} |`);
    }
    lines.push('');

    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');
    fs.writeFileSync(PLAN_PATH, JSON.stringify({
        generatedAt: new Date().toISOString(),
        matched: plan.matched.map(item => ({ catalogId: item.row.id, catalogName: item.row.name, datasetId: item.dataset.datasetId })),
        inserts: plan.inserts.map(row => ({
            datasetId: row.datasetId,
            name: row.name,
            category: row.muscleCategory,
            gif: row.gifFile,
            thumb: row.thumbFile,
        })),
    }, null, 2), 'utf8');
}

const INSERT_TUPLE = ($n) => `($${$n}, $${$n + 1}, $${$n + 2}, 'dataset', $${$n + 3}, $${$n + 4}, $${$n + 5}, $${$n + 6}, $${$n + 7}, $${$n + 8}::jsonb, $${$n + 9}, $${$n + 10}, $${$n + 11}, $${$n + 12}, $${$n + 13}::jsonb, $${$n + 14}, TRUE)`;

const INSERT_COLUMNS = `
    name, name_norm, muscle_category, source, dataset_id, body_part,
    equipment, target_muscle, muscle_group, secondary_muscles, gif_file, thumb_file,
    instructions_es, instructions_en, instruction_steps_es, media_attribution, is_active
`;

/** Inserts a batch of rows in one round trip (15 parameters per row). */
async function insertBatch(client, rows) {
    const values = [];
    const params = [];

    rows.forEach((row, index) => {
        values.push(INSERT_TUPLE(index * 15 + 1));
        params.push(
            row.name,
            row.nameNorm,
            row.muscleCategory,
            row.datasetId,
            row.bodyPart,
            row.equipment,
            row.targetMuscle,
            row.muscleGroup,
            JSON.stringify(row.secondaryMuscles),
            row.gifFile,
            row.thumbFile,
            row.instructionsEs,
            row.instructionsEn,
            JSON.stringify(row.instructionStepsEs),
            row.attribution,
        );
    });

    const sql = `
        INSERT INTO exercise_library (${INSERT_COLUMNS})
        VALUES ${values.join(', ')}
        ON CONFLICT (name_norm) DO NOTHING
    `;

    const result = await client.query(sql, params);
    return result.rowCount;
}

const BULK_UPDATE_SQL = `
    UPDATE exercise_library AS e SET
        dataset_id           = v.dataset_id,
        body_part            = v.body_part,
        equipment            = v.equipment,
        target_muscle        = v.target_muscle,
        muscle_group         = v.muscle_group,
        secondary_muscles    = v.secondary_muscles::jsonb,
        gif_file             = v.gif_file,
        thumb_file           = v.thumb_file,
        instructions_es      = v.instructions_es,
        instructions_en      = v.instructions_en,
        instruction_steps_es = v.instruction_steps_es::jsonb,
        media_attribution    = v.media_attribution
    FROM unnest(
        $1::int[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[],
        $8::text[], $9::text[], $10::text[], $11::text[], $12::text[], $13::text[]
    ) AS v(
        id, dataset_id, body_part, equipment, target_muscle, muscle_group,
        secondary_muscles, gif_file, thumb_file, instructions_es, instructions_en,
        instruction_steps_es, media_attribution
    )
    WHERE e.id = v.id
`;

/**
 * Enriches every matched catalog row in a single round trip.
 * `name_norm` is intentionally NOT touched: the coach's Spanish name stays the
 * searchable identity of the row (the English dataset name lives in dataset_id
 * and in the inserted rows).
 */
async function updateMatches(client, matched) {
    if (matched.length === 0) return 0;

    const columns = Array.from({ length: 13 }, () => []);
    for (const item of matched) {
        const row = item.dataset;
        columns[0].push(item.row.id);
        columns[1].push(row.datasetId);
        columns[2].push(row.bodyPart);
        columns[3].push(row.equipment);
        columns[4].push(row.targetMuscle);
        columns[5].push(row.muscleGroup);
        columns[6].push(JSON.stringify(row.secondaryMuscles));
        columns[7].push(row.gifFile);
        columns[8].push(row.thumbFile);
        columns[9].push(row.instructionsEs);
        columns[10].push(row.instructionsEn);
        columns[11].push(JSON.stringify(row.instructionStepsEs));
        columns[12].push(row.attribution);
    }

    const result = await client.query(BULK_UPDATE_SQL, columns);
    return result.rowCount;
}

/** Recomputes the normalized name of the coach rows (they must stay searchable). */
async function restoreCatalogNameNorm(client) {
    await client.query(`
        UPDATE exercise_library
           SET name_norm = btrim(regexp_replace(
                 translate(lower(name), 'áàäâãéèëêíìïîóòöôõúùüûñçýÿ', 'aaaaaeeeeiiiiooooouuuuncyy'),
                 '[^a-z0-9]+', ' ', 'g'))
         WHERE source IS DISTINCT FROM 'dataset'
           AND name_norm IS DISTINCT FROM btrim(regexp_replace(
                 translate(lower(name), 'áàäâãéèëêíìïîóòöôõúùüûñçýÿ', 'aaaaaeeeeiiiiooooouuuuncyy'),
                 '[^a-z0-9]+', ' ', 'g'))
    `);
}

/** Applies the plan inside one transaction (or rolls it back with --verify). */
async function applyPlan(pool, plan, { rollback = false } = {}) {
    const client = await pool.connect();
    let updated = 0;
    let inserted = 0;
    let skipped = 0;

    try {
        await client.query('BEGIN');

        updated = await updateMatches(client, plan.matched);
        await restoreCatalogNameNorm(client);
        const BATCH_SIZE = 100;
        for (let index = 0; index < plan.inserts.length; index += BATCH_SIZE) {
            const batch = plan.inserts.slice(index, index + BATCH_SIZE);
            const insertedRows = await insertBatch(client, batch);
            inserted += insertedRows;
            skipped += batch.length - insertedRows;
        }

        if (rollback) {
            await client.query('ROLLBACK');
            console.log(`\n🧪 Verificación: ${updated} filas habrían cambiado, ${inserted} se habrían insertado (ROLLBACK, nada escrito).`);
        } else {
            await client.query('COMMIT');
            console.log(`\n✅ Import aplicado: ${updated} filas enriquecidas, ${inserted} insertadas, ${skipped} omitidas (nombre ya existente).`);
        }
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function main() {
    if (!fs.existsSync(datasetPath)) {
        console.error(`❌ Dataset not found: ${datasetPath}`);
        process.exit(1);
    }

    const datasetMeta = loadDataset(datasetPath);
    const overrides = loadOverrides();
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

    try {
        const catalog = (await pool.query(`
            SELECT id, name, muscle_category, dataset_id
              FROM exercise_library
             WHERE source IS DISTINCT FROM 'dataset'
             ORDER BY muscle_category, name
        `)).rows;

        console.log(`📚 Catálogo: ${catalog.length} filas · Dataset: ${datasetMeta.total} registros (${datasetMeta.records.length} únicos)`);

        // Real muscle groups claim their dataset record before the coach buckets
        // (a warm-up "LEG EXTENSION" must not steal the main "LEG EXTENSION").
        const bucketFirst = new Set(['CALENTAMIENTO', 'EN CASA', 'TERAPIA', 'Yoga', '']);
        catalog.sort((a, b) => {
            const priorityA = bucketFirst.has(a.muscle_category) ? 1 : 0;
            const priorityB = bucketFirst.has(b.muscle_category) ? 1 : 0;
            // The plain name wins over a parenthesised variant ("CURL MARTILLO
            // BILATERAL" before "CURL MARTILLO (ENFOQUE BRAQUIAL)").
            const parenA = a.name.includes('(') ? 1 : 0;
            const parenB = b.name.includes('(') ? 1 : 0;
            return priorityA - priorityB
                || parenA - parenB
                || String(a.muscle_category).localeCompare(String(b.muscle_category))
                || a.name.localeCompare(b.name);
        });

        const plan = buildPlan(catalog, datasetMeta.records, overrides);
        writeReport({ plan, datasetMeta, catalogCount: catalog.length });

        console.log(`🤝 Enriquecidos: ${plan.matched.length}`);
        console.log(`➕ Nuevos:       ${plan.inserts.length}`);
        console.log(`❓ Ambiguos:     ${plan.ambiguous.length}`);
        console.log(`🚫 Sin match:    ${plan.unmatched.length}`);
        console.log(`⚠️  Conflictos:   ${plan.conflicts.length}`);
        console.log(`📝 Reporte: ${reportPath}`);

        if (applyChanges) {
            await applyPlan(pool, plan);
        } else if (verifyOnly) {
            await applyPlan(pool, plan, { rollback: true });
        } else {
            console.log('\nℹ️  Dry run: no se escribió nada. Revisa el reporte y ejecuta con --apply.');
        }
    } catch (error) {
        console.error('❌ Import failed:', error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

main();
