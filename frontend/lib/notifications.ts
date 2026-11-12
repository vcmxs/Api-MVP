// Notification formatting — dictionary-first rendering.
//
// The backend stores notification params as a JSON string (normally in both
// `title` and `message`), e.g. {"name":"Carmen Centeno","workoutName":"Isquios"}.
// Older rows still carry English prose, so the templates below always win when a
// translation dictionary is available: legacy rows get localized too.

export interface RawNotification {
  id: number
  type: string
  title?: string
  message?: string
  body?: string
  createdAt?: string
  created_at?: string
  is_read: boolean
  related_id?: number
}

interface Formatted {
  title: string
  body: string
}

// Try to parse a string as JSON; return {} on failure
function tryParse(s?: string): Record<string, string> {
  if (!s || !s.trim().startsWith("{")) return {}
  try { return JSON.parse(s) } catch { return {} }
}

// {placeholder} interpolation. Missing values collapse to an empty string.
function fill(template: string, params: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => params[key] ?? "")
}

export function formatNotification(n: RawNotification, t?: any): Formatted {
  const type = (n.type ?? "").toLowerCase()
  const nv = t?.notificationsView as Record<string, string> | undefined

  // Params can live in either field — merge both
  const msgParams = tryParse(n.message ?? n.body)
  const titleParams = tryParse(n.title)
  const params: Record<string, string> = { ...titleParams, ...msgParams }

  // Human-written text (blasts and legacy prose rows)
  const rawMessage = Object.keys(msgParams).length === 0 ? (n.message ?? n.body ?? "") : ""
  const rawTitle = Object.keys(titleParams).length === 0 ? (n.title ?? "") : ""

  // Translation dictionary first, English default last
  const dict = (englishDefault: string, ...keys: string[]): string => {
    for (const key of keys) {
      const value = nv?.[key]
      if (typeof value === "string" && value.trim()) return value
    }
    return englishDefault
  }
  // Drops the "({date})" fragment when the row has no date param
  const withDate = (template: string): string =>
    params.date ? fill(template, params) : template.replace(/\s*\(\{date\}\)/, "")

  let title = ""
  let body = ""

  switch (type) {
    case "workout_completed":
      title = dict("Workout Completed", "workoutCompletedTitle")
      body = params.name && params.workoutName
        ? fill(dict("{name} completed the workout: {workoutName}", "workoutCompletedBodyWithWorkout"), params)
        : params.name
          ? fill(dict("{name} completed a workout", "workoutCompletedBodyNamed"), params)
          : dict("A trainee completed a workout", "workoutCompletedBodyAnon")
      break

    case "workout_assigned": {
      // Co-Op sessions share the type: `kind` is explicit for new rows and
      // legacy rows are detected by their English title.
      const coop = String(params.kind ?? "").toLowerCase() === "coop" || /co-?op/i.test(rawTitle)
      title = coop
        ? dict("New Co-Op Workout Assigned", "workoutAssignedTitleCoop", "workoutAssignedTitle")
        : dict("Workout Assigned", "workoutAssignedTitle")
      if (params.name && params.workoutName) {
        body = fill(coop
          ? dict("{name} assigned you a new Co-Op workout: {workoutName}", "workoutAssignedBodyCoop", "workoutAssignedBodyNamed")
          : dict("{name} assigned you a new workout: {workoutName}", "workoutAssignedBodyNamed"), params)
      } else if (params.workoutName) {
        body = fill(coop
          ? dict("New Co-Op workout assigned: {workoutName}", "workoutAssignedBodyCoopWorkout", "workoutAssignedBodyWorkout")
          : dict("New workout assigned: {workoutName}", "workoutAssignedBodyWorkout"), params)
      } else {
        body = coop
          ? dict("A new Co-Op workout was assigned", "workoutAssignedBodyCoopAnon", "workoutAssignedBodyAnon")
          : dict("A new workout was assigned", "workoutAssignedBodyAnon")
      }
      break
    }

    case "subscription_expiring":
      title = dict("Subscription Expiring Soon", "subExpiringTitle")
      body = params.name
        ? fill(dict("{name}'s subscription is expiring soon", "subExpiringBodyNamed"), params)
        : dict("A trainee's subscription is expiring soon", "subExpiringBodyAnon")
      break

    case "subscription_expired":
      title = dict("Subscription Expired", "subExpiredTitle")
      // No name means the row is about the user's own premium plan (cron downgrade)
      body = params.name
        ? fill(dict("{name}'s subscription has expired", "subExpiredBodyNamed"), params)
        : dict(
            "Your premium subscription has expired. You have been reverted to the Starter plan.",
            "subExpiredBodyOwn",
            "subExpiredBodyAnon",
          )
      break

    case "subscription_reminder": {
      const days = Number(params.days)
      title = dict("Subscription Reminder", "subReminderTitle")
      body = days === 3
        ? withDate(dict("Your subscription expires in 3 days ({date}). Renew now to keep your benefits!", "subReminderBody3Days"))
        : days === 1
          ? dict("Your subscription expires tomorrow! Renew now to avoid losing premium features.", "subReminderBodyTomorrow")
          : dict("Your subscription is about to expire. Renew now to keep your benefits.", "subReminderBodyGeneric")
      break
    }

    case "direct_message":
      title = params.name
        ? fill(dict("New message from {name}", "messageTitle"), params)
        : dict("New message", "messageTitleAnon")
      body = params.preview || params.message || rawMessage
      break

    case "blast":
      // User-authored copy: never replace it with a template
      title = rawTitle || dict("Blast Message", "blastTitle")
      body = params.message || params.body || rawMessage || dict("A blast message was sent", "blastBodyDefault")
      break

    case "new_trainee":
      title = dict("New Trainee", "newTraineeTitle")
      body = params.name
        ? fill(dict("{name} joined as a new trainee", "newTraineeBodyNamed"), params)
        : dict("A new trainee joined", "newTraineeBodyAnon")
      break

    case "coach_unlinked":
      title = dict("Coach unlinked", "coachUnlinkedTitle")
      body = params.name
        ? fill(dict("You are no longer training with {name}", "coachUnlinkedBody"), params)
        : dict("Your coach unlinked you", "coachUnlinkedBodyAnon")
      break

    case "trainee_unlinked":
      title = dict("Trainee unlinked", "traineeUnlinkedTitle")
      body = params.name
        ? fill(dict("{name} is no longer in your trainee list", "traineeUnlinkedBody"), params)
        : dict("A trainee left your list", "traineeUnlinkedBodyAnon")
      break

    default:
      // Unknown type: keep whatever text the backend stored
      title = rawTitle || type || dict("Notification", "notificationFallback")
      body = rawMessage || (Object.keys(params).length ? Object.values(params).join(" — ") : "")
  }

  return { title, body }
}
