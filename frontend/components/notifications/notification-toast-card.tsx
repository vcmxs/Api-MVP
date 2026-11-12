"use client"

import { X } from "lucide-react"
import { formatNotification } from "@/lib/notifications"
import type { RawNotification } from "@/lib/notifications"
import { formatTimeAgo, getNotificationConfig } from "@/lib/notification-display"

interface NotificationToastCardProps {
  notification: RawNotification
  t: any
  onDismiss: () => void
  onOpen: () => void
}

/**
 * Compact, truncated popup for a single notification. Full text always remains
 * available in the notifications view; here the body is clamped to two lines.
 */
export function NotificationToastCard({ notification, t, onDismiss, onOpen }: NotificationToastCardProps) {
  const { title, body } = formatNotification(notification, t)
  const { accentColor, icon } = getNotificationConfig(notification.type)
  const time = formatTimeAgo(notification.createdAt ?? notification.created_at, t)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpen()
        }
      }}
      className="pointer-events-auto w-[var(--width)] max-w-[calc(100vw-2rem)] cursor-pointer rounded-2xl border border-white/[0.08] bg-[#161b22] p-4 shadow-2xl transition-transform hover:scale-[1.01]"
      style={{ borderLeftWidth: "4px", borderLeftColor: accentColor }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${accentColor}26`, color: accentColor }}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold leading-snug" style={{ color: accentColor }}>
              {title}
            </p>
            {time && <span className="shrink-0 text-[11px] text-[#555555]">{time}</span>}
          </div>
          {body && (
            <p className="mt-1 line-clamp-2 break-words text-xs leading-relaxed text-[#888888]" title={body}>
              {body}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDismiss()
          }}
          className="-mr-1 -mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[#555555] transition-colors hover:bg-white/[0.06] hover:text-white"
          aria-label={t?.common?.close || "Close"}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className="mt-2 text-[11px] font-medium text-[#00ffff]">{t?.common?.viewAll || "View all"}</p>
    </div>
  )
}
