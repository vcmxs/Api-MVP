// Where a notification should take the user when it is clicked.
//
// The bell, the Notifications tab and the in-app popups all used to route only
// `direct_message` to the chat and dump everything else on the Notifications
// list, even when the row pointed at a workout. Resolving the target in one
// place keeps the three entry points in sync.

import { parseNotificationParams, type RawNotification } from "@/lib/notifications"

export type NotificationTarget =
  | { kind: "message"; userId: number }
  | { kind: "workout"; workoutId: number; name?: string }
  | { kind: "whatsNew" }
  | { kind: "none" }

function positiveId(value: unknown): number | null {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

export function getNotificationTarget(n: RawNotification): NotificationTarget {
  const type = (n.type ?? "").toLowerCase()
  const params = parseNotificationParams(n)
  const relatedId = positiveId(n.related_id)

  switch (type) {
    case "direct_message": {
      // `related_id` is the other side of the conversation, so the chat opens
      // on that person instead of the message list.
      return relatedId ? { kind: "message", userId: relatedId } : { kind: "none" }
    }

    case "workout_completed":
    case "workout_assigned": {
      // `related_id` is the workout plan; the sheet fetches the plan itself, so
      // the name here is only the header placeholder while it loads.
      return relatedId
        ? { kind: "workout", workoutId: relatedId, name: params.workoutName }
        : { kind: "none" }
    }

    case "release_note":
      // Nothing to open by id: the note lives in Settings → What's new.
      return { kind: "whatsNew" }

    default:
      return { kind: "none" }
  }
}
