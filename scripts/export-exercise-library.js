#!/usr/bin/env node
// scripts/export-exercise-library.js
//
// One-off exporter: joins the live `exercise_library` (production or staging)
// with exercises-dataset-main and Dupla-exercises-media, and writes a
// self-contained bundle so another model can rename/translate the library
// without touching a single ID.
//
// Usage:
//   node scripts/export-exercise-library.js
//   node scripts/export-exercise-library.js --source=staging
//   node scripts/export-exercise-library.js --source=production --out=exports/mi-carpeta
//
// Read-only: it never writes to the database.

'use strict';

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const { normalizeExerciseName, cleanDatasetName, categoryForDataset } = require('./exercise-dataset/lib');

const ROOT = path.join(__dirname, '..');
const DEFAULT_DATASET_DIR = process.env.EXERCISE_DATASET_DIR || 'C:/Users/admin/Documents/GitHub/exercises-dataset-main';
const DEFAULT_MEDIA_DIR = 'C:/Users/admin/Documents/GitHub/Dupla-exercises-media';
const DEFAULT_KEVIN_CSV = path.join(ROOT, 'Copia de BASE DE DATOS DE EJERCICIOS Kevin.csv');
const JSDELIVR_BASE = 'https://cdn.jsdelivr.net/gh/vcmxs/Dupla-exercises-media@d3e64b9f1e1dab64150e81b845f0e30e88dd719a';
const SNAPSHOT = { total: 1403, old: 165, new: 1238, orphans: 8, dataset: 1324 };

function argValue(name, fallback) {
    const prefix = `--${name}=`;
    const found = process.argv.slice(2).find(arg => arg.startsWith(prefix));
    return found ? found.slice(prefix.length) : fallback;
}

const SOURCE = String(argValue('source', 'production')).toLowerCase();
const DATASET_DIR = path.resolve(argValue('dataset', DEFAULT_DATASET_DIR));
const MEDIA_DIR = path.resolve(argValue('media', DEFAULT_MEDIA_DIR));
const KEVIN_CSV = path.resolve(argValue('kevin', DEFAULT_KEVIN_CSV));
function localDateStamp() {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

const OUT_DIR = path.resolve(argValue('out', path.join(ROOT, 'exports', `biblioteca-ejercicios-${localDateStamp()}`)));
const SKIP_COMPARE = process.argv.includes('--skip-compare');

// ── small helpers ────────────────────────────────────────────────────────────

function text(value) {
    return value == null ? '' : String(value).trim();
}

function oneLine(value) {
    return text(value).replace(/\s+/g, ' ').trim();
}

function asArray(value) {
    if (Array.isArray(value)) return value.map(item => text(item)).filter(Boolean);
    if (value == null || value === '') return [];
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return parsed.map(item => text(item)).filter(Boolean);
        } catch (_) { /* not JSON: fall back to splitting */ }
        return value.split(/[,;|]/).map(item => item.trim()).filter(Boolean);
    }
    return [text(value)].filter(Boolean);
}

function isoDate(value) {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function csvCell(value, delimiter) {
    let raw = value;
    if (Array.isArray(raw)) raw = raw.join(' | ');
    else if (raw && typeof raw === 'object') raw = JSON.stringify(raw);
    const string = raw == null ? '' : String(raw);
    const needsQuotes = string.includes(delimiter) || string.includes('"') || /[\r\n]/.test(string);
    return needsQuotes ? `"${string.replace(/"/g, '""')}"` : string;
}

function writeCsv(file, headers, rows, delimiter = ';') {
    const lines = [headers.join(delimiter)];
    for (const row of rows) {
        lines.push(headers.map(header => csvCell(row[header], delimiter)).join(delimiter));
    }
    // UTF-8 BOM so Excel (es-ES) shows the accents; `;` because the app is Spanish.
    fs.writeFileSync(file, '\uFEFF' + lines.join('\r\n') + '\r\n', 'utf8');
}
/** Minimal RFC-4180 parser (quotes, embedded delimiters/newlines, BOM). */
function parseCsv(content, delimiter = ',') {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;
    for (let index = 0; index < content.length; index += 1) {
        const char = content[index];
        if (quoted) {
            if (char === '"' && content[index + 1] === '"') { field += '"'; index += 1; }
            else if (char === '"') quoted = false;
            else field += char;
        } else if (char === '"') quoted = true;
        else if (char === delimiter) { row.push(field); field = ''; }
        else if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
        else if (char !== '\r') field += char;
    }
    if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
    if (rows.length > 0 && rows[0].length > 0) rows[0][0] = rows[0][0].replace(/^\uFEFF/, '');
    return rows.filter(cells => cells.some(cell => cell !== ''));
}

function countBy(items, key) {
    const counts = new Map();
    for (const item of items) {
        const value = item[key] || '(vacío)';
        counts.set(value, (counts.get(value) || 0) + 1);
    }
    return Object.fromEntries([...counts.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]), 'es')));
}

function uniqueSorted(values) {
    return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'es'));
}

// ── load the static sources ──────────────────────────────────────────────────

function readJson(file, label) {
    if (!fs.existsSync(file)) throw new Error(`${label} not found: ${file}`);
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const datasetFile = path.join(DATASET_DIR, 'data', 'exercises.json');
const manifestFile = path.join(MEDIA_DIR, 'manifest.json');
const dataset = readJson(datasetFile, 'Dataset JSON');
const manifest = readJson(manifestFile, 'Media manifest');
const manifestById = new Map(manifest.map(entry => [String(entry.id), entry]));
const datasetById = new Map(dataset.map(entry => [String(entry.id), entry]));

const GIF_DIR = fs.existsSync(path.join(MEDIA_DIR, 'gif')) ? path.join(MEDIA_DIR, 'gif') : path.join(DATASET_DIR, 'videos');
const THUMB_DIR = fs.existsSync(path.join(MEDIA_DIR, 'thumb')) ? path.join(MEDIA_DIR, 'thumb') : path.join(DATASET_DIR, 'images');

const fileExistsCache = new Map();
function mediaExists(dir, file) {
    if (!file) return false;
    const key = `${dir}|${file}`;
    if (!fileExistsCache.has(key)) fileExistsCache.set(key, fs.existsSync(path.join(dir, file)));
    return fileExistsCache.get(key);
}

// ── Kevin's legacy catalog (CSV) ─────────────────────────────────────────────

const kevinRaw = fs.readFileSync(KEVIN_CSV, 'utf8');
const kevinCells = parseCsv(kevinRaw, ',');
const kevinHeader = (kevinCells.shift() || []).map(cell => cell.trim().toUpperCase());
const kevinEntries = kevinCells.map(cells => ({
    musculo: text(cells[0]),
    nombre: text(cells.length >= 3 ? cells.slice(1, -1).join(',') : cells[1]),
    link: text(cells[cells.length - 1]),
})).filter(entry => entry.nombre);

const kevinByName = new Map();
for (const entry of kevinEntries) {
    const key = normalizeExerciseName(entry.nombre);
    if (!key) continue;
    const list = kevinByName.get(key) || [];
    list.push(entry);
    kevinByName.set(key, list);
}
// ── database ─────────────────────────────────────────────────────────────────

const CONNECTION_STRING = SOURCE === 'staging' ? process.env.DATABASE_URL : process.env.PRODUCTION_DATABASE_URL;
if (!CONNECTION_STRING) {
    console.error(`No connection string for --source=${SOURCE}. Check Api-MVP/.env.`);
    process.exit(1);
}

function makePool(connectionString) {
    return new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        statement_timeout: 120000,
        connectionTimeoutMillis: 20000,
        max: 2,
    });
}

async function fetchRows() {
    const pool = makePool(CONNECTION_STRING);
    try {
        const { rows } = await pool.query('SELECT * FROM exercise_library ORDER BY id');
        let backupCount = null;
        try {
            const backup = await pool.query('SELECT count(*)::int AS n FROM exercise_library_backup_20261106');
            backupCount = backup.rows[0].n;
        } catch (error) {
            backupCount = { error: error.message };
        }
        return { rows, backupCount };
    } finally {
        await pool.end().catch(() => {});
    }
}

