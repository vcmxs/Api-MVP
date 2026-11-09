/**
 * Spanish labels for the exercise catalog taxonomy.
 *
 * The exercises dataset ships an English `name` and English `equipment`
 * values while `muscle_category` is stored in Spanish and uppercase
 * ("PECHO"). The picker shows the translated equipment next to the muscle
 * group so a trainee-facing app does not read as a raw dump of the dataset.
 */

const EQUIPMENT_ES: Record<string, string> = {
  "assisted": "Asistido",
  "band": "Banda elástica",
  "barbell": "Barra",
  "body weight": "Peso corporal",
  "bodyweight": "Peso corporal",
  "bosu ball": "Bosu",
  "cable": "Polea",
  "dumbbell": "Mancuerna",
  "e-z curl bar": "Barra Z",
  "elliptical": "Elíptica",
  "ez barbell": "Barra Z",
  "hammer": "Mazo",
  "kettlebell": "Kettlebell",
  "leverage machine": "Máquina",
  "machine": "Máquina",
  "medicine ball": "Balón medicinal",
  "olympic barbell": "Barra olímpica",
  "resistance band": "Banda elástica",
  "rope": "Cuerda",
  "skierg machine": "Esquí ergómetro",
  "sled": "Trineo",
  "smith machine": "Máquina Smith",
  "stability ball": "Fitball",
  "stationary bike": "Bicicleta fija",
  "stepmill machine": "Escaladora",
  "tire": "Neumático",
  "trap bar": "Barra hexagonal",
  "treadmill": "Cinta de correr",
  "upper body ergometer": "Ergómetro",
  "weighted": "Con peso",
  "wheel roller": "Rueda abdominal",
}

const SMALL_WORDS = new Set(["de", "del", "la", "las", "el", "los", "y", "en"])

/** "PECHO" → "Pecho", "ESPALDA BAJA" → "Espalda baja". */
export function titleCaseLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word, index) => (
      index > 0 && SMALL_WORDS.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)
    ))
    .join(" ")
}

/** Muscle group chip/title: dataset rows are already Spanish, just re-cased. */
export function categoryLabel(value?: string | null): string | null {
  if (!value) return null
  const label = titleCaseLabel(value)
  return label || null
}

/** Equipment in Spanish, falling back to the re-cased English value. */
export function equipmentLabel(value?: string | null): string | null {
  if (!value) return null
  const key = value.trim().toLowerCase().replace(/\s+/g, " ")
  const label = EQUIPMENT_ES[key] ?? titleCaseLabel(value)
  return label || null
}

/**
 * One-line descriptor under an exercise card: "Pecho · Barra".
 * Returns `null` when the row carries no taxonomy at all.
 */
export function exerciseCardSubtitle(exercise: {
  muscle_category?: string | null
  muscle_group?: string | null
  equipment?: string | null
}): string | null {
  const parts = [
    categoryLabel(exercise.muscle_category ?? exercise.muscle_group ?? null),
    equipmentLabel(exercise.equipment ?? null),
  ].filter((part): part is string => Boolean(part))
  return parts.length ? parts.join(" · ") : null
}
