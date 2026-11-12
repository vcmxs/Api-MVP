import type { ReactNode } from "react"
import {
  Bell, CheckCircle, Dumbbell, AlertTriangle, XCircle, Megaphone, UserMinus, Clock, MessageCircle,
} from "lucide-react"

// Shared visual language for notifications: used by the notifications list,
// the recent-activity cards and the in-app toast popups.
export interface NotificationVisual {
  accentColor: string
  icon: ReactNode
}

export function getNotificationConfig(type: string, iconClassName = "h-4 w-4"): NotificationVisual {
  const t = (type ?? "").toLowerCase()
  if (t.includes("completed")) return { accentColor: "#00ff88", icon: <CheckCircle className={iconClassName} /> }
  if (t.includes("assigned") || t.includes("workout")) return { accentColor: "#00ffff", icon: <Dumbbell className={iconClassName} /> }
  if (t.includes("expiring")) return { accentColor: "#ffd700", icon: <AlertTriangle className={iconClassName} /> }
  if (t.includes("reminder")) return { accentColor: "#ffd700", icon: <Clock className={iconClassName} /> }
  if (t.includes("expired") || t.includes("cancel")) return { accentColor: "#ff4444", icon: <XCircle className={iconClassName} /> }
  if (t.includes("unlinked")) return { accentColor: "#ff4444", icon: <UserMinus className={iconClassName} /> }
  if (t === "direct_message") return { accentColor: "#a78bfa", icon: <MessageCircle className={iconClassName} /> }
  if (t.includes("blast") || t.includes("message")) return { accentColor: "#a78bfa", icon: <Megaphone className={iconClassName} /> }
  return { accentColor: "#888888", icon: <Bell className={iconClassName} /> }
}

// Relative timestamp ("5m ago"), using the same keys as the notifications view.
export function formatTimeAgo(dateStr?: string, t?: any): string {
  if (!dateStr) return ""
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  const nv = t?.notificationsView
  if (m < 1) return nv?.justNow || "Just now"
  if (m < 60) return `${m}${nv?.minutesAgo || "m ago"}`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}${nv?.hoursAgo || "h ago"}`
  const d = Math.floor(h / 24)
  if (d === 1) return nv?.yesterday || "Yesterday"
  return `${d}${nv?.daysAgo || "d ago"}`
}
