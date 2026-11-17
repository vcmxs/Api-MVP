/**
 * Payment gating shared by the assign modals (`AssignWorkoutModal` and
 * `AssignPlanModal`).
 *
 * `GET /coaches/:id/trainees` already returns the coach-assigned subscription of
 * every trainee (`coach_subscription_status` / `coach_subscription_end_date`),
 * and `TraineesView` uses it to badge a lapsed trainee as "Expired". The assign
 * modals only checked the coach's tier limit, so a trainee the coach sees as
 * Expired could still receive a new workout or program. This keeps both screens
 * on the same rule, in one place.
 */

export interface TraineePayment {
  /** Subscription the coach assigned to the trainee. */
  coach_subscription_status?: string
  /** End date of that subscription (ISO string from the API). */
  coach_subscription_end_date?: string
}

/** Subscription states that mean the trainee holds no live payment. */
const INACTIVE_SUBSCRIPTION_STATUSES = new Set(["inactive", "cancelled", "free", "expired"])

/**
 * True when the trainee's coach-assigned subscription is not live: either its
 * status is cancelled/inactive, or its end date has already passed. A trainee
 * with no subscription row at all is considered active, so invitations that are
 * still pending payment are not blocked.
 *
 * Deliberately mirrors the "Expired" badge of `TraineeCard` in
 * `components/dashboard/trainees-view.tsx` (same two fields, same dead states,
 * plus `expired`, which is what `middleware/auth.js` checks for). It compares
 * the exact timestamp instead of that card's day-rounded `Math.ceil(...) < 0`,
 * so a payment that lapsed today is already blocked here — the modal label
 * says why. Pointing the card at this helper would remove the last 24h of
 * disagreement between the two screens.
 */
export function isPaymentInactive(trainee: TraineePayment): boolean {
  const status = String(trainee.coach_subscription_status ?? "").toLowerCase()
  if (INACTIVE_SUBSCRIPTION_STATUSES.has(status)) return true

  const end = trainee.coach_subscription_end_date
  if (!end) return false

  return new Date(end).getTime() < Date.now()
}
