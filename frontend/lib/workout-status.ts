/**
 * Single source of truth for how a workout status is drawn.
 *
 * The dashboard agenda and any future list need the same pill colours and the
 * same i18n key, so they live here instead of being copied per component.
 * `labelKey` points into the `workouts` block of the locale files.
 */

export type WorkoutStatus = "assigned" | "in_progress" | "completed" | "pending"

export interface WorkoutStatusStyle {
  bg: string
  text: string
  labelKey: "statusAssigned" | "statusInProgress" | "statusCompleted" | "statusPending"
}

export function normalizeWorkoutStatus(status?: string | null): WorkoutStatus {
  switch (String(status ?? "").toLowerCase()) {
    case "completed":
      return "completed"
    case "in_progress":
    case "in-progress":
    case "started":
      return "in_progress"
    case "assigned":
      return "assigned"
    default:
      return "pending"
  }
}

export function getWorkoutStatusStyle(status?: string | null): WorkoutStatusStyle {
  switch (normalizeWorkoutStatus(status)) {
    case "completed":
      return { bg: "rgba(0,255,136,0.15)", text: "#00ff88", labelKey: "statusCompleted" }
    case "in_progress":
      return { bg: "rgba(0,255,255,0.15)", text: "#00ffff", labelKey: "statusInProgress" }
    case "assigned":
      return { bg: "rgba(255,215,0,0.15)", text: "#ffd700", labelKey: "statusAssigned" }
    default:
      return { bg: "rgba(255,255,255,0.08)", text: "#888888", labelKey: "statusPending" }
  }
}
