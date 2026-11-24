// Release notes ("What's new") — client helpers.
//
// The backend stores both languages in the same row; the dashboard picks one
// with the language context so switching language never needs a refetch.

import { apiFetch } from "@/lib/api"

/** Row as returned by `GET /release-notes` (camelCase fields). */
export interface ApiReleaseNote {
  id: number
  version: string
  titleEs?: string
  titleEn?: string
  bodyEs?: string
  bodyEn?: string
  isPublished?: boolean
  is_published?: boolean
  notifiedAt?: string | null
  createdAt?: string
}

export interface ReleaseNote {
  id: number
  version: string
  title: string
  body: string
  /** ISO string used for the localized date under the version badge. */
  createdAt?: string
}

/** localStorage key holding the id of the newest note the user has opened. */
export const RELEASE_SEEN_KEY = "dupla_release_seen"

/**
 * Picks the note text for one language with a Spanish fallback: the admin form
 * lets English stay empty and the API copies the Spanish text in that case.
 */
export function pickReleaseNoteText(note: ApiReleaseNote, lang: "en" | "es"): { title: string; body: string } {
  const isEn = lang === "en"
  return {
    title: (isEn ? note.titleEn : note.titleEs) || note.titleEs || note.titleEn || "",
    body: (isEn ? note.bodyEn : note.bodyEs) || note.bodyEs || note.bodyEn || "",
  }
}

export function toReleaseNote(note: ApiReleaseNote, lang: "en" | "es"): ReleaseNote {
  const { title, body } = pickReleaseNoteText(note, lang)
  return { id: note.id, version: note.version, title, body, createdAt: note.createdAt }
}

/** `GET /release-notes` — published notes, newest first. */
export async function fetchReleaseNotes(lang: "en" | "es"): Promise<ReleaseNote[]> {
  // Release notes are a catalog: the API marks the response `no-cache`, so the
  // browser can keep the payload and revalidate it with an ETag (304) instead
  // of downloading the whole list again every time Novedades is opened.
  const data = await apiFetch<{ notes: ApiReleaseNote[] }>("/release-notes", { cache: "default" })
  return (data.notes ?? []).map((note) => toReleaseNote(note, lang))
}

/**
 * Newest note id already opened by this user. Reads localStorage lazily: the
 * Settings view only calls it from an effect, never during SSR.
 */
export function getLastSeenReleaseId(): number {
  if (typeof window === "undefined") return 0
  const raw = window.localStorage.getItem(RELEASE_SEEN_KEY)
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : 0
}

export function markReleaseSeen(id: number) {
  if (typeof window === "undefined" || !Number.isInteger(id)) return
  window.localStorage.setItem(RELEASE_SEEN_KEY, String(id))
}
