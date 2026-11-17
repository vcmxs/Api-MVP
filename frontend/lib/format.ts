/**
 * Numeric formatting helpers shared by the workout builders.
 *
 * Weights, distances and cardio durations are stored as `DECIMAL(10, 2)`
 * (db.js), so the API can hand back a number (via `parseFloat`) or a raw
 * numeric string such as "2.50". Rendering those values directly leaks the
 * SQL scale into the UI ("2.50 kg"), so everything user-facing goes through
 * these helpers instead.
 */

/**
 * Renders a numeric value without the trailing zeros of its storage scale:
 * 2.5 -> "2.5", 20 -> "20", "2.50" -> "2.5", 0.5 -> "0.5".
 * Returns "" for null / undefined / NaN so callers can skip rendering.
 */
export function formatDecimal(value: number | string | null | undefined, maxDecimals = 2): string {
  if (value === null || value === undefined || value === "") return ""

  const num = typeof value === "string" ? parseFloat(value) : value
  if (!Number.isFinite(num)) return ""

  const factor = 10 ** maxDecimals
  return String(Math.round(num * factor) / factor)
}

/**
 * "2.5kg" / "20kg" label used across workout cards and detail sheets.
 * Pass an empty unit to get the bare number.
 */
export function formatWeight(
  value: number | string | null | undefined,
  unit = "kg",
  maxDecimals = 2,
): string {
  const formatted = formatDecimal(value, maxDecimals)
  return formatted === "" ? "" : `${formatted}${unit}`
}

/**
 * Load types we store in `exercises.weight_unit` / `exercise_logs.weight_unit`.
 *
 * `plates` is a machine-plate stack: the stored number is a plate count, not a
 * mass, so it must never be rendered with a "kg" suffix nor fed into the Epley
 * 1RM estimate.
 */
export type LoadUnit = "kg" | "lb" | "plates"

/** True when the stored unit is the plate-stack load type. */
export function isPlatesUnit(unit: string | null | undefined): boolean {
  return String(unit ?? "").trim().toLowerCase() === "plates"
}

/** Collapses whatever the API stored into one of the known load types. */
export function normalizeLoadUnit(unit: string | null | undefined): LoadUnit {
  const raw = String(unit ?? "").trim().toLowerCase()
  if (raw === "plates" || raw === "plate") return "plates"
  if (raw === "lb" || raw === "lbs") return "lb"
  return "kg"
}

/**
 * Load label that respects the load type: "60kg", "132lb" and "12 plates"
 * (a plate count reads as "12plates" otherwise, which is easy to misread as a
 * mass). `platesLabel` is the translated word for "plates"; when omitted the
 * English plural is used so unit-less call sites still behave sanely.
 */
export function formatLoad(
  value: number | string | null | undefined,
  unit: string | null | undefined,
  platesLabel = "plates",
  maxDecimals = 2,
): string {
  const formatted = formatDecimal(value, maxDecimals)
  if (formatted === "") return ""

  const loadUnit = normalizeLoadUnit(unit)
  return loadUnit === "plates" ? `${formatted} ${platesLabel}` : `${formatted}${loadUnit}`
}