async function fetchOtherSnapshot() {
    const otherUrl = SOURCE === 'staging' ? process.env.PRODUCTION_DATABASE_URL : process.env.DATABASE_URL;
    if (!otherUrl || SKIP_COMPARE) return null;
    const pool = makePool(otherUrl);
    try {
        const { rows } = await pool.query('SELECT id, name, source, dataset_id FROM exercise_library ORDER BY id');
        return rows;
    } catch (error) {
        return { error: error.message };
    } finally {
        await pool.end().catch(() => {});
    }
}

/** Row-level diff between the exported DB and the other one. */
function compareSnapshots(primaryRows, otherRows) {
    if (!Array.isArray(otherRows)) {
        return {
            disponible: false,
            error: otherRows?.error || 'no consultada',
            total_esta: primaryRows.length,
            total_otra: null,
            solo_en_esta: [],
            solo_en_otra: [],
            distintas: [],
        };
    }
    const primaryById = new Map(primaryRows.map(row => [row.id, row]));
    const otherById = new Map(otherRows.map(row => [row.id, row]));
    const brief = row => ({ id: row.id, nombre: row.name, source: row.source, dataset_id: row.dataset_id });
    const soloEnEsta = [...primaryById.values()].filter(row => !otherById.has(row.id)).map(brief);
    const soloEnOtra = [...otherById.values()].filter(row => !primaryById.has(row.id)).map(brief);
    const distintas = [];
    for (const [id, row] of primaryById) {
        const other = otherById.get(id);
        if (!other) continue;
        const campos = ['name', 'source', 'dataset_id']
            .filter(field => String(row[field] ?? '') !== String(other[field] ?? ''));
        if (!campos.length) continue;
        distintas.push({
            id,
            nombre: row.name || other.name,
            campos: campos.join(', '),
            esta: campos.map(field => `${field}=${row[field] ?? ''}`).join(' | '),
            otra: campos.map(field => `${field}=${other[field] ?? ''}`).join(' | '),
        });
    }
    return {
        disponible: true,
        total_esta: primaryRows.length,
        total_otra: otherRows.length,
        solo_en_esta: soloEnEsta,
        solo_en_otra: soloEnOtra,
        distintas,
    };
}

// ── dataset name collisions (the reason 8 IDs never made it into the app) ────

const datasetNameGroups = new Map();
for (const entry of dataset) {
    const key = normalizeExerciseName(cleanDatasetName(entry.name));
    const list = datasetNameGroups.get(key) || [];
    list.push(entry);
    datasetNameGroups.set(key, list);
}
const datasetDuplicateGroups = [...datasetNameGroups.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([key, list]) => ({ key, nombre: cleanDatasetName(list[0].name), ids: list.map(entry => String(entry.id)) }));
const datasetIdsWithDuplicateName = new Set(datasetDuplicateGroups.flatMap(group => group.ids));

// ── build one record per app row ─────────────────────────────────────────────

function buildDbRecord(row, datasetIdBuckets) {
    const source = text(row.source) || 'catalog';
    const isNew = source === 'dataset';
    const isOld = !isNew;
    const datasetId = text(row.dataset_id);
    const ds = datasetId ? datasetById.get(datasetId) : null;
    const media = datasetId ? manifestById.get(datasetId) : null;

    const nombreBd = text(row.name);
    const nombreDatasetEn = cleanDatasetName(ds?.name || '');
    const categoriaApp = text(row.muscle_category);
    const bodyPart = text(row.body_part) || text(ds?.body_part);
    const equipo = text(row.equipment) || text(ds?.equipment);
    const musculoObjetivo = text(row.target_muscle) || text(ds?.target);
    const grupoMuscular = text(row.muscle_group) || text(ds?.muscle_group);
    const secundarios = asArray(row.secondary_muscles).length
        ? asArray(row.secondary_muscles)
        : asArray(ds?.secondary_muscles);
    const gifFile = text(row.gif_file) || text(media?.gif);
    const thumbFile = text(row.thumb_file) || text(media?.thumb);
    const instruccionesEs = text(row.instructions_es) || text(ds?.instructions?.es);
    const instruccionesEn = text(row.instructions_en) || text(ds?.instructions?.en);
    const pasosEs = asArray(row.instruction_steps_es).length
        ? asArray(row.instruction_steps_es)
        : asArray(ds?.instruction_steps?.es);

    const taxonomiaCompleta = Boolean(bodyPart && equipo && musculoObjetivo && grupoMuscular && secundarios.length);
    const gifExiste = mediaExists(GIF_DIR, gifFile);
    const thumbExiste = mediaExists(THUMB_DIR, thumbFile);
    const kevinMatches = kevinByName.get(normalizeExerciseName(nombreBd)) || [];
    const kevinFirst = kevinMatches[0];
    const bucket = datasetId ? (datasetIdBuckets.get(datasetId) || []) : [];
    const otherIds = bucket.filter(other => other.id !== row.id).map(other => `${other.id} (${other.name})`);
    const duplicatedNameIds = datasetId && datasetIdsWithDuplicateName.has(datasetId)
        ? (datasetNameGroups.get(normalizeExerciseName(nombreDatasetEn)) || []).map(entry => String(entry.id))
        : [];

    const notas = [];
    if (isOld && !datasetId) notas.push('Viejo sin dataset: sin GIF y sin taxonomía completa');
    if (!categoriaApp) notas.push('Sin categoría en la app');
    if (!gifFile) notas.push('Sin GIF asociado');
    if (gifFile && !gifExiste) notas.push(`GIF no encontrado en disco (${gifFile})`);
    if (!instruccionesEs) notas.push('Sin instrucciones en español');
    if (otherIds.length) notas.push(`dataset_id ${datasetId} compartido con ${otherIds.join(', ')}`);
    if (duplicatedNameIds.length > 1) notas.push(`Nombre duplicado dentro del dataset (IDs ${duplicatedNameIds.join(', ')})`);
    if (kevinMatches.length > 1) notas.push('Nombre duplicado en el CSV de Kevin');
    if (isOld && !taxonomiaCompleta) notas.push('Taxonomía incompleta');

    return {
        id_app: row.id,
        dataset_id: datasetId,
        origen: isNew ? 'nuevo_dataset' : (datasetId ? 'viejo_con_dataset' : 'viejo_catalogo'),
        es_viejo: isOld,
        es_nuevo: isNew,
        en_bd: true,
        idioma_nombre: isOld ? 'es' : 'en',
        nombre_bd: nombreBd,
        nombre_dataset_en: nombreDatasetEn,
        nombre_es_actual: isOld ? nombreBd : '',
        categoria_app: categoriaApp,
        body_part: bodyPart,
        equipo,
        musculo_objetivo: musculoObjetivo,
        grupo_muscular: grupoMuscular,
        musculos_secundarios: secundarios,
        taxonomia_completa: taxonomiaCompleta,
        tiene_gif: Boolean(gifFile),
        gif_archivo: gifFile,
        gif_url: gifFile ? `${JSDELIVR_BASE}/gif/${gifFile}` : '',
        gif_existe_disco: gifExiste,
        tiene_thumb: Boolean(thumbFile),
        thumb_archivo: thumbFile,
        thumb_existe_disco: thumbExiste,
        tiene_instrucciones_es: Boolean(instruccionesEs),
        tiene_instrucciones_en: Boolean(instruccionesEn),
        instrucciones_es: instruccionesEs,
        instrucciones_en: instruccionesEn,
        pasos_es: pasosEs,
        video_url_legacy: text(row.video_url),
        activo: Boolean(row.is_active),
        created_at: isoDate(row.created_at),
        en_csv_kevin: kevinMatches.length > 0,
        csv_musculo: kevinFirst?.musculo || '',
        csv_link: kevinFirst?.link || '',
        duplicado_de: '',
        notas,
    };
}
// ── dataset records that never made it into the app ─────────────────────────

