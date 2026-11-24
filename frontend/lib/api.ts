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

/**
 * GETs already on the wire, keyed by token + path.
 *
 * The dashboard mounts a dozen components that each fetch their own slice, so
 * the same URL is often requested twice within the same tick (the agenda and
 * the notification bell both ask for `/notifications`, for instance). Sharing
 * the pending promise removes the duplicate round-trip without ever keeping a
 * response around: the entry is deleted the moment the request settles, so a
 * later call still reads fresh data. This is a coalescer, not a cache.
 */
const inflight = new Map<string, Promise<unknown>>()

async function send<T>(path: string, options: RequestInit | undefined, cache: RequestCache): Promise<T> {
  const token = getToken()
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      cache,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    })
  } catch {
    // fetch() only rejects on network-level failures (backend down, DNS, blocked
    // by CORS) and its raw message is the unhelpful "Failed to fetch". Surface
    // the base URL so the cause is obvious.
    throw new Error(`Cannot reach the API at ${API_URL}. Is the backend running?`)
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err?.message ?? res.statusText)
  }
  const text = await res.text()
  if (!text) return {} as T
  try { return JSON.parse(text) } catch { return {} as T }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const method = (options?.method ?? "GET").toUpperCase()
  // Only read-only requests can be shared; anything that writes must hit the
  // network every single time.
  const key = method === "GET" ? `${getToken() ?? "anon"}|${path}` : null

  if (key) {
    const pending = inflight.get(key)
    if (pending) return pending as Promise<T>
  }

  // `no-store` by default: user data must never come out of the HTTP cache,
  // which is what made a saved edit look unsaved until a hard reload. Catalog
  // endpoints opt back in with `{ cache: "default" }` so the browser can
  // revalidate them with an ETag instead of downloading them again.
  const request = send<T>(path, options, options?.cache ?? "no-store")

  if (key) {
    inflight.set(key, request)
    const settle = () => {
      if (inflight.get(key) === request) inflight.delete(key)
    }
    request.then(settle, settle)
  }

  return request
}
