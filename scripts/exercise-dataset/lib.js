// scripts/exercise-dataset/lib.js
//
// Shared helpers for the exercises-dataset import:
//   - the canonical name normalization (mirrors server.js and the frontend)
//   - dataset -> Spanish taxonomy mapping (body part / target muscle)
//   - the Spanish -> English glossary used to match the existing catalog names
//     ("CURL DE BÍCEPS CON BARRA Z") against dataset names ("ez barbell curl")
//
// The glossary is intentionally conservative: a catalog row is only matched
// when the movement and the equipment/modifiers clearly identify ONE dataset
// record. Everything else is reported for manual curation instead of guessing.

/** Lowercase, accent-stripped, single-spaced name. Keep in sync with server.js. */
const normalizationCache = new Map();

function normalizeExerciseName(value) {
    const key = String(value || '');
    const cached = normalizationCache.get(key);
    if (cached !== undefined) return cached;

    const normalized = key
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

    normalizationCache.set(key, normalized);
    return normalized;
}

/** Dataset `body_part` → Spanish category label used by the catalog. */
const CATEGORY_BY_BODY_PART = {
    back: 'DORSAL',
    cardio: 'CARDIO',
    chest: 'PECTORAL',
    'lower arms': 'ANTEBRAZOS',
    'lower legs': 'GEMELOS',
    neck: 'CUELLO',
    shoulders: 'DELTOIDES',
    'upper arms': 'BRAZOS',
    'upper legs': 'PIERNAS',
    waist: 'ABDOMEN',
};

/** Dataset `target` muscle → Spanish category label used by the catalog. */
const CATEGORY_BY_TARGET = {
    abs: 'ABDOMEN',
    abductors: 'GLÚTEOS',
    adductors: 'ADUCTORES',
    biceps: 'BÍCEPS',
    calves: 'GEMELOS',
    'cardiovascular system': 'CARDIO',
    delts: 'DELTOIDES',
    forearms: 'ANTEBRAZOS',
    glutes: 'GLÚTEOS',
    hamstrings: 'ISQUIOSURAL',
    lats: 'DORSAL',
    'levator scapulae': 'CUELLO',
    pectorals: 'PECTORAL',
    quads: 'CUADRICEPS',
    'serratus anterior': 'PECTORAL',
    spine: 'LUMBAR',
    traps: 'DORSAL',
    triceps: 'TRÍCEPS',
    'upper back': 'DORSAL',
};

/** Spanish category → categories an imported record may carry to be compatible. */
const COMPATIBLE_CATEGORIES = {
    ABDOMEN: ['ABDOMEN'],
    ADUCTORES: ['ADUCTORES'],
    ANTEBRAZOS: ['ANTEBRAZOS', 'BÍCEPS'],
    BÍCEPS: ['BÍCEPS', 'ANTEBRAZOS'],
    CUADRICEPS: ['CUADRICEPS', 'GLÚTEOS', 'ISQUIOSURAL'],
    CUELLO: ['CUELLO', 'DORSAL'],
    DELTOIDES: ['DELTOIDES', 'DORSAL'],
    DORSAL: ['DORSAL', 'LUMBAR'],
    GEMELOS: ['GEMELOS'],
    GLÚTEOS: ['GLÚTEOS', 'ISQUIOSURAL', 'CUADRICEPS'],
    ISQUIOSURAL: ['ISQUIOSURAL', 'GLÚTEOS', 'CUADRICEPS'],
    LUMBAR: ['LUMBAR', 'DORSAL'],
    PECTORAL: ['PECTORAL'],
    TRÍCEPS: ['TRÍCEPS'],
    BRAZOS: ['BRAZOS', 'BÍCEPS', 'TRÍCEPS'],
    PIERNAS: ['PIERNAS', 'CUADRICEPS', 'ISQUIOSURAL', 'GLÚTEOS'],
    CARDIO: ['CARDIO'],
    // Coach-made buckets with no dataset equivalent: any muscle is acceptable.
    CALENTAMIENTO: null,
    'EN CASA': null,
    TERAPIA: null,
    Yoga: null,
};