function buildOrphanRecord(entry, dbByNormName) {
    const id = String(entry.id);
    const media = manifestById.get(id);
    const nombreEn = cleanDatasetName(entry.name);
    const gifFile = text(media?.gif);
    const thumbFile = text(media?.thumb);
    const secundarios = asArray(entry.secondary_muscles);
    const instruccionesEs = text(entry.instructions?.es);
    const instruccionesEn = text(entry.instructions?.en);
    const pasosEs = asArray(entry.instruction_steps?.es);
    const gifExiste = mediaExists(GIF_DIR, gifFile);
    const thumbExiste = mediaExists(THUMB_DIR, thumbFile);
    const dupes = dbByNormName.get(normalizeExerciseName(nombreEn)) || [];
    const duplicatedNameIds = datasetIdsWithDuplicateName.has(id)
        ? (datasetNameGroups.get(normalizeExerciseName(nombreEn)) || []).map(item => String(item.id))
        : [];

    const notas = ['Huérfano: dataset_id no importado en la app'];
    if (dupes.length) notas.push(`Mismo nombre que ${dupes.map(item => `id ${item.id_app} (${item.nombre_bd})`).join(', ')}`);
    if (duplicatedNameIds.length > 1) notas.push(`Nombre duplicado dentro del dataset (IDs ${duplicatedNameIds.join(', ')})`);
    if (!gifFile) notas.push('Sin GIF en el manifiesto');
    if (gifFile && !gifExiste) notas.push(`GIF no encontrado en disco (${gifFile})`);

    return {
        id_app: null,
        dataset_id: id,
        origen: 'dataset_huerfano',
        es_viejo: false,
        es_nuevo: true,
        en_bd: false,
        idioma_nombre: 'en',
        nombre_bd: '',
        nombre_dataset_en: nombreEn,
        nombre_es_actual: '',
        categoria_app: categoryForDataset(entry),
        body_part: text(entry.body_part),
        equipo: text(entry.equipment),
        musculo_objetivo: text(entry.target),
        grupo_muscular: text(entry.muscle_group),
        musculos_secundarios: secundarios,
        taxonomia_completa: Boolean(entry.body_part && entry.equipment && entry.target && entry.muscle_group && secundarios.length),
        tiene_gif: Boolean(gifFile),
        gif_archivo: gifFile,
        gif_url: gifFile ? `${JSDELIVR_BASE}/gif/${gifFile}` : '',
        gif_existe_disco: gifExiste,
        tiene_thumb: Boolean(thumbFile),
        thumb_archivo: thumbFile,
        thumb_existe_disco: thumbExiste,
        tiene_instrucciones_es: Boolean(instruccionesEs),
        tiene_instrucciones_en: Boolean(instruccionesEn),
        instrucciones_es: instruccionesEs,
        instrucciones_en: instruccionesEn,
        pasos_es: pasosEs,
        video_url_legacy: '',
        activo: null,
        created_at: '',
        en_csv_kevin: false,
        csv_musculo: '',
        csv_link: '',
        duplicado_de: dupes.map(item => `id ${item.id_app} (${item.nombre_bd})`).join(', '),
        notas,
    };
}

const ORIGIN_RANK = { viejo_catalogo: 0, viejo_con_dataset: 1, nuevo_dataset: 2, dataset_huerfano: 3 };

