/**
 * Trainee capacity per plan, mirrored from `config/subscriptionTiers.js` on the
 * API. All plans ship the same features; only the trainee count changes, so
 * this map is the single web-side source of truth for limits and badges.
 *
 * Keep it in sync with the backend, or the UI will disagree with the API.
 */
export const UNLIMITED_TRAINEES = 999

export const TIER_LIMITS: Record<string, number> = {
  starter: 1,
  bronze: 5,
  silver: 15,
  gold: UNLIMITED_TRAINEES,
}

/** Limit for a tier name (case-insensitive); unknown tiers fall back to 1. */
export function getTraineeLimit(tier?: string | null): number {
  return TIER_LIMITS[(tier ?? 'starter').toLowerCase()] ?? 1
}

/** Human label for a limit: `∞` once the tier is unlimited. */
export function formatTraineeLimit(limit: number): string {
  return limit >= UNLIMITED_TRAINEES ? '∞' : String(limit)
}
