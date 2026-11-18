"use client"

import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import {
  Loader2,
  Sparkles,
  Plus,
  Save,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  BellRing,
  X,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react"

interface AdminReleaseNote {
  id: number
  version: string
  titleEs: string
  titleEn: string
  bodyEs: string
  bodyEn: string
  isPublished: boolean
  notifiedAt: string | null
  createdAt: string
}

interface NoteForm {
  version: string
  titleEs: string
  titleEn: string
  bodyEs: string
  bodyEn: string
  notify: boolean
}

const emptyForm: NoteForm = { version: "", titleEs: "", titleEn: "", bodyEs: "", bodyEn: "", notify: true }

const inputClass =
  "w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-4 py-2.5 text-sm text-white placeholder:text-[#555555] transition-colors focus:border-[#00ffff]/50 focus:outline-none"

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#888888]">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-[#555555]">{hint}</p>}
    </div>
  )
}

export function AdminReleaseNotesView() {
  const [notes, setNotes] = useState<AdminReleaseNote[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<NoteForm>(emptyForm)

  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const setField = <K extends keyof NoteForm>(key: K, value: NoteForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const fetchNotes = async () => {
    try {
      const res = await apiFetch<{ notes: AdminReleaseNote[] }>("/admin/release-notes")
      setNotes(res?.notes ?? [])
    } catch (err) {
      console.warn("Failed to fetch release notes:", err)
      setNotes([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotes()
  }, [])

  const startCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setFormOpen(true)
    setError("")
    setNotice("")
  }

  const startEdit = (note: AdminReleaseNote) => {
    setEditingId(note.id)
    setForm({
      version: note.version ?? "",
      titleEs: note.titleEs ?? "",
      titleEn: note.titleEn ?? "",
      bodyEs: note.bodyEs ?? "",
      bodyEn: note.bodyEn ?? "",
      notify: false,
    })
    setFormOpen(true)
    setError("")
    setNotice("")
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingId(null)
    setForm(emptyForm)
    setError("")
  }

  const handleSubmit = async () => {
    const version = form.version.trim()
    const titleEs = form.titleEs.trim()
    const bodyEs = form.bodyEs.trim()
    if (!version || !titleEs || !bodyEs) {
      setError("Version, Spanish title and Spanish body are required.")
      return
    }

    setSaving(true)
    setError("")
    setNotice("")
    const payload = {
      version,
      titleEs,
      titleEn: form.titleEn.trim(),
      bodyEs,
      bodyEn: form.bodyEn.trim(),
    }

    try {
      if (editingId) {
        await apiFetch(`/admin/release-notes/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
        setNotice(`Release note v${version} updated.`)
      } else {
        const res = await apiFetch<{ notified?: number }>("/admin/release-notes", {
          method: "POST",
          body: JSON.stringify({ ...payload, notify: form.notify }),
        })
        const sent = res?.notified ?? 0
        setNotice(
          form.notify
            ? `Release note v${version} published — ${sent} notification${sent === 1 ? "" : "s"} sent.`
            : `Release note v${version} published without notifications.`,
        )
      }
      setFormOpen(false)
      setEditingId(null)
      setForm(emptyForm)
      await fetchNotes()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save release note")
    } finally {
      setSaving(false)
    }
  }

  const handleTogglePublish = async (note: AdminReleaseNote) => {
    setBusyId(note.id)
    setError("")
    setNotice("")
    const nextPublished = !note.isPublished
    try {
      await apiFetch(`/admin/release-notes/${note.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isPublished: nextPublished }),
      })
      setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, isPublished: nextPublished } : n)))
      setNotice(`v${note.version} ${nextPublished ? "published" : "unpublished"}.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update release note")
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (note: AdminReleaseNote) => {
    setBusyId(note.id)
    setError("")
    setNotice("")
    try {
      await apiFetch(`/admin/release-notes/${note.id}`, { method: "DELETE" })
      setNotes((prev) => prev.filter((n) => n.id !== note.id))
      setDeleteId(null)
      if (editingId === note.id) closeForm()
      setNotice(`v${note.version} deleted.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete release note")
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#00ff88]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Sparkles className="h-5 w-5 text-[#ffd700]" /> Release Notes
          </h2>
          <p className="text-sm text-[#888888]">
            Publish what&apos;s new - every coach and trainee sees it on the Novedades page.
          </p>
        </div>
        <button
          onClick={startCreate}
          className="flex items-center gap-2 rounded-xl bg-[#00ff88] px-4 py-2.5 text-sm font-bold text-black transition-colors hover:bg-[#00e67a]"
        >
          <Plus className="h-4 w-4" /> New release note
        </button>
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-[#00ff88]/30 bg-[#00ff88]/10 px-4 py-3 text-sm text-[#00ff88]">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {notice}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-[#ff4444]/30 bg-[#ff4444]/10 px-4 py-3 text-sm text-[#ff4444]">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Create / edit form */}
      {formOpen && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-bold text-white">
              {editingId ? "Edit release note" : "New release note"}
            </h3>
            <button onClick={closeForm} className="text-[#888888] transition-colors hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
              <Field label="Version" hint="Shown as the badge, e.g. 1.4">
                <input
                  className={inputClass}
                  value={form.version}
                  onChange={(e) => setField("version", e.target.value)}
                  placeholder="1.4"
                  maxLength={20}
                />
              </Field>
              <Field label="Title (Spanish)" hint="Required — used as the English fallback">
                <input
                  className={inputClass}
                  value={form.titleEs}
                  onChange={(e) => setField("titleEs", e.target.value)}
                  placeholder="Nuevo panel de progreso"
                  maxLength={160}
                />
              </Field>
            </div>

            <Field label="Title (English)" hint="Optional — Spanish is used when empty">
              <input
                className={inputClass}
                value={form.titleEn}
                onChange={(e) => setField("titleEn", e.target.value)}
                placeholder="New progress dashboard"
                maxLength={160}
              />
            </Field>

            <Field label="Body (Spanish)" hint="Line breaks are preserved">
              <textarea
                className={cn(inputClass, "min-h-[120px] resize-y")}
                value={form.bodyEs}
                onChange={(e) => setField("bodyEs", e.target.value)}
                placeholder="Describe los cambios de esta versión..."
                maxLength={4000}
              />
            </Field>

            <Field label="Body (English)" hint="Optional — Spanish is used when empty">
              <textarea
                className={cn(inputClass, "min-h-[120px] resize-y")}
                value={form.bodyEn}
                onChange={(e) => setField("bodyEn", e.target.value)}
                placeholder="Describe the changes in this version..."
                maxLength={4000}
              />
            </Field>

            {!editingId && (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.08] bg-[#0a0a0f] p-4">
                <input
                  type="checkbox"
                  checked={form.notify}
                  onChange={(e) => setField("notify", e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#00ff88]"
                />
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-white">
                    <BellRing className="h-4 w-4 text-[#00ffff]" /> Notify all coaches and trainees
                  </span>
                  <span className="mt-0.5 block text-xs text-[#555555]">
                    Sends an in-app notification (bell & popup) that opens the Novedades page.
                  </span>
                </span>
              </label>
            )}

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-[#00ffff] px-5 py-2.5 text-sm font-bold text-black transition-colors hover:bg-[#00e0e0] disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingId ? "Save changes" : "Publish note"}
              </button>
              <button
                onClick={closeForm}
                className="rounded-xl border border-white/[0.15] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1c2128]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes list */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#161b22]">
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#0a0a0f] px-6 py-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#888888]">All notes</h3>
          <span className="text-xs text-[#555555]">{notes.length} total</span>
        </div>

        {notes.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-[#333333]" />
            <p className="text-sm text-[#555555]">No release notes yet. Publish your first one above.</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {notes.map((note) => {
              const busy = busyId === note.id
              const confirmingDelete = deleteId === note.id
              return (
                <li key={note.id} className="px-6 py-5 transition-colors hover:bg-white/[0.02]">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                          style={{ backgroundColor: "rgba(255,215,0,0.14)", color: "#ffd700" }}
                        >
                          v{note.version}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            note.isPublished ? "bg-[#00ff88]/10 text-[#00ff88]" : "bg-white/[0.06] text-[#888888]",
                          )}
                        >
                          {note.isPublished ? "Published" : "Draft"}
                        </span>
                        {note.notifiedAt && (
                          <span className="flex items-center gap-1 text-[11px] text-[#00ffff]">
                            <BellRing className="h-3 w-3" /> notified
                          </span>
                        )}
                        {note.createdAt && (
                          <span className="text-xs text-[#555555]">
                            {format(new Date(note.createdAt), "MMM d, yyyy HH:mm")}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 font-semibold text-white">{note.titleEs}</p>
                      {note.titleEn && note.titleEn !== note.titleEs && (
                        <p className="text-xs text-[#888888]">{note.titleEn}</p>
                      )}
                      <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs text-[#555555]">
                        {note.bodyEs}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {confirmingDelete ? (
                        <>
                          <span className="text-xs text-[#ff4444]">Delete?</span>
                          <button
                            onClick={() => handleDelete(note)}
                            disabled={busy}
                            className="flex items-center gap-1 rounded-lg bg-[#ff4444] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#e03030] disabled:opacity-60"
                          >
                            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            Yes
                          </button>
                          <button
                            onClick={() => setDeleteId(null)}
                            className="rounded-lg border border-white/[0.15] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#1c2128]"
                          >
                            No
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleTogglePublish(note)}
                            disabled={busy}
                            title={note.isPublished ? "Unpublish" : "Publish"}
                            className={cn(
                              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60",
                              note.isPublished
                                ? "border-white/[0.15] text-[#888888] hover:text-white"
                                : "border-[#00ff88]/30 text-[#00ff88] hover:bg-[#00ff88]/10",
                            )}
                          >
                            {busy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : note.isPublished ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                            {note.isPublished ? "Unpublish" : "Publish"}
                          </button>
                          <button
                            onClick={() => startEdit(note)}
                            title="Edit"
                            className="flex items-center gap-1.5 rounded-lg border border-white/[0.15] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#1c2128]"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => setDeleteId(note.id)}
                            title="Delete"
                            className="flex items-center gap-1.5 rounded-lg border border-[#ff4444]/30 px-3 py-1.5 text-xs font-medium text-[#ff4444] transition-colors hover:bg-[#ff4444]/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
