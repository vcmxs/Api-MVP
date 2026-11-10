// frontend/lib/coach-invite.ts
//
// Helpers for the coach invite links (/join/<code> → /register?coach=<code>).
// Kept apart from the Win-Win referral code helpers on purpose: that one is
// the coach→coach commission program, this one only links a trainee account.

import { API_URL, apiFetch } from "./api"

export interface CoachInvitePreview {
  valid: boolean
  reason?: "not_found" | "revoked" | "expired" | "exhausted" | string
  message?: string
  code?: string
  coachId?: number
  coachName?: string
  slotsAvailable?: number | null
  maxTrainees?: number | null
  tier?: string | null
}

export interface CoachInvite {
  code: string
  url: string
  uses: number
  maxUses: number | null
  expiresAt: string | null
  createdAt?: string
  tier?: string
  maxTrainees?: number
  currentCount?: number
  slotsAvailable?: number
}

/** Reads ?coach=CODE (also accepts ?invite= / ?code=) from a search string or the current URL. */
export function readInviteCode(search?: string): string | null {
  const query = search ?? (typeof window !== "undefined" ? window.location.search : "")
  if (!query) return null
  const params = new URLSearchParams(query)
  const code = params.get("coach") ?? params.get("invite") ?? params.get("coachInvite")
  return code ? code.trim().toUpperCase() : null
}

/** Public preview of an invite code (coach name + free slots). Never throws on invalid codes. */
export async function fetchInvitePreview(code: string): Promise<CoachInvitePreview> {
  const res = await fetch(`${API_URL}/coach-invites/${encodeURIComponent(code)}`)
  const data = await res.json().catch(() => ({ valid: false, reason: "not_found" }))
  if (!res.ok) {
    throw new Error((data as CoachInvitePreview)?.message ?? "Could not load this invite link.")
  }
  return data as CoachInvitePreview
}

/** Links the logged-in account to the coach behind the code. */
export async function applyInviteCode(code: string): Promise<{ success: boolean; coachName?: string; message?: string }> {
  return apiFetch<{ success: boolean; coachName?: string; message?: string }>("/coach-invites/apply", {
    method: "POST",
    body: JSON.stringify({ code }),
  })
}
