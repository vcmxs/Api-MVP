"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Bell, Trash2, Check, Loader2, RefreshCw, MessageCircle } from "lucide-react"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { apiFetch } from "@/lib/api"
import { formatNotification } from "@/lib/notifications"
import { formatTimeAgo, getNotificationConfig } from "@/lib/notification-display"
import { useT } from "@/lib/i18n"

// ── API types ─────────────────────────────────────────────────────────────

interface ApiNotification {
  id: number
  type: string
  title: string
  message?: string
  body?: string
  createdAt?: string
  created_at?: string
  is_read: boolean
  related_id?: number
}

// ── Component ─────────────────────────────────────────────────────────────

export function NotificationsView({ onOpenMessage }: { onOpenMessage?: (userId: number) => void } = {}) {
  const { t } = useT()
  const [notifications, setNotifications] = useState<ApiNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [hoveredId, setHoveredId] = useState<number | null>(null)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch<{ notifications: ApiNotification[] }>("/notifications")
      const sorted = (data.notifications ?? []).sort(
        (a, b) => new Date(b.createdAt ?? b.created_at ?? 0).getTime() - new Date(a.createdAt ?? a.created_at ?? 0).getTime()
      )
      setNotifications(sorted)
    } catch {
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const handleMarkRead = async (id: number) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
    try { await apiFetch(`/notifications/${id}/read`, { method: "PATCH" }) } catch { /* ignore */ }
  }

  // "Mark all read" never touches message notifications: those only clear when
  // the conversation is opened (the API applies the same rule).
  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => n.type === "direct_message" ? n : { ...n, is_read: true }))
    try { await apiFetch("/notifications/read-all", { method: "PATCH" }) } catch { /* ignore */ }
  }

  // Clicking a card reads it; message notifications also open the chat
  const handleOpen = (n: ApiNotification) => {
    if (!n.is_read) handleMarkRead(n.id)
    if (n.type === "direct_message" && n.related_id) onOpenMessage?.(n.related_id)
  }

  // Opening this tab clears the non-message rows on its own
  const clearedOnMountRef = useRef(false)
  useEffect(() => {
    if (clearedOnMountRef.current) return
    const pending = notifications.some((n) => !n.is_read && n.type !== "direct_message")
    if (!pending) return
    clearedOnMountRef.current = true
    handleMarkAllRead()
  }, [notifications]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    try { await apiFetch(`/notifications/${id}`, { method: "DELETE" }) } catch { /* ignore */ }
  }

  const handleClearAll = async () => {
    const ids = notifications.map((n) => n.id)
    setNotifications([])
    setShowClearDialog(false)
    await Promise.allSettled(ids.map((id) => apiFetch(`/notifications/${id}`, { method: "DELETE" })))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">{t.notificationsView?.title || "Notifications"}</h2>
          {unreadCount > 0 && (
            <p className="text-sm text-[#888888]">{unreadCount} {t.notificationsView?.unread || "unread"}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchNotifications}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#161b22] text-[#888888] transition-colors hover:text-white"
            title={t.common?.refresh || "Refresh"}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#161b22] px-4 py-2.5 text-sm font-medium text-[#888888] transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {t.notificationsView?.markAllRead || "Mark All Read"}
          </button>
          <button
            onClick={() => setShowClearDialog(true)}
            disabled={notifications.length === 0}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#161b22] px-4 py-2.5 text-sm font-medium text-[#ff4444] transition-colors hover:bg-[#ff4444]/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {t.notificationsView?.clearAll || "Clear All"}
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#555555]" />
          <p className="text-sm text-[#555555]">{t.notificationsView?.loading || "Loading notifications..."}</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-[#161b22] py-20">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(136,136,136,0.15)" }}>
            <Bell className="h-8 w-8 text-[#555555]" />
          </div>
          <p className="text-lg font-medium text-[#888888]">{t.notificationsView?.emptyState || "No notifications yet."}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((n) => {
            const config = getNotificationConfig(n.type, "h-5 w-5")
            const isHovered = hoveredId === n.id
            const timestamp = formatTimeAgo(n.createdAt ?? n.created_at, t)

            const fmt = formatNotification(n, t)
            return (
              <div
                key={n.id}
                className="group relative flex cursor-pointer items-start gap-4 rounded-2xl border bg-[#161b22] p-5 transition-all"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  borderLeftWidth: "4px",
                  borderLeftColor: n.is_read ? "rgba(136,136,136,0.3)" : config.accentColor,
                  opacity: n.is_read ? 0.65 : 1,
                }}
                onMouseEnter={() => setHoveredId(n.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => handleOpen(n)}
              >
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: n.is_read ? "rgba(136,136,136,0.15)" : `${config.accentColor}26` }}
                >
                  <div style={{ color: n.is_read ? "#555555" : config.accentColor }}>{config.icon}</div>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[17px] font-semibold leading-snug" style={{ color: n.is_read ? "#888888" : config.accentColor }}>
                    {fmt.title}
                  </p>
                  {fmt.body && <p className="mt-2 break-words text-[15px] leading-relaxed text-[#888888]">{fmt.body}</p>}
                  {timestamp && <p className="mt-3 text-xs text-[#555555]">{timestamp}</p>}
                </div>

                <div className="flex items-center gap-2">
                  {n.type === "direct_message" && (
                    <MessageCircle
                      className="h-4 w-4 shrink-0"
                      style={{ color: n.is_read ? "#555555" : config.accentColor }}
                    />
                  )}
                  {!n.is_read && !isHovered && (
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: config.accentColor }} />
                  )}
                  {isHovered && !n.is_read && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id) }}
                      title={t.notificationsView?.markRead || "Mark as read"}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00ffff]/10 text-[#00ffff] transition-colors hover:bg-[#00ffff]/20"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  {isHovered && (
                    <button
                      onClick={(e) => handleDelete(n.id, e)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff4444]/10 text-[#ff4444] transition-colors hover:bg-[#ff4444]/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Clear All Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="border-[#00ffff]/30 bg-[#161b22] text-white sm:max-w-md" style={{ borderWidth: "1px" }}>
          <DialogHeader>
            <DialogTitle className="text-white">{t.notificationsView?.clearDialogTitle || "Clear All Notifications"}</DialogTitle>
            <DialogDescription className="text-[#888888]">
              {t.notificationsView?.clearDialogDesc || "Are you sure you want to clear all notifications? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 sm:gap-3">
            <button
              onClick={() => setShowClearDialog(false)}
              className="flex-1 rounded-xl border border-white/[0.08] bg-[#161b22] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1c2128]"
            >
              {t.common?.cancel || "Cancel"}
            </button>
            <button
              onClick={handleClearAll}
              className="flex-1 rounded-xl bg-[#ff4444] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#ff4444]/90"
            >
              {t.notificationsView?.deleteAll || "Delete All"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
