export const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api-mvp-production.up.railway.app/api/v1"

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("userToken")
}

export function getUserInfo(): { id: number; name: string; email: string; role: string; coachSubscriptionEndDate?: string; coach_subscription_end_date?: string; weight?: number; subscriptionTier?: string; subscription_tier?: string; subscription_end_date?: string; subscriptionEndDate?: string; subscriptionExpiry?: string } | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem("userInfo")
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setAuth(token: string, user: object) {
  localStorage.setItem("userToken", token)
  localStorage.setItem("userInfo", JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem("userToken")
  localStorage.removeItem("userInfo")
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err?.message ?? res.statusText)
  }
  const text = await res.text()
  if (!text) return {} as T
  try { return JSON.parse(text) } catch { return {} as T }
}
