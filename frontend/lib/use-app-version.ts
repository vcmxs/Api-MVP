"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api"

/** How often an open tab asks whether the API was redeployed. */
const POLL_MS = 10 * 60 * 1000

/**
 * Notices a redeploy while the app is already open.
 *
 * A tab keeps whatever JavaScript it booted with, and a dashboard that is never
 * reloaded can stay on the old behaviour long after a new build shipped. There
 * is no push channel for this, so the tab polls `GET /version` (a `no-store`
 * endpoint that answers with the build id it is running) and calls
 * `router.refresh()` when the id changes: the server components re-render and
 * the mounted screens re-fetch, without losing the current route.
 *
 * The first response only sets the baseline — the tab just booted, so it is by
 * definition running that build — and the check also runs whenever the tab
 * becomes visible again, which is when a stale screen is most likely to be
 * looked at.
 */
export function useAppVersion() {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    let known: string | null = null

    const check = async () => {
      try {
        const data = await apiFetch<{ build?: string }>("/version", { cache: "no-store" })
        const build = data?.build
        if (cancelled || !build) return

        if (known === null) {
          known = build
          return
        }
        if (build !== known) {
          known = build
          router.refresh()
        }
      } catch {
        // Offline, or the API is restarting: the next tick retries.
      }
    }

    void check()
    const interval = window.setInterval(check, POLL_MS)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void check()
    }
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [router])
}
