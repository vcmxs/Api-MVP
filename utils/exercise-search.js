// utils/exercise-search.js
//
// Search helpers for `GET /api/v1/exercises`.
//
// The catalog keeps the taxonomy in two languages: `muscle_category` is stored
// in Spanish uppercase ("PECTORAL", "GLÚTEOS", "ISQUIOSURAL") while
// `target_muscle`, `muscle_group`, `body_part` and `equipment` come from the
// English dataset ("pectorals", "chest", "dumbbell"). A coach types "pecho" or
// "mancuerna", so every query token is expanded to the words that can appear in
// a row before it reaches SQL.
//
// Rules for the groups below:
// - `keys` are single words; they are matched against normalized query tokens.
// - `phrases` may contain spaces. They are only used as LIKE targets, never as
//   tokens, so an English query such as "body weight" still works: its tokens
//   match the stored equipment string word by word without an alias.
// - Everything is lowercase, accent-free and single-spaced; compare with
//   normalizeExerciseSearch(). The groups are intentionally conservative: a
//   synonym widens the result set, so only add words that really describe the
//   same muscle/equipment.

const SYNONYM_GROUPS = [
  // ── Muscles ───────────────────────────────────────────────────────────────
  { keys: ['pecho', 'pechos', 'pectoral', 'pectorales', 'pectorals', 'chest'], phrases: [] },
  { keys: ['espalda', 'dorsal', 'dorsales', 'lats', 'latissimus', 'back'], phrases: ['upper back', 'latissimus dorsi'] },
  { keys: ['hombro', 'hombros', 'deltoides', 'deltoid', 'deltoids', 'delts', 'shoulder', 'shoulders'], phrases: ['rear deltoids'] },
  { keys: ['biceps', 'bicep'], phrases: [] },
  { keys: ['triceps', 'tricep'], phrases: [] },
  { keys: ['antebrazo', 'antebrazos', 'forearm', 'forearms', 'wrist', 'wrists', 'muneca', 'munecas'], phrases: ['wrist flexors', 'wrist extensors'] },
  { keys: ['gluteo', 'gluteos', 'glutes', 'glute'], phrases: [] },
  { keys: ['cuadriceps', 'quadriceps', 'quads', 'cuadricipital'], phrases: [] },
  { keys: ['femoral', 'femorales', 'isquios', 'isquio', 'isquiosural', 'isquiotibiales', 'hamstring', 'hamstrings'], phrases: [] },
  { keys: ['gemelo', 'gemelos', 'pantorrilla', 'pantorrillas', 'calf', 'calves', 'soleo', 'soleus'], phrases: [] },
  { keys: ['abdomen', 'abdominal', 'abdominales', 'abs', 'core', 'oblicuo', 'oblicuos', 'oblique', 'obliques', 'waist'], phrases: [] },
  { keys: ['lumbar', 'lumbares', 'spine', 'erector'], phrases: ['lower back', 'erector spinae'] },
  { keys: ['trapecio', 'trapecios', 'trapezius', 'traps'], phrases: [] },
  { keys: ['aductor', 'aductores', 'adductor', 'adductors'], phrases: [] },
  { keys: ['abductor', 'abductores', 'abductors'], phrases: [] },
  { keys: ['cuello', 'neck'], phrases: ['levator scapulae'] },
  { keys: ['serrato', 'serratus'], phrases: ['serratus anterior'] },
  { keys: ['manguito', 'rotador', 'rotadores', 'cuff'], phrases: ['rotator cuff'] },
  { keys: ['cadera', 'hip', 'hips'], phrases: ['hip flexors'] },
  { keys: ['pierna', 'piernas', 'leg', 'legs'], phrases: ['upper legs', 'lower legs'] },
  // ── Equipment ─────────────────────────────────────────────────────────────
  { keys: ['barra', 'barras', 'barbell', 'barbells'], phrases: ['ez barbell', 'e z curl bar', 'olympic barbell', 'trap bar'] },
  { keys: ['mancuerna', 'mancuernas', 'dumbbell', 'dumbbells'], phrases: [] },
  { keys: ['polea', 'poleas', 'cable', 'cables'], phrases: [] },
  { keys: ['maquina', 'maquinas', 'machine', 'machines'], phrases: ['leverage machine', 'smith machine', 'sled machine', 'stepmill machine', 'elliptical machine', 'skierg machine', 'upper body ergometer'] },
  { keys: ['peso', 'corporal', 'corporales', 'bodyweight', 'calistenia', 'calisthenics'], phrases: ['body weight'] },
  { keys: ['banda', 'bandas', 'band', 'bands', 'goma', 'gomas'], phrases: ['resistance band'] },
  { keys: ['kettlebell', 'kettlebells', 'rusa', 'rusas'], phrases: ['pesa rusa'] },
  { keys: ['fitball', 'balon', 'balones', 'bosu', 'pelota'], phrases: ['stability ball', 'medicine ball', 'bosu ball'] },
  { keys: ['cuerda', 'cuerdas', 'rope', 'ropes'], phrases: [] },
  { keys: ['trineo', 'sled'], phrases: ['sled machine'] },
  { keys: ['cinta', 'caminadora', 'treadmill'], phrases: [] },
  { keys: ['bici', 'bicicleta', 'bike', 'bicycle'], phrases: ['stationary bike'] },
  { keys: ['eliptica', 'eliptico', 'elliptical'], phrases: ['elliptical machine'] },
  { keys: ['escaladora', 'escalador', 'stepmill'], phrases: ['stepmill machine'] },
  { keys: ['mazo', 'hammer'], phrases: [] },
  { keys: ['rueda', 'ruedas', 'roller', 'wheel'], phrases: ['wheel roller'] },
  { keys: ['neumatico', 'neumaticos', 'tire'], phrases: [] },
  { keys: ['asistido', 'asistida', 'assisted'], phrases: [] },
  { keys: ['lastrado', 'lastrada', 'lastre', 'weighted'], phrases: [] },
  { keys: ['ergometro', 'ergometer'], phrases: ['upper body ergometer', 'skierg machine'] },
];

/** token → every word/phrase that can appear in the haystack for that token. */
const TOKEN_ALIASES = new Map();
for (const group of SYNONYM_GROUPS) {
  const targets = new Set([...group.keys, ...group.phrases]);
  for (const key of group.keys) {
    const aliases = TOKEN_ALIASES.get(key) || new Set();
    for (const target of targets) aliases.add(target);
    TOKEN_ALIASES.set(key, aliases);
  }
}

/**
 * Lowercase, accent-stripped, single-spaced text used by the SQL haystack.
 * Same normalization as frontend/lib/exercise-media.ts and the
 * `exercise_normalize_name()` SQL function — keep all three in sync.
 */
function normalizeExerciseSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Expands one normalized query token with its ES/EN aliases.
 * Multi-word input is the caller's job to split; a token that still contains a
 * space is returned untouched so it can only match literally.
 */
function expandExerciseToken(token) {
  const normalized = normalizeExerciseSearch(token);
  if (!normalized) return [];
  return Array.from(new Set([normalized, ...(TOKEN_ALIASES.get(normalized) || [])]));
}

module.exports = {
  EXERCISE_SYNONYM_GROUPS: SYNONYM_GROUPS,
  expandExerciseToken,
  normalizeExerciseSearch,
};
