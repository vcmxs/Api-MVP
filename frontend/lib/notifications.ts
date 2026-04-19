// Notification formatting — mirrors the mobile i18n template logic.
//
// The backend stores notification params as a JSON string in the `message`
// field, e.g. {"name":"Carmen Centeno","workoutName":"Isquios y gluteos"}.
// The `title` field can also be a raw JSON string in some cases.
// This module parses those fields and returns human-readable text.

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

// Templates matching the mobile en.json keys
const TEMPLATES: Record<string, { title: string; body: (p: Record<string, string>) => string }> = {
  workout_completed: {
    title: "Workout Completed",
    body: (p) => p.name && p.workoutName
      ? `${p.name} completed the workout: ${p.workoutName}`
      : p.name ? `${p.name} completed a workout` : "A trainee completed a workout",
  },
  workout_assigned: {
    title: "Workout Assigned",
    body: (p) => p.name && p.workoutName
      ? `${p.name} assigned you a new workout: ${p.workoutName}`
      : p.workoutName ? `New workout assigned: ${p.workoutName}` : "A new workout was assigned",
  },
  subscription_expiring: {
    title: "Subscription Expiring Soon",
    body: (p) => p.name
      ? `${p.name}'s subscription is expiring soon`
      : "A trainee's subscription is expiring soon",
  },
  subscription_expired: {
    title: "Subscription Expired",
    body: (p) => p.name
      ? `${p.name}'s subscription has expired`
      : "A trainee's subscription has expired",
  },
  blast: {
    title: "Blast Message",
    body: (p) => p.message ?? p.body ?? "A blast message was sent",
  },
  new_trainee: {
    title: "New Trainee",
    body: (p) => p.name ? `${p.name} joined as a new trainee` : "A new trainee joined",
  },
}

export function formatNotification(n: RawNotification): Formatted {
  const type = n.type ?? ""

  // Parse both fields — sometimes only one is JSON
  const msgParams = tryParse(n.message ?? n.body)
  const titleParams = tryParse(n.title)
  const params = { ...msgParams, ...titleParams }

  // Check if message field itself is a plain readable string (not JSON)
  const rawMessage =
    Object.keys(msgParams).length === 0 ? (n.message ?? n.body ?? "") : ""

  // Check if title is a plain readable string
  const rawTitle =
    Object.keys(titleParams).length === 0 ? (n.title ?? "") : ""

  const template = TEMPLATES[type.toLowerCase()]

  if (template) {
    return {
      title: rawTitle || template.title,
      body: rawMessage || template.body(params),
    }
  }

  // Unknown type — fall back to whatever strings are available
  return {
    title: rawTitle || type || "Notification",
    body: rawMessage || (Object.keys(params).length ? Object.values(params).join(" — ") : ""),
  }
}