/** Resolves the Spanish catalog category for a dataset record. */
function categoryForDataset(record) {
    return CATEGORY_BY_TARGET[record.target]
        ?? CATEGORY_BY_BODY_PART[record.body_part]
        ?? CATEGORY_BY_BODY_PART[record.category]
        ?? 'ABDOMEN';
}

/** True when `datasetCategory` can enrich a catalog row of `catalogCategory`. */
function isCompatibleCategory(catalogCategory, datasetCategory) {
    // Rows without a category (coach placeholders) accept any muscle.
    if (!catalogCategory) return true;
    const allowed = COMPATIBLE_CATEGORIES[catalogCategory];
    if (allowed === null) return true; // bucket accepts anything
    if (!allowed) return catalogCategory === datasetCategory;
    return allowed.includes(datasetCategory);
}

/** Capitalizes the first letter of every word longer than two characters. */
function titleCase(value) {
    return String(value || '')
        .trim()
        .split(/\s+/)
        .map(word => (word.length > 2 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
        .join(' ');
}

/** Fixes the mojibake that ships inside the dataset ("sled 45в° leg press"). */
function cleanDatasetName(name) {
    return String(name || '')
        .replace(/в°/g, '°')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Movement rules: the first matching rule wins. `tokens` must ALL appear in the
 * normalized dataset name (a `|` splits alternatives, e.g. "one arm|single arm").
 */
const MOVEMENT_RULES = [
    { test: /curl arana/, tokens: ['spider', 'curl'] },
    { test: /drag curl/, tokens: ['drag', 'curl'] },
    { test: /banco scott|curl predicador/, tokens: ['preacher', 'curl'] },
    { test: /curl bayesian/, tokens: ['bayesian', 'curl'] },
    { test: /martillo/, tokens: ['hammer', 'curl'] },
    { test: /curl nordico|nordic/, tokens: ['nordic'] },
    { test: /curl femoral|leg curl|femoral/, tokens: ['leg', 'curl'] },
    { test: /curl/, tokens: ['curl'] },

    { test: /press frances/, tokens: ['triceps', 'extension|skull'] },
    { test: /copa/, tokens: ['overhead', 'triceps', 'extension'] },
    { test: /extension(es)? en x|extension guillotina|extension katana/, tokens: ['triceps', 'extension'] },
    { test: /extension de triceps/, tokens: ['triceps', 'extension'] },
    { test: /leg extension|calentamiento \(leg extension\)/, tokens: ['leg', 'extension'] },
    { test: /fondo de triceps|fondos/, tokens: ['dip'] },

    { test: /press militar/, tokens: ['press', 'shoulder|overhead|military'] },
    { test: /press inclinado|press declinado|press plano|press horizontal|press banca|chest press/, tokens: ['press'] },
    { test: /prensa|leg press/, tokens: ['leg', 'press'] },
    { test: /hack squat/, tokens: ['hack', 'squat'] },
    { test: /sentadilla bulgara/, tokens: ['bulgarian'] },
    { test: /sentadilla|squat/, tokens: ['squat'] },
    { test: /peso muerto/, tokens: ['deadlift'] },
    { test: /zancadas? lateral/, tokens: ['lateral', 'lunge'] },
    { test: /zancada|desplante/, tokens: ['lunge'] },
    { test: /hip thrust/, tokens: ['hip', 'thrust'] },
    { test: /puente/, tokens: ['bridge'] },
    { test: /patada/, tokens: ['kickback'] },
    { test: /jalon|pull down|pulldown/, tokens: ['pulldown|pull down'] },
    { test: /barra t/, tokens: ['t bar'] },
    { test: /posterior/, tokens: ['rear'] },
    { test: /rack chin/, tokens: ['rack'] },
    { test: /remo/, tokens: ['row'] },
    { test: /dominada/, tokens: ['pull', 'up'] },
    { test: /flexion de cadera/, tokens: ['hip', 'flexion|raise'] },
    { test: /flexion de hombro/, tokens: ['shoulder', 'flexion|raise'] },
    { test: /flexiones/, tokens: ['push', 'up'] },
    { test: /aperturas|pec fly|peck fly|contractora|butterfly/, tokens: ['fly|flye|pec'] },
    { test: /elevaciones laterales/, tokens: ['lateral', 'raise'] },
    { test: /elevaciones frontales/, tokens: ['front', 'raise'] },
    { test: /elevacion(es)? de (talon|gemelo)|elevaciones de talon|gemelos|pantorrilla/, tokens: ['calf'] },
    { test: /elevacion(es)? de pierna/, tokens: ['leg', 'raise'] },
    { test: /abduccion|abductores/, tokens: ['abduction|abductor'] },
    { test: /aduccion|aductores/, tokens: ['adduction|adductor'] },
    { test: /encogimiento/, tokens: ['shrug'] },
    { test: /hiperextension/, tokens: ['hyperextension'] },
    { test: /crunch/, tokens: ['crunch'] },
    { test: /plancha/, tokens: ['plank'] },
    { test: /face pull/, tokens: ['face', 'pull'] },
    { test: /estiramiento/, tokens: ['stretch'] },
    { test: /bicho muerto|dead bug/, tokens: ['dead', 'bug'] },
    { test: /toques al talon/, tokens: ['heel', 'touch'] },
    { test: /salto de cuerda/, tokens: ['jump', 'rope'] },
    // CAMINADORA is the treadmill; the stair-climber (stepmill) is ESCALADORA.
    // The old rule accepted "walk|stepmill|treadmill", so the treadmill got
    // matched to "walking on stepmill" and ESCALADORA had no row at all.
    { test: /escaladora|escalador|escalones|stepmill/, tokens: ['stepmill'] },
    { test: /caminadora|trotadora|cinta de correr/, tokens: ['treadmill'] },
    { test: /short foot/, tokens: ['short', 'foot'] },
];

/** Catalog movements with no dataset equivalent — never auto-match these. */
const NO_DATASET_EQUIVALENT = [
    /extensiones en x/,
    /extension guillotina/,
    /extension katana/,
    /curl bayesian/,
    /movilidad|aproximacion/,
    /mochila/,
    /short foot/,
];

/** Equipment / modifier hints extracted from the Spanish catalog name. */
const HINTS = [
    { test: /barra z/, tokens: ['ez'] },
    { test: /multipower/, tokens: ['smith'] },
    { test: /maquina de polea|polea/, tokens: ['cable|pulley'] },
    { test: /maquina de palanca|maquina|en maquina/, tokens: ['lever|machine'] },
    { test: /mancuernas|mancuerna/, tokens: ['dumbbell'] },
    { test: /barra/, tokens: ['barbell'] },
    { test: /banda|goma/, tokens: ['band'] },
    { test: /kettlebell/, tokens: ['kettlebell'] },
    { test: /disco/, tokens: ['plate'] },
    { test: /toalla/, tokens: ['towel'] },
    { test: /bola|fitball|pelota/, tokens: ['ball'] },
    { test: /trx|suspension/, tokens: ['suspension'] },
    // modifiers that must appear in the dataset name
    { test: /inclinado/, tokens: ['incline'] },
    { test: /declinado/, tokens: ['decline'] },
    { test: /unilateral/, tokens: ['one arm|single arm|one leg|single leg'] },
    { test: /contralateral/, tokens: ['contralateral'] },
    { test: /ipsilateral/, tokens: ['ipsilateral'] },
    { test: /rumano|rumana|semirigidas/, tokens: ['romanian|stiff'] },
    { test: /sumo/, tokens: ['sumo'] },
    { test: /goblet/, tokens: ['goblet'] },
    { test: /agarre cerrado/, tokens: ['close', 'grip'] },
    { test: /hombro/, tokens: ['shoulder'] },
    { test: /cadera/, tokens: ['hip'] },
    { test: /rodillas/, tokens: ['kneeling'] },
    { test: /colgad/, tokens: ['hanging'] },
    { test: /pies elevados/, tokens: ['decline'] },
    { test: /isquiosural/, tokens: ['hamstring'] },
    { test: /posterior/, tokens: ['rear'] },
    { test: /remo con barra/, tokens: ['bent'] },
    { test: /supino|supinacion/, tokens: ['supinated'] },
    { test: /agarre abierto|agarre amplio/, tokens: ['wide'] },
    { test: /pared/, tokens: ['wall'] },
];

/**
 * Soft hints: useful to rank candidates, but the dataset frequently omits them
 * ("dumbbell incline curl" never says "bench").
 */
const SOFT_HINTS = [
    { test: /banco/, tokens: ['bench'] },
    { test: /curl de biceps|curl biceps/, tokens: ['biceps'] },
    { test: /sentado/, tokens: ['seated'] },
    { test: /de pie/, tokens: ['standing'] },
    { test: /tumbado/, tokens: ['lying'] },
    { test: /barra alta/, tokens: ['high'] },
    { test: /barra baja/, tokens: ['low'] },
];

/** Extracts the English tokens a catalog name requires. */
function catalogTokens(catalogName) {
    const normalized = normalizeExerciseName(catalogName);
    const movement = MOVEMENT_RULES.find(rule => rule.test.test(normalized));
    const hints = HINTS.filter(hint => hint.test.test(normalized)).flatMap(hint => hint.tokens);
    const optional = SOFT_HINTS.filter(hint => hint.test.test(normalized)).flatMap(hint => hint.tokens);
    return {
        movement: movement?.tokens ?? null,
        required: [...(movement?.tokens ?? []), ...hints],
        optional,
    };
}

/**
 * Equipment implied by the movement when the coach did not name any
 * ("CURL MARTILLO" → dumbbell). First match wins.
 */
const DEFAULT_EQUIPMENT = [
    { test: /sin peso|peso corporal|en casa/, equipment: [] },
    { test: /drag curl/, equipment: ['barbell'] },
    { test: /curl arana/, equipment: ['ez', 'barbell', 'dumbbell'] },
    { test: /scott|predicador/, equipment: ['barbell', 'ez', 'dumbbell'] },
    { test: /curl femoral|leg curl/, equipment: ['lever'] },
    { test: /hack squat/, equipment: ['sled', 'barbell', 'smith'] },
    { test: /leg extension/, equipment: ['lever'] },
    { test: /jalon|extension de triceps|copa/, equipment: ['cable', 'dumbbell'] },
    { test: /peso muerto|hip thrust/, equipment: ['barbell'] },
    { test: /prensa/, equipment: ['sled', 'lever', 'smith'] },
    { test: /elevaciones laterales|elevaciones frontales|aperturas|peck fly|encogimiento|martillo|curl/, equipment: ['dumbbell'] },
    { test: /patada/, equipment: ['cable'] },
];

/** Equipment keys allowed for a catalog row (explicit first, movement default else). */
function equipmentAllowed(catalogName) {
    const explicit = requestedEquipment(catalogName);
    if (explicit.length > 0) {
        const allowed = new Set(explicit);
        // An EZ bar is a barbell variant.
        if (allowed.has('ez')) allowed.add('barbell');
        return allowed;
    }

    const normalized = normalizeExerciseName(catalogName);
    const fallback = DEFAULT_EQUIPMENT.find(entry => entry.test.test(normalized));
    return new Set(fallback?.equipment ?? []);
}

/** True when both names agree on the equipment. */
function equipmentMatches(catalogName, datasetName) {
    const allowed = equipmentAllowed(catalogName);
    const used = datasetEquipment(datasetName);
    if (allowed.size === 0) return used.length === 0;
    return used.length > 0 && used.every(key => allowed.has(key));
}


/** Splits a token into its alternatives ("one arm|single arm"). */
function alternatives(token) {
    return token.split('|');
}

/** A token matches when any of its alternatives appears in the name. */
function tokenMatches(name, token) {
    return alternatives(token).some(alt => name.includes(alt));
}

/**
 * Scores a dataset record against the tokens extracted from a catalog name.
 * Returns 0 when any required token is missing.
 */
function scoreDatasetRecord(datasetName, tokens) {
    if (!tokens.length) return 0;
    const normalized = normalizeExerciseName(datasetName);
    const matched = tokens.filter(token => tokenMatches(normalized, token)).length;
    return matched / tokens.length;
}

/**
 * Equipment keys implied by a Spanish catalog name, and how each key is spelled
 * inside a dataset (English) name. A candidate must use exactly the equipment
 * the coach asked for: "CURL CON BARRA Z" must not resolve to a cable curl.
 */
const EQUIPMENT_FROM_SPANISH = [
    { key: 'ez', spanish: /barra z/ },
    { key: 'smith', spanish: /multipower/ },
    { key: 'cable', spanish: /polea/ },
    { key: 'lever', spanish: /maquina|palanca/ },
    { key: 'sled', spanish: /prensa/ },
    { key: 'dumbbell', spanish: /mancuerna/ },
    { key: 'barbell', spanish: /barra/ },
    { key: 'band', spanish: /banda|goma elastica/ },
    { key: 'kettlebell', spanish: /kettlebell/ },
    { key: 'ball', spanish: /fitball|pelota|bola/ },
    { key: 'plate', spanish: /disco/ },
];

const EQUIPMENT_IN_ENGLISH = {
    ez: /\bez\b/,
    smith: /\bsmith\b/,
    cable: /\bcable\b/,
    lever: /\b(lever|machine)\b/,
    sled: /\bsled\b/,
    dumbbell: /\bdumbbell\b/,
    barbell: /\b(barbell|olympic|trap bar)\b/,
    band: /\b(band|resistance band)\b/,
    kettlebell: /\bkettlebell\b/,
    ball: /\bball\b/,
    plate: /\bplate\b/,
};

/** Equipment keys requested by a catalog name ("barra z" implies ez, not barbell). */
function requestedEquipment(catalogName) {
    const normalized = normalizeExerciseName(catalogName);
    const keys = EQUIPMENT_FROM_SPANISH
        .filter(entry => entry.spanish.test(normalized))
        .map(entry => entry.key);
    // "barra z" is an EZ bar, not a straight barbell.
    if (keys.includes('ez') && keys.includes('barbell')) {
        return keys.filter(key => key !== 'barbell');
    }
    return keys;
}

/** Equipment keys actually used by a dataset name. */
const equipmentCache = new Map();

function datasetEquipment(datasetName) {
    const cached = equipmentCache.get(datasetName);
    if (cached) return cached;

    const normalized = normalizeExerciseName(datasetName);
    const keys = Object.entries(EQUIPMENT_IN_ENGLISH)
        .filter(([, pattern]) => pattern.test(normalized))
        .map(([key]) => key);

    equipmentCache.set(datasetName, keys);
    return keys;
}

/**
 * Modifiers the Spanish name does NOT ask for. A candidate carrying one of them
 * describes a variation (reverse, high, deficit…) the coach never mentioned.
 */
const MODIFIERS = [
    { english: /\bhigh\b/, spanish: /alta|alto/ },
    { english: /\blow\b/, spanish: /baja|bajo/ },
    { english: /\b(reverse|supinated|pronated|prone)\b/, spanish: /invers|supin|prono/ },
    { english: /\btwisting\b/, spanish: /giro|twist/ },
    { english: /\b(alternate|alternating|alternated)\b/, spanish: /altern/ },
    { english: /\bassisted\b/, spanish: /asistid/ },
    { english: /\bdeficit\b/, spanish: /deficit/ },
    { english: /\bwide\b/, spanish: /abiert|amplio/ },
    { english: /\bclose\b/, spanish: /cerrad/ },
    { english: /\b(cross|crossed)\b/, spanish: /cruzad/ },
    { english: /\b(tuck|frog)\b/, spanish: /tuck|rana/ },
    { english: /\bjump\b/, spanish: /salto/ },
    { english: /\bjerk\b/, spanish: /envion/ },
    { english: /\bbike\b/, spanish: /bici/ },
    { english: /\bwalking\b/, spanish: /caminando|andando|caminadora|caminata/ },
    { english: /\bsphinx\b/, spanish: /esfinge/ },
    { english: /\bincline\b/, spanish: /inclinad|pies elevados/ },
    { english: /\bdecline\b/, spanish: /declinad|pies elevados/ },
    { english: /\b(one arm|single arm|one leg|single leg)\b/, spanish: /unilateral|una mano|un brazo|una pierna/ },
    { english: /\bhanging\b/, spanish: /colgad/ },
    { english: /\b(three|two)\b/, spanish: /\btres\b|\bdos\b|\bdoble\b/ },
    { english: /\bweighted\b/, spanish: /lastre|con peso|mochila/ },
    { english: /\bbent\b/, spanish: /flexionad|remo con barra/ },
    { english: /\bfront\b/, spanish: /frontal|delantero/ },
    { english: /\bstretch\b/, spanish: /estiramiento|estirar/ },
    { english: /\bmarch\b/, spanish: /marcha|caminando en el sitio/ },
    { english: /\b(v\. 2|v 2)\b/, spanish: /v 2/ },
];

/** True when the dataset name carries a variation the catalog name never asked for. */
function hasUnsolicitedModifier(catalogName, datasetName) {
    const normalizedCatalog = normalizeExerciseName(catalogName);
    const normalizedDataset = normalizeExerciseName(datasetName);
    return MODIFIERS.some(modifier => modifier.english.test(normalizedDataset) && !modifier.spanish.test(normalizedCatalog));
}

/**
 * Picks the best dataset record for one catalog row, or explains why it cannot.
 * Returns { record } on success or { reason, candidates } when manual curation
 * is needed. Precision matters: a wrong match would attach the wrong GIF and
 * the wrong muscles to a coach's exercise.
 */
function matchCatalogRow(catalogRow, datasetRecords) {
    const normalizedName = normalizeExerciseName(catalogRow.name);
    if (NO_DATASET_EQUIVALENT.some(pattern => pattern.test(normalizedName))) {
        return { reason: 'no-equivalent', tokens: [] };
    }

    const { required, optional, movement } = catalogTokens(catalogRow.name);
    if (!movement) return { reason: 'no-rule', tokens: required };

    const scored = datasetRecords
        .filter(record => isCompatibleCategory(catalogRow.muscle_category, categoryForDataset(record)))
        .filter(record => !hasUnsolicitedModifier(catalogRow.name, record.name))
        .filter(record => equipmentMatches(catalogRow.name, record.name))
        .map(record => ({
            record,
            score: scoreDatasetRecord(record.name, required),
            optionalScore: scoreDatasetRecord(record.name, optional),
            words: normalizeExerciseName(record.name).split(' ').length,
        }))
        .filter(candidate => candidate.score >= 1)
        .sort((a, b) =>
            b.optionalScore - a.optionalScore
            || a.words - b.words
            || a.record.name.length - b.record.name.length);

    if (scored.length === 0) return { reason: 'no-candidate', tokens: required };
    if (scored.length === 1) return { record: scored[0].record, tokens: required };

    const [best, runnerUp] = scored;
    const bestKey = `${best.optionalScore}/${best.words}/${best.record.name.length}`;
    const runnerKey = `${runnerUp.optionalScore}/${runnerUp.words}/${runnerUp.record.name.length}`;
    if (bestKey !== runnerKey) return { record: best.record, tokens: required };

    return { reason: 'ambiguous', tokens: required, candidates: scored.slice(0, 5).map(candidate => candidate.record.name) };
}

module.exports = {
    normalizeExerciseName,
    CATEGORY_BY_BODY_PART,
    CATEGORY_BY_TARGET,
    COMPATIBLE_CATEGORIES,
    categoryForDataset,
    isCompatibleCategory,
    titleCase,
    cleanDatasetName,
    catalogTokens,
    scoreDatasetRecord,
    tokenMatches,
    requestedEquipment,
    datasetEquipment,
    hasUnsolicitedModifier,
    equipmentMatches,
    equipmentAllowed,
    matchCatalogRow,
};

