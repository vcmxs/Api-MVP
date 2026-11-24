"use client"

import { useEffect, useRef } from "react"

/** The mount effect already fetched; ignore focus events this close to it. */
const MIN_GAP_MS = 30_000

/**
 * Re-runs `callback` when the tab becomes visible again.
 *
 * Every GET now travels with `cache: "no-store"`, so the only way a long-lived
 * tab can still show stale data is that it stopped asking. Coming back to the
 * tab is exactly when an outdated screen gets looked at, so the mount effect
 * gets a companion listener instead of a polling timer.
 *
 * Focus events raised within `MIN_GAP_MS` of the previous run (or of mount) are
 * collapsed: browsers fire both `visibilitychange` and `focus` when a window is
 * restored, and data is already fresh that soon after.
 */
export function useRefetchOnFocus(callback: () => void) {
  // The listener is registered once, so it reads the newest callback from a ref
  // instead of being re-bound on every render.
  const latest = useRef(callback)
  useEffect(() => {
    latest.current = callback
  }, [callback])

  const mountedAt = useRef(Date.now())

  useEffect(() => {
    let lastRun = mountedAt.current

    const handle = () => {
      if (document.visibilityState !== "visible") return
      const now = Date.now()
      if (now - lastRun < MIN_GAP_MS) return
      lastRun = now
      latest.current()
    }

    document.addEventListener("visibilitychange", handle)
    window.addEventListener("focus", handle)
    return () => {
      document.removeEventListener("visibilitychange", handle)
      window.removeEventListener("focus", handle)
    }
  }, [])
}
