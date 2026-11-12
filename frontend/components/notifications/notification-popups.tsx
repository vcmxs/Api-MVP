"use client"

import { useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"
import { apiFetch, getToken, getUserInfo } from "@/lib/api"
import { useT } from "@/lib/i18n"
import type { RawNotification } from "@/lib/notifications"
import { playNotificationSound, unlockNotificationSound } from "@/lib/notification-sound"
import { NotificationToastCard } from "./notification-toast-card"

// Polling keeps the popups dependency-free (no socket.io client in the web app).
// It pauses while the tab is hidden and refreshes immediately on focus, so new
// notifications show up right away when the user comes back.
const POLL_INTERVAL_MS = 12000
const MAX_POPUPS_PER_BURST = 3

interface NotificationPopupsProps {
  /** Called when the user clicks a popup — usually opens the notifications tab. */
  onViewAll?: () => void
  /** Called once per burst so the caller can refresh its own counters (bell badge). */
  onNew?: () => void
  /** Called when a popup is clicked; falls back to `onViewAll` when omitted. */
  onOpen?: (notification: RawNotification) => void
}

function timestamp(n: RawNotification): number {
  return new Date(n.createdAt ?? n.created_at ?? 0).getTime()
}

export function NotificationPopups({ onViewAll, onNew, onOpen }: NotificationPopupsProps) {
  const { t } = useT()

  // Refs keep the poller stable (single interval) while reading fresh props/translations
  const seenIdsRef = useRef<Set<number> | null>(null)
  const inFlightRef = useRef(false)
  const tRef = useRef(t)
  const onViewAllRef = useRef(onViewAll)
  const onNewRef = useRef(onNew)
  const onOpenRef = useRef(onOpen)
  tRef.current = t
  onViewAllRef.current = onViewAll
  onNewRef.current = onNew
  onOpenRef.current = onOpen

  const poll = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) return
    if (!getToken() || !getUserInfo()?.id) return
    // The interval and the focus handler can overlap: never run two polls at
    // once, otherwise the same notification could toast twice.
    if (inFlightRef.current) return
    inFlightRef.current = true

    try {
      const data = await apiFetch<{ notifications: RawNotification[] }>("/notifications")
      const rows = [...(data.notifications ?? [])].sort((a, b) => timestamp(b) - timestamp(a))

      // First pass only records what already exists — no popups for old rows
      if (seenIdsRef.current === null) {
        seenIdsRef.current = new Set(rows.map((row) => row.id))
        return
      }

      const seen = seenIdsRef.current
      const fresh = rows.filter((row) => !seen.has(row.id))
      rows.forEach((row) => seen.add(row.id))
      if (seen.size > 200) seenIdsRef.current = new Set(rows.map((row) => row.id))

      if (fresh.length === 0) return

      // Cascade: oldest first so they stack in chronological order
      const ordered = [...fresh].sort((a, b) => a.id - b.id).slice(-MAX_POPUPS_PER_BURST)

      onNewRef.current?.()
      // Chat messages get their own chime so a DM is recognizable without
      // looking at the screen.
      const isMessage = fresh.some((row) => (row.type ?? "").toLowerCase() === "direct_message")
      playNotificationSound(isMessage ? "message" : "default")

      for (const notification of ordered) {
        toast.custom(
          (id) => (
            <NotificationToastCard
              notification={notification}
              t={tRef.current}
              onDismiss={() => toast.dismiss(id)}
              onOpen={() => {
                toast.dismiss(id)
                if (onOpenRef.current) onOpenRef.current(notification)
                else onViewAllRef.current?.()
              }}
            />
          ),
          { duration: 6000, unstyled: true },
        )
      }
    } catch {
      /* non-critical: popups never break the dashboard */
    } finally {
      inFlightRef.current = false
    }
  }, [])

  useEffect(() => {
    let active = true
    const run = () => { if (active) poll() }

    run()
    const timer = window.setInterval(run, POLL_INTERVAL_MS)
    const handleVisibility = () => { if (!document.hidden) run() }

    document.addEventListener("visibilitychange", handleVisibility)
    window.addEventListener("focus", run)
    // Browsers need a user gesture before playing audio
    window.addEventListener("pointerdown", unlockNotificationSound, { once: true })
    window.addEventListener("keydown", unlockNotificationSound, { once: true })

    return () => {
      active = false
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", handleVisibility)
      window.removeEventListener("focus", run)
      window.removeEventListener("pointerdown", unlockNotificationSound)
      window.removeEventListener("keydown", unlockNotificationSound)
    }
  }, [poll])

  return null
}
