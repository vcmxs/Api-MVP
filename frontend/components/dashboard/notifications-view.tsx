"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Bell, CheckCircle, Dumbbell, AlertTriangle, XCircle,
  Megaphone, Trash2, Check, Loader2, RefreshCw,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { apiFetch } from "@/lib/api"
import { formatNotification } from "@/lib/notifications"

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

// ── Helpers ───────────────────────────────────────────────────────────────

function getConfig(type: string): { accentColor: string; icon: React.ReactNode } {
  if (type?.includes("completed")) return { accentColor: "#00ff88", icon: <CheckCircle className="h-4 w-4" /> }
  if (type?.includes("assigned") || type?.includes("workout")) return { accentColor: "#00ffff", icon: <Dumbbell className="h-4 w-4" /> }
  if (type?.includes("expiring")) return { accentColor: "#ffd700", icon: <AlertTriangle className="h-4 w-4" /> }
  if (type?.includes("expired") || type?.includes("cancel")) return { accentColor: "#ff4444", icon: <XCircle className="h-4 w-4" /> }
  if (type?.includes("blast") || type?.includes("message")) return { accentColor: "#a78bfa", icon: <Megaphone className="h-4 w-4" /> }
  return { accentColor: "#888888", icon: <Bell className="h-4 w-4" /> }
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return ""
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "Just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d === 1) return "Yesterday"
  return `${d}d ago`
}

// ── Component ─────────────────────────────────────────────────────────────

export function NotificationsView() {
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

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    try { await apiFetch("/notifications/read-all", { method: "PATCH" }) } catch { /* ignore */ }
  }

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
          <h2 className="text-xl font-bold text-white">Notifications</h2>
          {unreadCount > 0 && (
            <p className="text-sm text-[#888888]">{unreadCount} unread</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchNotifications}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#161b22] text-[#888888] transition-colors hover:text-white"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#161b22] px-4 py-2.5 text-sm font-medium text-[#888888] transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            Mark All Read
          </button>
          <button
            onClick={() => setShowClearDialog(true)}
            disabled={notifications.length === 0}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#161b22] px-4 py-2.5 text-sm font-medium text-[#ff4444] transition-colors hover:bg-[#ff4444]/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Clear All
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#555555]" />
          <p className="text-sm text-[#555555]">Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-[#161b22] py-20">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(136,136,136,0.15)" }}>
            <Bell className="h-8 w-8 text-[#555555]" />
          </div>
          <p className="text-lg font-medium text-[#888888]">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const config = getConfig(n.type)
            const isHovered = hoveredId === n.id
            const timestamp = timeAgo(n.createdAt ?? n.created_at)

            const fmt = formatNotification(n)
            return (
              <div
                key={n.id}
                className="group relative flex items-start gap-4 rounded-2xl border bg-[#161b22] p-4 cursor-pointer transition-all"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  borderLeftWidth: "4px",
                  borderLeftColor: n.is_read ? "rgba(136,136,136,0.3)" : config.accentColor,
                  opacity: n.is_read ? 0.65 : 1,
                }}
                onMouseEnter={() => setHoveredId(n.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => !n.is_read && handleMarkRead(n.id)}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: n.is_read ? "rgba(136,136,136,0.15)" : `${config.accentColor}26` }}
                >
                  <div style={{ color: n.is_read ? "#555555" : config.accentColor }}>{config.icon}</div>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold" style={{ color: n.is_read ? "#888888" : config.accentColor }}>
                    {fmt.title}
                  </p>
                  {fmt.body && <p className="mt-1 text-sm text-[#888888]">{fmt.body}</p>}
                  {timestamp && <p className="mt-2 text-xs text-[#555555]">{timestamp}</p>}
                </div>

                <div className="flex items-center gap-2">
                  {!n.is_read && !isHovered && (
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: config.accentColor }} />
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
            <DialogTitle className="text-white">Clear All Notifications</DialogTitle>
            <DialogDescription className="text-[#888888]">
              Are you sure you want to clear all notifications? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 sm:gap-3">
            <button
              onClick={() => setShowClearDialog(false)}
              className="flex-1 rounded-xl border border-white/[0.08] bg-[#161b22] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1c2128]"
            >
              Cancel
            </button>
            <button
              onClick={handleClearAll}
              className="flex-1 rounded-xl bg-[#ff4444] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#ff4444]/90"
            >
              Delete All
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