function sortRecords(records) {
    return records.sort((a, b) => {
        const byOrigin = (ORIGIN_RANK[a.origen] ?? 9) - (ORIGIN_RANK[b.origen] ?? 9);
        if (byOrigin !== 0) return byOrigin;
        const byCategory = String(a.categoria_app).localeCompare(String(b.categoria_app), 'es');
        if (byCategory !== 0) return byCategory;
        const byName = String(a.nombre_bd || a.nombre_dataset_en).localeCompare(String(b.nombre_bd || b.nombre_dataset_en), 'es');
        if (byName !== 0) return byName;
        return String(a.dataset_id).localeCompare(String(b.dataset_id));
    });
}
// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log(`Exporting exercise_library from ${SOURCE}...`);
    const { rows, backupCount } = await fetchRows();
    const otherRows = await fetchOtherSnapshot();
    const comparison = compareSnapshots(rows, otherRows);

    const datasetIdBuckets = new Map();
    for (const row of rows) {
        const datasetId = text(row.dataset_id);
        if (!datasetId) continue;
        const list = datasetIdBuckets.get(datasetId) || [];
        list.push({ id: row.id, name: text(row.name) });
        datasetIdBuckets.set(datasetId, list);
    }
    const duplicateDatasetIds = [...datasetIdBuckets.entries()]
        .filter(([, list]) => list.length > 1)
        .map(([datasetId, list]) => ({ dataset_id: datasetId, filas: list }));

    const dbRecords = rows.map(row => buildDbRecord(row, datasetIdBuckets));
    const dbByNormName = new Map();
    for (const record of dbRecords) {
        const key = normalizeExerciseName(record.nombre_bd);
        const list = dbByNormName.get(key) || [];
        list.push(record);
        dbByNormName.set(key, list);
    }

    const dbDatasetIds = new Set(dbRecords.map(record => record.dataset_id).filter(Boolean));
    const orphanRecords = dataset
        .filter(entry => !dbDatasetIds.has(String(entry.id)))
        .map(entry => buildOrphanRecord(entry, dbByNormName));
    const records = sortRecords([...dbRecords, ...orphanRecords]);

    // ── Kevin CSV reconciliation ─────────────────────────────────────────────
    const dbNormNames = new Set(dbRecords.map(record => normalizeExerciseName(record.nombre_bd)));
    const kevinUnmatched = [...kevinByName.entries()]
        .filter(([key]) => !dbNormNames.has(key))
        .map(([key, list]) => ({ clave: key, nombre: list[0].nombre, musculo: list[0].musculo, veces: list.length }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    const kevinDuplicates = [...kevinByName.entries()]
        .filter(([, list]) => list.length > 1)
        .map(([key, list]) => ({ clave: key, nombre: list[0].nombre, veces: list.length, musculos: uniqueSorted(list.map(item => item.musculo)) }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    const oldMissingKevin = dbRecords
        .filter(record => record.es_viejo && !record.en_csv_kevin)
        .map(record => ({ id_app: record.id_app, nombre: record.nombre_bd, categoria: record.categoria_app }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

    // ── counts ──────────────────────────────────────────────────────────────
    const oldRecords = dbRecords.filter(record => record.es_viejo);
    const newRecords = dbRecords.filter(record => record.es_nuevo);
    const counts = {
        registros_totales: records.length,
        filas_en_bd: rows.length,
        viejos: oldRecords.length,
        viejos_con_dataset: oldRecords.filter(record => record.dataset_id).length,
        viejos_sin_dataset: oldRecords.filter(record => !record.dataset_id).length,
        nuevos_en_bd: newRecords.length,
        huerfanos: orphanRecords.length,
        con_gif: records.filter(record => record.tiene_gif).length,
        sin_gif: records.filter(record => !record.tiene_gif).length,
        gifs_unicos: new Set(records.map(record => record.gif_archivo).filter(Boolean)).size,
        con_instrucciones_es: records.filter(record => record.tiene_instrucciones_es).length,
        sin_instrucciones_es: records.filter(record => !record.tiene_instrucciones_es).length,
        taxonomia_completa: records.filter(record => record.taxonomia_completa).length,
        taxonomia_incompleta: records.filter(record => !record.taxonomia_completa).length,
        sin_categoria: records.filter(record => !record.categoria_app).length,
        inactivos: records.filter(record => record.en_bd && record.activo === false).length,
        dataset_ids_en_bd: dbDatasetIds.size,
        dataset_ids_totales: dataset.length,
        dataset_ids_huerfanos: orphanRecords.length,
        dataset_nombres_duplicados: datasetDuplicateGroups.length,
        kevin_filas: kevinEntries.length,
        kevin_nombres_unicos: kevinByName.size,
        kevin_coincidencias_bd: oldRecords.filter(record => record.en_csv_kevin).length,
        kevin_no_encontrados: kevinUnmatched.length,
        antiguos_sin_kevin: oldMissingKevin.length,
        backup_20261106: backupCount,
    };
    // ── incidents / taxonomy ─────────────────────────────────────────────────
    const incidencias = {
        sin_gif: records.filter(record => !record.tiene_gif)
            .map(record => ({ id_app: record.id_app, dataset_id: record.dataset_id, nombre: record.nombre_bd, origen: record.origen, categoria: record.categoria_app })),
        gifs_no_encontrados: records.filter(record => record.gif_archivo && !record.gif_existe_disco)
            .map(record => ({ id_app: record.id_app, dataset_id: record.dataset_id, gif: record.gif_archivo })),
        sin_instrucciones_es: records.filter(record => !record.tiene_instrucciones_es)
            .map(record => ({ id_app: record.id_app, dataset_id: record.dataset_id, nombre: record.nombre_bd, origen: record.origen })),
        sin_categoria: records.filter(record => !record.categoria_app)
            .map(record => ({ id_app: record.id_app, dataset_id: record.dataset_id, nombre: record.nombre_bd, origen: record.origen })),
        dataset_id_duplicado: duplicateDatasetIds,
        dataset_ids_huerfanos: orphanRecords.map(record => ({
            dataset_id: record.dataset_id,
            nombre_en: record.nombre_dataset_en,
            duplicado_de: record.duplicado_de,
            categoria_app: record.categoria_app,
        })),
        dataset_nombres_duplicados: datasetDuplicateGroups.map(group => ({
            nombre: group.nombre,
            ids: group.ids,
            en_bd: group.ids.filter(id => dbDatasetIds.has(id)),
            huerfanos: group.ids.filter(id => !dbDatasetIds.has(id)),
        })),
        kevin_no_encontrados: kevinUnmatched,
        kevin_duplicados: kevinDuplicates,
        antiguos_sin_kevin: oldMissingKevin,
    };

    const taxonomias = {
        categorias_app: uniqueSorted(records.map(record => record.categoria_app)),
        body_parts: uniqueSorted(records.map(record => record.body_part)),
        equipos: uniqueSorted(records.map(record => record.equipo)),
        musculos_objetivo: uniqueSorted(records.map(record => record.musculo_objetivo)),
        grupos_musculares: uniqueSorted(records.map(record => record.grupo_muscular)),
        musculos_secundarios: uniqueSorted(records.flatMap(record => record.musculos_secundarios)),
        categorias_csv_kevin: uniqueSorted(kevinEntries.map(entry => entry.musculo)),
        conteos_dataset: {
            body_parts: countBy(dataset, 'body_part'),
            equipos: countBy(dataset, 'equipment'),
            objetivos: countBy(dataset, 'target'),
            grupos_musculares: countBy(dataset, 'muscle_group'),
        },
    };
    // ── write the bundle ─────────────────────────────────────────────────────
    fs.mkdirSync(OUT_DIR, { recursive: true });

    const MASTER_HEADERS = [
        'id_app', 'dataset_id', 'origen', 'es_viejo', 'es_nuevo', 'en_bd', 'idioma_nombre',
        'nombre_bd', 'nombre_dataset_en', 'nombre_es_actual', 'categoria_app',
        'body_part', 'equipo', 'musculo_objetivo', 'grupo_muscular', 'musculos_secundarios',
        'taxonomia_completa', 'tiene_gif', 'gif_archivo', 'gif_url', 'gif_existe_disco',
        'tiene_thumb', 'thumb_archivo', 'thumb_existe_disco',
        'tiene_instrucciones_es', 'tiene_instrucciones_en', 'instrucciones_es_resumen', 'n_pasos_es',
        'video_url_legacy', 'activo', 'created_at', 'en_csv_kevin', 'csv_musculo', 'csv_link',
        'duplicado_de', 'notas',
    ];

    function toMasterRow(record) {
        return {
            ...record,
            es_viejo: record.es_viejo ? 'SI' : 'NO',
            es_nuevo: record.es_nuevo ? 'SI' : 'NO',
            en_bd: record.en_bd ? 'SI' : 'NO',
            taxonomia_completa: record.taxonomia_completa ? 'SI' : 'NO',
            tiene_gif: record.tiene_gif ? 'SI' : 'NO',
            gif_existe_disco: record.gif_existe_disco ? 'SI' : 'NO',
            tiene_thumb: record.tiene_thumb ? 'SI' : 'NO',
            thumb_existe_disco: record.thumb_existe_disco ? 'SI' : 'NO',
            tiene_instrucciones_es: record.tiene_instrucciones_es ? 'SI' : 'NO',
            tiene_instrucciones_en: record.tiene_instrucciones_en ? 'SI' : 'NO',
            en_csv_kevin: record.en_csv_kevin ? 'SI' : 'NO',
            activo: record.activo == null ? '' : (record.activo ? 'SI' : 'NO'),
            instrucciones_es_resumen: oneLine(record.instrucciones_es).slice(0, 320),
            n_pasos_es: record.pasos_es.length,
            notas: record.notas.join(' | '),
        };
    }

    const masterPayload = {
        meta: {
            generado_en: new Date().toISOString(),
            fuente_bd: SOURCE,
            variable_conexion: SOURCE === 'staging' ? 'DATABASE_URL' : 'PRODUCTION_DATABASE_URL',
            dataset_json: datasetFile,
            media_manifest: manifestFile,
            csv_kevin: KEVIN_CSV,
            media_base: JSDELIVR_BASE,
            columnas_csv: MASTER_HEADERS,
            reglas: {
                id_app: 'ID primario de exercise_library. Inmutable. No renumerar ni reutilizar.',
                dataset_id: 'ID del dataset de medios (0001-1324). Puede repetirse (ver incidencias.dataset_id_duplicado) y no es clave única.',
                origen: 'viejo_catalogo | viejo_con_dataset | nuevo_dataset | dataset_huerfano',
                huerfano: 'Registro del dataset que no existe como fila en exercise_library: no tiene id_app.',
            },
        },
        totales: counts,
        comparacion: comparison,
        taxonomias,
        incidencias,
        ejercicios: records,
    };
    fs.writeFileSync(path.join(OUT_DIR, 'biblioteca_ejercicios.json'), JSON.stringify(masterPayload, null, 2), 'utf8');
    writeCsv(path.join(OUT_DIR, 'biblioteca_ejercicios.csv'), MASTER_HEADERS, records.map(toMasterRow));

    const TRANSLATE_HEADERS = [
        'id_app', 'dataset_id', 'origen', 'en_bd', 'nombre_en', 'nombre_es_sugerido',
        'categoria_app', 'body_part', 'equipo', 'musculo_objetivo', 'grupo_muscular',
        'musculos_secundarios', 'instrucciones_es', 'notas', 'notas_revision', 'confianza',
    ];
    const translateRows = records.filter(record => record.es_nuevo).map(record => ({
        id_app: record.id_app,
        dataset_id: record.dataset_id,
        origen: record.origen,
        en_bd: record.en_bd ? 'SI' : 'NO',
        nombre_en: record.nombre_dataset_en || record.nombre_bd,
        nombre_es_sugerido: '',
        categoria_app: record.categoria_app,
        body_part: record.body_part,
        equipo: record.equipo,
        musculo_objetivo: record.musculo_objetivo,
        grupo_muscular: record.grupo_muscular,
        musculos_secundarios: record.musculos_secundarios,
        instrucciones_es: oneLine(record.instrucciones_es),
        notas: record.notas.join(' | '),
        notas_revision: '',
        confianza: '',
    }));
    writeCsv(path.join(OUT_DIR, 'biblioteca_ejercicios_para_traducir.csv'), TRANSLATE_HEADERS, translateRows);

    const REVIEW_HEADERS = [
        'id_app', 'nombre_actual', 'categoria_app', 'en_csv_kevin', 'csv_musculo',
        'nombre_estandarizado_sugerido', 'categoria_sugerida', 'body_part_sugerido',
        'equipo_sugerido', 'musculo_objetivo_sugerido', 'grupo_muscular_sugerido',
        'musculos_secundarios_sugeridos', 'notas',
    ];
    const reviewRows = records.filter(record => record.es_viejo && !record.dataset_id).map(record => ({
        id_app: record.id_app,
        nombre_actual: record.nombre_bd,
        categoria_app: record.categoria_app,
        en_csv_kevin: record.en_csv_kevin ? 'SI' : 'NO',
        csv_musculo: record.csv_musculo,
        nombre_estandarizado_sugerido: '',
        categoria_sugerida: '',
        body_part_sugerido: '',
        equipo_sugerido: '',
        musculo_objetivo_sugerido: '',
        grupo_muscular_sugerido: '',
        musculos_secundarios_sugeridos: '',
        notas: record.notas.join(' | '),
    }));
    writeCsv(path.join(OUT_DIR, 'biblioteca_ejercicios_revisar_antiguos.csv'), REVIEW_HEADERS, reviewRows);
    // ── validation ───────────────────────────────────────────────────────────
    const checks = [];
    function check(name, ok, expected, actual) {
        checks.push({ name, ok: Boolean(ok), expected, actual });
    }

    check('filas_bd', rows.length === SNAPSHOT.total, SNAPSHOT.total, rows.length);
    check('viejos', oldRecords.length === SNAPSHOT.old, SNAPSHOT.old, oldRecords.length);
    check('nuevos_en_bd', newRecords.length === SNAPSHOT.new, SNAPSHOT.new, newRecords.length);
    check('huerfanos', orphanRecords.length === SNAPSHOT.orphans, SNAPSHOT.orphans, orphanRecords.length);
    check('dataset_registros', dataset.length === SNAPSHOT.dataset, SNAPSHOT.dataset, dataset.length);
    check('id_app_unico', new Set(dbRecords.map(record => record.id_app)).size === dbRecords.length, dbRecords.length, new Set(dbRecords.map(record => record.id_app)).size);
    check('dataset_id_duplicado_unico', duplicateDatasetIds.length === 1, 'exactamente 1 dataset_id duplicado', duplicateDatasetIds.map(item => `${item.dataset_id}: ${item.filas.map(fila => fila.id).join(', ')}`).join(' | ') || 'ninguno');
    check('nuevos_con_gif', newRecords.every(record => record.tiene_gif), newRecords.length, newRecords.filter(record => record.tiene_gif).length);
    check('nuevos_con_instrucciones_es', newRecords.every(record => record.tiene_instrucciones_es), newRecords.length, newRecords.filter(record => record.tiene_instrucciones_es).length);
    check('gifs_en_disco', incidencias.gifs_no_encontrados.length === 0, 0, incidencias.gifs_no_encontrados.length);
    check('dataset_cobertura', dbDatasetIds.size + orphanRecords.length === dataset.length, dataset.length, dbDatasetIds.size + orphanRecords.length);

    const csvCheck = parseCsv(fs.readFileSync(path.join(OUT_DIR, 'biblioteca_ejercicios.csv'), 'utf8'), ';');
    check('csv_filas', csvCheck.length === records.length + 1, records.length + 1, csvCheck.length);
    check('csv_columnas', csvCheck[0].length === MASTER_HEADERS.length, MASTER_HEADERS.length, csvCheck[0].length);
    check('csv_traduccion_filas', translateRows.length === newRecords.length + orphanRecords.length, newRecords.length + orphanRecords.length, translateRows.length);
    check('csv_antiguos_filas', reviewRows.filter(row => row.id_app).length === oldRecords.filter(record => !record.dataset_id).length, oldRecords.filter(record => !record.dataset_id).length, reviewRows.filter(row => row.id_app).length);

    const byId = new Map(dbRecords.map(record => [record.id_app, record]));
    check('spot_142_caminadora', byId.get(142)?.dataset_id === '3666' && byId.get(142)?.nombre_bd === 'CAMINADORA', 'CAMINADORA -> 3666', `${byId.get(142)?.nombre_bd} -> ${byId.get(142)?.dataset_id}`);
    check('spot_62_curl_arana', byId.get(62)?.dataset_id === '0454', 'id 62 -> 0454', `${byId.get(62)?.nombre_bd} -> ${byId.get(62)?.dataset_id}`);
    if (SOURCE === 'production') {
        check('spot_1417_escaladora', byId.get(1417)?.dataset_id === '2311' && byId.get(1417)?.nombre_bd === 'ESCALADORA', 'ESCALADORA -> 2311', `${byId.get(1417)?.nombre_bd} -> ${byId.get(1417)?.dataset_id}`);
        check('spot_1371_stepmill', byId.get(1371)?.nombre_bd === 'walking on stepmill' && byId.get(1371)?.dataset_id === '2311', 'walking on stepmill -> 2311', `${byId.get(1371)?.nombre_bd} -> ${byId.get(1371)?.dataset_id}`);
    } else {
        check('spot_4707_escaladora', byId.get(4707)?.dataset_id === '2311' && byId.get(4707)?.nombre_bd === 'ESCALADORA', 'ESCALADORA -> 2311', `${byId.get(4707)?.nombre_bd} -> ${byId.get(4707)?.dataset_id}`);
        check('spot_3423_treadmill', byId.get(3423)?.nombre_bd === 'walking on incline treadmill' && byId.get(3423)?.dataset_id === '3666', 'walking on incline treadmill -> 3666', `${byId.get(3423)?.nombre_bd} -> ${byId.get(3423)?.dataset_id}`);
    }

    const validation = {
        generado_en: new Date().toISOString(),
        fuente: SOURCE,
        ok: checks.every(item => item.ok),
        checks,
    };
    fs.writeFileSync(path.join(OUT_DIR, 'validacion.json'), JSON.stringify(validation, null, 2), 'utf8');

    // ── human-readable summary + prompt ─────────────────────────────────────
    const resumen = buildResumen({ counts, byOrigin: countBy(records, 'origen'), incidencias, taxonomias, records, comparison, checks, source: SOURCE, outDir: OUT_DIR });
    fs.writeFileSync(path.join(OUT_DIR, 'biblioteca_ejercicios_resumen.md'), resumen, 'utf8');
    fs.writeFileSync(path.join(OUT_DIR, 'prompt_para_otra_ia.md'), buildPrompt({ counts, taxonomias, incidencias, source: SOURCE, outDir: OUT_DIR }), 'utf8');

    console.log(`\nListo: ${OUT_DIR}`);
    console.log(`Registros: ${records.length} (BD ${rows.length} + huérfanos ${orphanRecords.length})`);
    console.log(`Viejos: ${oldRecords.length} (con dataset ${counts.viejos_con_dataset}, sin dataset ${counts.viejos_sin_dataset}) | Nuevos: ${newRecords.length}`);
    console.log(`GIF: ${counts.con_gif} filas / ${counts.gifs_unicos} archivos únicos | Sin GIF: ${counts.sin_gif}`);
    console.log(`Validación: ${validation.ok ? 'OK' : 'REVISAR'} (${checks.filter(item => item.ok).length}/${checks.length})`);
    if (!validation.ok) {
        for (const item of checks.filter(entry => !entry.ok)) {
            console.error(`  FAIL ${item.name}: esperado=${JSON.stringify(item.expected)} real=${JSON.stringify(item.actual)}`);
        }
    }
    process.exitCode = validation.ok ? 0 : 1;
}
// ── markdown helpers ─────────────────────────────────────────────────────────

function mdCell(value) {
    return String(value == null ? '' : value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function mdTable(headers, rows) {
    const lines = [`| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`];
    for (const row of rows) lines.push(`| ${headers.map(header => mdCell(row[header])).join(' | ')} |`);
    return lines.join('\n');
}

function inlineCounts(object) {
    return Object.entries(object).map(([key, value]) => `${key} (${value})`).join(', ');
}

function buildResumen(ctx) {
    const { counts, byOrigin, incidencias, taxonomias, records, comparison, checks, source, outDir } = ctx;
    const appCategoryCounts = countBy(records, 'categoria_app');
    const sourceLabel = source === 'staging' ? 'test (`DATABASE_URL`)' : 'producción (`PRODUCTION_DATABASE_URL`)';
    const otherLabel = source === 'staging' ? 'producción' : 'test';
    const otherValue = !comparison?.disponible ? (comparison?.error || 'no consultada') : `${comparison.total_otra} filas`;
    const lines = [];

    lines.push('# Biblioteca de ejercicios — exportación completa');
    lines.push('');
    lines.push('Archivo maestro para **renombrar y traducir la biblioteca sin cambiar ningún ID**.');
    lines.push('');
    lines.push(`- **Generado:** ${new Date().toISOString()}`);
    lines.push(`- **Fuente:** ${sourceLabel} — ${counts.filas_en_bd} filas`);
    lines.push(`- **Otra base (${otherLabel}):** ${otherValue}`);
    lines.push(`- **Dataset:** ${counts.dataset_ids_totales} registros (IDs \`0001\`–\`1324\`)`);
    lines.push(`- **CSV de Kevin:** ${counts.kevin_filas} filas / ${counts.kevin_nombres_unicos} nombres únicos`);
    lines.push(`- **Carpeta:** \`${outDir}\``);
    lines.push('');
    lines.push('## 1. Archivos');
    lines.push('');
    lines.push(mdTable(['Archivo', 'Para qué'], [
        { Archivo: '`biblioteca_ejercicios.json`', 'Para qué': 'Fuente de verdad completa: instrucciones ES/EN enteras, pasos y todos los campos. Es el que debe leer la IA que traduzca.' },
        { Archivo: '`biblioteca_ejercicios.csv`', 'Para qué': 'Una fila por ejercicio para revisar en Excel/Sheets. Separador `;`, UTF-8 con BOM, instrucciones resumidas (completas en el JSON).' },
        { Archivo: '`biblioteca_ejercicios_para_traducir.csv`', 'Para qué': `Las ${counts.nuevos_en_bd} nuevas + ${counts.huerfanos} huérfanas, con columnas vacías para que la IA proponga el nombre en español.` },
        { Archivo: '`biblioteca_ejercicios_revisar_antiguos.csv`', 'Para qué': `Las ${counts.viejos_sin_dataset} antiguas sin dataset ni GIF, para proponerles taxonomía y nombre estándar.` },
        { Archivo: '`prompt_para_otra_ia.md`', 'Para qué': 'Prompt listo para pegar junto con los CSV.' },
        { Archivo: '`validacion.json`', 'Para qué': 'Resultado de las comprobaciones automáticas de este export.' },
    ]));
    lines.push('');
    lines.push('## 2. Totales');
    lines.push('');
    lines.push(mdTable(['Métrica', 'Valor'], Object.entries(counts).map(([metrica, valor]) => ({
        Métrica: metrica,
        Valor: valor && typeof valor === 'object' ? JSON.stringify(valor) : valor,
    }))));
    lines.push('');
    lines.push('### Origen de cada fila');
    lines.push('');
    lines.push(mdTable(['Origen', 'Filas'], Object.entries(byOrigin).map(([origen, filas]) => ({ Origen: origen, Filas: filas }))));
    lines.push('');
    lines.push('- `viejo_catalogo`: fila antigua (creada por el coach) sin dataset, sin GIF y sin taxonomía completa.');
    lines.push('- `viejo_con_dataset`: fila antigua enriquecida con un registro del dataset (tiene GIF e instrucciones).');
    lines.push('- `nuevo_dataset`: fila creada por la importación del dataset (nombre en inglés).');
    lines.push('- `dataset_huerfano`: registro del dataset que **no** existe como fila en la app; no tiene `id_app`.');
    lines.push('');
    lines.push('## 3. Medios');
    lines.push('');
    lines.push(`- Filas con GIF: **${counts.con_gif}**; archivos GIF únicos: **${counts.gifs_unicos}**.`);
    lines.push(`- dataset_id compartidos: **${incidencias.dataset_id_duplicado.length}** — ${incidencias.dataset_id_duplicado.length ? incidencias.dataset_id_duplicado.map(item => `${item.dataset_id} (${item.filas.map(fila => `id ${fila.id}: ${fila.name}`).join(' / ')})`).join('; ') : 'ninguno'}.`);
    lines.push(`- GIFs no encontrados en el espejo local: **${incidencias.gifs_no_encontrados.length}**.`);
    lines.push(`- Filas sin GIF: **${incidencias.sin_gif.length}** (todas son antiguas sin dataset).`);
    lines.push('');
    lines.push('## 4. Incidencias');
    lines.push('');
    lines.push(`### 4.1 Filas sin GIF (${incidencias.sin_gif.length})`);
    lines.push('');
    lines.push(mdTable(['id_app', 'dataset_id', 'nombre', 'categoria', 'origen'], incidencias.sin_gif));
    lines.push('');
    lines.push(`### 4.2 Filas sin categoría en la app (${incidencias.sin_categoria.length})`);
    lines.push('');
    lines.push(mdTable(['id_app', 'dataset_id', 'nombre', 'origen'], incidencias.sin_categoria));
    lines.push('');
    lines.push(`### 4.3 dataset_id compartido (${incidencias.dataset_id_duplicado.length})`);
    lines.push('');
    lines.push(mdTable(['dataset_id', 'filas'], incidencias.dataset_id_duplicado.map(item => ({
        dataset_id: item.dataset_id,
        filas: item.filas.map(fila => `id ${fila.id} (${fila.name})`).join(', '),
    }))));
    lines.push('');
    lines.push('`dataset_id` **no es una clave única**: úsalo solo para localizar el GIF, nunca para identificar una fila.');
    lines.push('');
    lines.push(`### 4.4 Huérfanos del dataset (${incidencias.dataset_ids_huerfanos.length})`);
    lines.push('');
    lines.push('Registros del dataset que no llegaron a la app porque su nombre estaba duplicado. **No tienen `id_app`**: no hay que inventarles uno.');
    lines.push('');
    lines.push(mdTable(['dataset_id', 'nombre_en', 'categoria_app', 'duplicado_de'], incidencias.dataset_ids_huerfanos));
    lines.push('');
    lines.push(`### 4.5 Nombres duplicados dentro del dataset (${incidencias.dataset_nombres_duplicados.length} grupos)`);
    lines.push('');
    lines.push(mdTable(['nombre', 'ids', 'en_bd', 'huerfanos'], incidencias.dataset_nombres_duplicados.map(group => ({
        nombre: group.nombre,
        ids: group.ids.join(', '),
        en_bd: group.en_bd.join(', ') || '—',
        huerfanos: group.huerfanos.join(', ') || '—',
    }))));
    lines.push('');
    lines.push('## 5. Conciliación con el CSV de Kevin');
    lines.push('');
    lines.push(`- Filas del CSV: **${counts.kevin_filas}**; nombres únicos: **${counts.kevin_nombres_unicos}**.`);
    lines.push(`- Filas antiguas de la BD que coinciden con el CSV: **${counts.kevin_coincidencias_bd}**.`);
    lines.push(`- Nombres del CSV que no están en la BD: **${incidencias.kevin_no_encontrados.length}**.`);
    lines.push(`- Filas antiguas de la BD que no están en el CSV: **${incidencias.antiguos_sin_kevin.length}**.`);
    lines.push(`- Nombres repetidos dentro del CSV: **${incidencias.kevin_duplicados.length}**.`);
    lines.push('');
    lines.push(`### 5.1 Nombres del CSV que no están en la BD (${incidencias.kevin_no_encontrados.length})`);
    lines.push('');
    lines.push(mdTable(['nombre', 'musculo', 'veces'], incidencias.kevin_no_encontrados));
    lines.push('');
    lines.push(`### 5.2 Nombres duplicados en el CSV (${incidencias.kevin_duplicados.length})`);
    lines.push('');
    lines.push(mdTable(['nombre', 'veces', 'musculos'], incidencias.kevin_duplicados.map(item => ({
        nombre: item.nombre,
        veces: item.veces,
        musculos: item.musculos.join(' / '),
    }))));
    lines.push('');
    lines.push(`### 5.3 Filas antiguas sin coincidencia en el CSV (${incidencias.antiguos_sin_kevin.length})`);
    lines.push('');
    lines.push(mdTable(['id_app', 'nombre', 'categoria'], incidencias.antiguos_sin_kevin));
    lines.push('');
    lines.push('## 6. Taxonomías de referencia');
    lines.push('');
    lines.push(`- **Categorías de la app (${taxonomias.categorias_app.length}):** ${inlineCounts(appCategoryCounts)}`);
    lines.push(`- **` + '`body_part`' + ` del dataset (${Object.keys(taxonomias.conteos_dataset.body_parts).length}):** ${inlineCounts(taxonomias.conteos_dataset.body_parts)}`);
    lines.push(`- **Equipos (${Object.keys(taxonomias.conteos_dataset.equipos).length}):** ${inlineCounts(taxonomias.conteos_dataset.equipos)}`);
    lines.push(`- **Objetivos (${Object.keys(taxonomias.conteos_dataset.objetivos).length}):** ${inlineCounts(taxonomias.conteos_dataset.objetivos)}`);
    lines.push(`- **Grupos musculares (${Object.keys(taxonomias.conteos_dataset.grupos_musculares).length}):** ${inlineCounts(taxonomias.conteos_dataset.grupos_musculares)}`);
    lines.push(`- **Músculos secundarios (${taxonomias.musculos_secundarios.length}):** ${taxonomias.musculos_secundarios.join(', ')}`);
    lines.push(`- **Categorías del CSV de Kevin (${taxonomias.categorias_csv_kevin.length}):** ${taxonomias.categorias_csv_kevin.join(', ')}`);
    lines.push('');
    lines.push('## 7. Validación automática');
    lines.push('');
    lines.push(mdTable(['comprobación', 'resultado', 'esperado', 'real'], checks.map(item => ({
        comprobación: item.name,
        resultado: item.ok ? 'OK' : 'FALLA',
        esperado: JSON.stringify(item.expected),
        real: JSON.stringify(item.actual),
    }))));
    lines.push('');
    lines.push('## 8. Cómo usar este paquete');
    lines.push('');
    lines.push('1. Pasar `prompt_para_otra_ia.md` + `biblioteca_ejercicios_para_traducir.csv` al modelo que va a renombrar.');
    lines.push('2. Pasar `biblioteca_ejercicios_revisar_antiguos.csv` para que proponga taxonomía a las ' + counts.viejos_sin_dataset + ' filas antiguas sin dataset.');
    lines.push('3. Usar `biblioteca_ejercicios.json` como fuente de verdad cuando haya dudas: tiene las instrucciones completas en español y los IDs.');
    lines.push('4. **No cambiar `id_app` ni `dataset_id`**. Si una propuesta de nombre no encaja, se anota en `notas_revision`, no se toca el ID.');
    lines.push('5. Los ' + counts.huerfanos + ' huérfanos no están en la app: si se quieren usar, primero hay que importarlos y asignarles un `id_app` nuevo; nunca reutilizar uno existente.');
    lines.push('');
    lines.push('## 9. Comparación entre bases');
    lines.push('');
    if (!comparison?.disponible) {
        lines.push(`No se pudo comparar: ${comparison?.error || 'sin datos'}.`);
    } else {
        lines.push(`- Filas en esta base: **${comparison.total_esta}**; en la otra: **${comparison.total_otra}**.`);
        lines.push(`- Solo en esta base: **${comparison.solo_en_esta.length}**.`);
        lines.push(`- Solo en la otra: **${comparison.solo_en_otra.length}**.`);
        lines.push(`- Mismo id con nombre/source/dataset_id distinto: **${comparison.distintas.length}**.`);
        const idRange = rows => rows.length ? `${Math.min(...rows.map(row => row.id))}–${Math.max(...rows.map(row => row.id))}` : '—';
        lines.push(`- Rango de IDs solo en esta base: **${idRange(comparison.solo_en_esta)}**; solo en la otra: **${idRange(comparison.solo_en_otra)}**.`);
        lines.push('');
        if (comparison.solo_en_esta.length > 100) {
            lines.push('> Las filas nuevas tienen IDs distintos en cada base aunque compartan el mismo `dataset_id`. **No copies IDs de una base a otra**: el `id_app` solo es válido dentro de la base exportada.');
            lines.push('');
        }
        lines.push('### Muestra de filas solo en esta base');
        lines.push('');
        lines.push(mdTable(['id', 'nombre', 'source', 'dataset_id'], comparison.solo_en_esta.slice(0, 10)));
        if (comparison.solo_en_esta.length > 10) {
            lines.push('');
            lines.push(`_Mostrando 10 de ${comparison.solo_en_esta.length}; el listado completo está en \`biblioteca_ejercicios.json\` → \`comparacion.solo_en_esta\`._`);
        }
        lines.push('');
        lines.push('### Muestra de filas solo en la otra base');
        lines.push('');
        lines.push(mdTable(['id', 'nombre', 'source', 'dataset_id'], comparison.solo_en_otra.slice(0, 10)));
        if (comparison.solo_en_otra.length > 10) {
            lines.push('');
            lines.push(`_Mostrando 10 de ${comparison.solo_en_otra.length}; el listado completo está en \`biblioteca_ejercicios.json\` → \`comparacion.solo_en_otra\`._`);
        }
        lines.push('');
        lines.push('### Mismo id, datos distintos');
        lines.push('');
        if (comparison.distintas.length === 0) {
            lines.push('Ninguna fila con el mismo id tiene nombre, source o dataset_id distinto.');
        } else {
            lines.push(mdTable(['id', 'nombre', 'campos', 'esta', 'otra'], comparison.distintas));
        }
    }
    lines.push('');
    return lines.join('\n');
}
function buildPrompt(ctx) {
    const { counts, incidencias } = ctx;
    const duplicateNote = incidencias.dataset_id_duplicado.length
        ? incidencias.dataset_id_duplicado.map(item => `'${item.dataset_id}' lo comparten ${item.filas.map(fila => `la fila ${fila.id} (${fila.name})`).join(' y ')}`).join('; ')
        : 'no hay dataset_id repetidos en esta base';
    return `# Prompt para renombrar y traducir la biblioteca de ejercicios

## Tu papel

Eres editor de contenido de fitness en español (España + LatAm neutro). Conoces gimnasio, máquinas, material y terminología de entrenamiento. Tu tarea es **traducir y mejorar nombres de ejercicios sin tocar los IDs**, y proponer taxonomía muscular cuando falte.

## Archivos que recibes

1. **biblioteca_ejercicios_para_traducir.csv** — ${counts.nuevos_en_bd} ejercicios nuevos (nombre en inglés) + ${counts.huerfanos} huérfanos del dataset. Columnas rellenadas: 'id_app', 'dataset_id', 'origen', 'en_bd', 'nombre_en', 'categoria_app', 'body_part', 'equipo', 'musculo_objetivo', 'grupo_muscular', 'musculos_secundarios', 'instrucciones_es', 'notas'. Tú rellenas: 'nombre_es_sugerido', 'notas_revision', 'confianza'.
2. **biblioteca_ejercicios_revisar_antiguos.csv** — ${counts.viejos_sin_dataset} ejercicios antiguos que ya están en español pero no tienen GIF ni taxonomía completa. Tú rellenas las columnas de sugerencia.
3. **biblioteca_ejercicios.json** — fuente de verdad completa (instrucciones ES/EN enteras, pasos, IDs y taxonomía). Úsalo si un CSV no te da contexto suficiente.

## Regla número uno: los IDs son intocables

- **No cambies, renombres, reordenes ni reutilices 'id_app'.** Es la clave primaria de la app y de los planes de entrenamiento.
- **No cambies 'dataset_id'.** Es la referencia al GIF y puede repetirse: ${duplicateNote}.
- **No fusiones filas**, aunque dos nombres parezcan el mismo ejercicio. Si sospechas duplicado, anótalo en 'notas_revision'.
- **No borres filas ni añadas filas nuevas.** Devuelve exactamente las mismas filas que recibiste, en el mismo orden.
- Los **huérfanos** ('origen = dataset_huerfano') no tienen 'id_app'. Déjala vacía: **no inventes un ID**. Si sugieres usarlos, indícalo en 'notas_revision'.

## Cómo traducir los nombres

- Español neutro de gimnasio, natural y directo. **Nada de traducción literal palabra por palabra.**
- Estructura recomendada: **[movimiento] + [implemento] + [postura o variante]**. Ejemplo: "lever seated hip adduction" → "Aducción de cadera en máquina, sentado".
- Usa las **instrucciones en español** para desambiguar: si el nombre inglés es ambiguo, las instrucciones dicen qué se hace realmente.
- No traduzcas marcas ni modelos: "smith machine" → "multipower"; "cable" → "poleas"; "EZ bar" → "barra Z"; "lever" → "máquina".
- Evita redundancias ("curl de bíceps con mancuernas" mejor que "curl de bíceps con mancuernas para bíceps").
- Conserva el nivel de detalle del original: si dice "incline", "single arm" o "reverse", que aparezca en español.
- Los nombres antiguos que ya están bien se mantienen; solo unifica mayúsculas y estilo (no los reescribas por gusto).
- No pongas punto final ni comillas en el nombre.

### Ejemplos de estilo (no son filas exactas del CSV)

| Inglés | Español sugerido |
|---|---|
| ez barbell spider curl | Curl araña con barra Z |
| lever seated hip adduction | Aducción de cadera en máquina, sentado |
| smith machine squat | Sentadilla en multipower |
| cable crossover | Cruce de poleas |
| walking on incline treadmill | Caminata en cinta inclinada |
| dumbbell incline curl | Curl inclinado con mancuernas |
| bodyweight standing calf raise | Elevación de talones de pie sin peso |

## Taxonomía

En la tabla de traducción la taxonomía ya viene rellena: úsala como contexto y **no la cambies**. Si crees que un valor es incorrecto, anótalo en 'notas_revision' con el valor propuesto.

En la tabla de antiguos sí debes proponer:

- 'nombre_estandarizado_sugerido': mismo criterio de estilo que arriba.
- 'categoria_sugerida': una de las categorías de la app (ABDOMEN, DORSAL, PECTORAL, DELTOIDES, BÍCEPS, TRÍCEPS, PIERNAS, GLÚTEOS, GEMELOS, CARDIO, etc.).
- 'body_part_sugerido': 'back', 'cardio', 'chest', 'lower arms', 'lower legs', 'neck', 'shoulders', 'upper arms', 'upper legs' o 'waist'.
- 'equipo_sugerido': el material real ('barbell', 'dumbbell', 'cable', 'lever', 'smith', 'body weight', 'band', 'kettlebell', 'ball', 'plate', 'sled'...).
- 'musculo_objetivo_sugerido': músculo principal en inglés del dataset ('abs', 'quads', 'lats', 'pectorals', 'delts', 'biceps', 'triceps', 'glutes', 'hamstrings', 'calves', 'forearms', 'traps', 'upper back', 'spine', 'adductors', 'abductors'...).
- 'grupo_muscular_sugerido': grupo amplio en inglés ('chest', 'back', 'shoulders', 'upper arms', 'lower arms', 'upper legs', 'lower legs', 'waist', 'cardio', 'neck').
- 'musculos_secundarios_sugeridos': lista separada por ' | '.

Si no estás seguro de un valor taxonómico, déjalo vacío y explica la duda en 'notas_revision'. **No inventes músculos que las instrucciones no justifiquen.**

## Formato de salida

### Tabla 1 — traducción

Devuelve un CSV (separador ';', UTF-8) con **las mismas ${counts.nuevos_en_bd + counts.huerfanos} filas** y estas columnas:

'id_app'; 'dataset_id'; 'nombre_en'; 'nombre_es_sugerido'; 'confianza'; 'notas_revision'

- 'nombre_es_sugerido': obligatorio salvo que el nombre ya sea español y correcto.
- 'confianza': 'alta', 'media' o 'baja'.
- 'notas_revision': vacío si no hay dudas; si hay, explica en una frase (por ejemplo, "posible duplicado de id 1234", "el GIF parece otro ejercicio", "categoría dudosa: ¿DELTOIDES o DORSAL?").
- No cambies 'id_app' ni 'dataset_id'. No añadas ni quites filas.

### Tabla 2 — antiguos

Devuelve un CSV (separador ';', UTF-8) con **las mismas ${counts.viejos_sin_dataset} filas** y estas columnas:

'id_app'; 'nombre_actual'; 'nombre_estandarizado_sugerido'; 'categoria_sugerida'; 'body_part_sugerido'; 'equipo_sugerido'; 'musculo_objetivo_sugerido'; 'grupo_muscular_sugerido'; 'musculos_secundarios_sugeridos'; 'confianza'; 'notas_revision'

- Si un ejercicio no existe en el dataset (por ejemplo, una máquina rara del gimnasio), no le inventes GIF ni 'dataset_id': solo propone nombre y taxonomía.
- Si el nombre actual ya es correcto, repítelo en 'nombre_estandarizado_sugerido'.

### Informe

Añade un breve **informe.md** con:

- Cuántas filas procesaste en cada tabla.
- Los casos de confianza 'baja' y por qué.
- Duplicados sospechosos (sin fusionarlos).
- Cualquier fila que no hayas podido completar.

## Control de calidad antes de entregar

1. La tabla 1 tiene exactamente ${counts.nuevos_en_bd + counts.huerfanos} filas; la tabla 2, exactamente ${counts.viejos_sin_dataset}.
2. Todos los 'id_app' de la tabla 1 que venían rellenos siguen igual; los huérfanos siguen con 'id_app' vacía.
3. Ningún 'dataset_id' cambió.
4. Ningún nombre se quedó en inglés por descuido (salvo marcas o siglas admitidas: EZ, TRX, HIIT...).
5. No hay dos filas con el mismo 'id_app'.
6. Los nombres no llevan punto final, comillas ni dobles espacios.
7. Si dudaste, está anotado en 'notas_revision'; no lo escondas.

## Contexto de la biblioteca

- La app tiene **${counts.filas_en_bd} filas**: **${counts.viejos} antiguas** (${counts.viejos_con_dataset} ya enriquecidas con dataset, ${counts.viejos_sin_dataset} sin GIF) y **${counts.nuevos_en_bd} nuevas** importadas del dataset.
- El dataset tiene **${counts.dataset_ids_totales} registros**; **${counts.huerfanos}** no llegaron a la app por nombres duplicados.
- Los nombres nuevos están en inglés y son a veces muy literales ("walking on incline treadmill"); ahí es donde más valor aporta tu traducción.
- No toques los GIF ni las rutas: van por 'dataset_id' y viven en un repositorio aparte.
`;
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});












