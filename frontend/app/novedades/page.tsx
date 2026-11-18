"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronLeft, Loader2, Sparkles } from "lucide-react"
import { apiFetch, getToken } from "@/lib/api"
import { useLanguage, useT } from "@/lib/i18n"
import {
  fetchReleaseNotes,
  getLastSeenReleaseId,
  markReleaseSeen,
  type ReleaseNote,
} from "@/lib/release-notes"
import { cn } from "@/lib/utils"

// Standalone Novedades page (release notes).
//
// The notes are global, so this route lives outside the dashboard and needs no
// session: GET /release-notes answers without a token. The Settings entry and
// every release_note notification send the user here.

export default function NovedadesPage() {
  const { t } = useT()
  const { language, setLanguage } = useLanguage()
  const [notes, setNotes] = useState<ReleaseNote[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [seenId, setSeenId] = useState(0)
  // getToken reads localStorage, so the back link resolves after mount and the
  // server and client markup stay identical.
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    setSignedIn(Boolean(getToken()))
  }, [])

  useEffect(() => {
    let cancelled = false
    setSeenId(getLastSeenReleaseId())
    setLoading(true)
    setFailed(false)
    fetchReleaseNotes(language)
      .then((rows) => {
        if (cancelled) return
        setNotes(rows)
        // Newest note starts expanded, the older ones stay collapsed.
        setExpandedId(rows[0]?.id ?? null)
        const newestId = rows[0]?.id
        if (!newestId) return
        markReleaseSeen(newestId)
        // Signed-in visitors also clear their release-note notifications; they
        // are excluded from the bell bulk mark-all on purpose.
        if (getToken()) {
          apiFetch("/notifications/read-all?type=release_note", { method: "PATCH" }).catch(() => {})
        }
      })
      .catch(() => {
        if (cancelled) return
        setNotes([])
        setFailed(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [language, reloadKey])

  const formatNoteDate = (iso?: string) => {
    if (!iso) return ""
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return ""
    return date.toLocaleDateString(language === "en" ? "en-US" : "es-ES", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        {/* Top bar */}
        <div className="mb-10 flex items-center justify-between gap-4">
          <Link
            href={signedIn ? "/dashboard" : "/login"}
            className="flex items-center gap-1.5 text-sm font-medium text-[#888888] transition-colors hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            {t.common.back}
          </Link>
          <button
            type="button"
            onClick={() => setLanguage(language === "en" ? "es" : "en")}
            className="rounded-xl border border-white/[0.08] bg-[#161b22] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#888888] transition-colors hover:text-white"
          >
            {language === "en" ? "ES" : "EN"}
          </button>
        </div>

        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ffd700]/10">
            <Sparkles className="h-6 w-6 text-[#ffd700]" />
          </div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">{t.settings.whatsNew}</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-[#00ffff]" />
          </div>
        ) : failed ? (
          <div className="rounded-2xl border border-[#ff4444]/30 bg-[#ff4444]/5 p-6">
            <p className="text-sm text-[#ff7777]">{t.common.error}</p>
            <button
              type="button"
              onClick={() => setReloadKey(Date.now())}
              className="mt-4 rounded-xl bg-[#00ffff] px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-[#00e0e0]"
            >
              {t.common.retry}
            </button>
          </div>
        ) : notes.length === 0 ? (
          <p className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-6 text-sm text-[#888888]">
            {t.settings.whatsNewEmpty}
          </p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => {
              const expanded = expandedId === note.id
              const isNew = note.id > seenId
              const date = formatNoteDate(note.createdAt)
              return (
                <div
                  key={note.id}
                  className="rounded-2xl border border-white/[0.08] bg-[#161b22] transition-colors hover:border-white/[0.14]"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : note.id)}
                    className="flex w-full items-start justify-between gap-3 p-5 text-left"
                    aria-expanded={expanded}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide"
                          style={{ backgroundColor: "rgba(255,215,0,0.14)", color: "#ffd700" }}
                        >
                          v{note.version}
                        </span>
                        {isNew ? (
                          <span className="rounded-full bg-[#00ff88]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#00ff88]">
                            {t.settings.whatsNewNew}
                          </span>
                        ) : null}
                        {date ? <span className="text-xs text-[#555555]">{date}</span> : null}
                      </div>
                      <p className="mt-2 font-semibold text-white">{note.title}</p>
                    </div>
                    <ChevronDown
                      className={cn(
                        "mt-1 h-4 w-4 shrink-0 text-[#888888] transition-transform",
                        expanded ? "rotate-180" : "",
                      )}
                    />
                  </button>
                  {expanded ? (
                    <p className="whitespace-pre-line border-t border-white/[0.06] px-5 py-4 text-sm leading-relaxed text-[#888888]">
                      {note.body}
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
