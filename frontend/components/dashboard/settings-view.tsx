"use client"

import { useState, useEffect, useRef } from "react"
import { User, Bell, Shield, Globe, Trash2, Save, Eye, EyeOff, Loader2, UserMinus, Sparkles, ChevronDown } from "lucide-react"
import { apiFetch, getUserInfo, clearAuth, getToken, setAuth } from "@/lib/api"
import { isNotificationSoundEnabled, playNotificationSound, setNotificationSoundEnabled } from "@/lib/notification-sound"
import { fetchReleaseNotes, getLastSeenReleaseId, markReleaseSeen, type ReleaseNote } from "@/lib/release-notes"
import { useT, useLanguage } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

// ── Sub-components ────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-6">
      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00ffff]/10">
          <span className="text-[#00ffff]">{icon}</span>
        </div>
        <h3 className="font-bold text-white">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function Field({ label, children, help }: { label: string; children: React.ReactNode; help?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[#888888]">{label}</label>
      {children}
      {help && <p className="mt-1 text-xs text-[#555555]">{help}</p>}
    </div>
  )
}

function TextInput({
  value, onChange, placeholder, type = "text", disabled = false,
}: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-4 py-2.5 text-white placeholder:text-[#555555] transition-colors focus:border-[#00ffff]/50 focus:outline-none disabled:opacity-50"
    />
  )
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
      style={{ backgroundColor: enabled ? "#00ffff" : "rgba(255,255,255,0.1)" }}
    >
      <span
        className="inline-block h-4 w-4 transform rounded-full bg-black transition-transform"
        style={{ transform: enabled ? "translateX(24px)" : "translateX(4px)" }}
      />
    </button>
  )
}

const subStatusColor = (s?: string) => {
  switch (s?.toLowerCase()) {
    case "active": case "trial": return { bg: "rgba(0,255,136,0.15)", text: "#00ff88" }
    case "free": return { bg: "rgba(0,255,255,0.15)", text: "#00ffff" }
    default: return { bg: "rgba(255,68,68,0.15)", text: "#ff4444" }
  }
}

const tierColors: Record<string, string> = {
  starter: "#888888", bronze: "#cd7f32", silver: "#c0c0c0",
  gold: "#ffd700", olympian: "#85a9f7", platinum: "#e5e4e2",
}

// ── Main component ────────────────────────────────────────────────────────

export function SettingsView({
  focusSection = null,
  focusNonce = 0,
}: {
  /** Section the dashboard wants to bring into view (e.g. from a release-note push). */
  focusSection?: "whatsNew" | null
  /** Bumping this re-triggers the scroll even if the section name is unchanged. */
  focusNonce?: number
} = {}) {
  const router = useRouter()
  const { t } = useT()
  const { language: lang, setLanguage: setLang } = useLanguage()
  const user = getUserInfo()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState("")

  // Profile fields
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [age, setAge] = useState("")
  const [sex, setSex] = useState("")
  const [height, setHeight] = useState("")
  const [weight, setWeight] = useState("")
  const [gym, setGym] = useState("")
  const [notes, setNotes] = useState("")
  const [username, setUsername] = useState("")

  // Subscription (read-only display)
  const [subStatus, setSubStatus] = useState("")
  const [subTier, setSubTier] = useState("")
  const [subStart, setSubStart] = useState("")
  const [subEnd, setSubEnd] = useState("")

  // Preferences (local only — no dedicated API endpoint)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [workoutStatusNotif, setWorkoutStatusNotif] = useState(true)
  // Mirrors the localStorage flag read by lib/notification-sound.ts. Start as
  // `true` (the default) and hydrate on mount to avoid a server/client mismatch.
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePin, setDeletePin] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // My coach (trainee only)
  const [coachId, setCoachId] = useState<number | null>(null)
  const [coachName, setCoachName] = useState("")
  const [showLeaveCoach, setShowLeaveCoach] = useState(false)
  const [leavingCoach, setLeavingCoach] = useState(false)
  const [leaveCoachError, setLeaveCoachError] = useState("")
  const [leaveCoachDone, setLeaveCoachDone] = useState("")

  // What's New (release notes). `seenIdRef` holds the id the user had already
  // opened before this visit, so the "New" pill survives for the whole session
  // and disappears the next time Settings is opened.
  const [releaseNotes, setReleaseNotes] = useState<ReleaseNote[]>([])
  const [releaseNotesLoading, setReleaseNotesLoading] = useState(true)
  const [expandedNoteId, setExpandedNoteId] = useState<number | null>(null)
  const [whatsNewFocused, setWhatsNewFocused] = useState(false)
  const seenIdRef = useRef(0)
  const whatsNewRef = useRef<HTMLDivElement | null>(null)
  // Nonce already scrolled to: a language switch reloads the notes, and that
  // must not re-scroll to (and re-highlight) the section by itself.
  const focusedNonceRef = useRef<number | null>(null)

  // ── Load release notes ──────────────────────────────────────────────────

  useEffect(() => {
    seenIdRef.current = getLastSeenReleaseId()
  }, [])

  useEffect(() => {
    let cancelled = false
    setReleaseNotesLoading(true)
    fetchReleaseNotes(lang)
      .then((notes) => {
        if (cancelled) return
        setReleaseNotes(notes)
        // Newest note starts expanded, older ones stay collapsed.
        setExpandedNoteId((prev) => prev ?? notes[0]?.id ?? null)
        const newestId = notes[0]?.id
        if (newestId) {
          markReleaseSeen(newestId)
          // Opening Settings is what clears the release-note notifications
          // (they are excluded from the bell's bulk "mark all as read").
          apiFetch("/notifications/read-all?type=release_note", { method: "PATCH" }).catch(() => {})
        }
      })
      .catch(() => { if (!cancelled) setReleaseNotes([]) })
      .finally(() => { if (!cancelled) setReleaseNotesLoading(false) })
    return () => { cancelled = true }
  }, [lang])

  // ── Deep-link focus (notification → Settings → What's New) ──────────────

  useEffect(() => {
    if (focusSection !== "whatsNew") return
    const nonce = focusNonce ?? 0
    // Each request is honoured once, and only after the profile/notes have been
    // laid out, so the section actually exists when we scroll to it.
    if (focusedNonceRef.current === nonce) return
    if (loading || releaseNotesLoading) return
    focusedNonceRef.current = nonce
    setWhatsNewFocused(true)
    // Wait a frame so the section is laid out before scrolling to it.
    const scrollTimer = window.setTimeout(() => {
      whatsNewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 60)
    const ringTimer = window.setTimeout(() => setWhatsNewFocused(false), 2800)
    return () => {
      window.clearTimeout(scrollTimer)
      window.clearTimeout(ringTimer)
    }
  }, [focusSection, focusNonce, loading, releaseNotesLoading])

  // ── Load profile ────────────────────────────────────────────────────────

  useEffect(() => {
    setSoundEnabled(isNotificationSoundEnabled())
  }, [])

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled)
    setNotificationSoundEnabled(enabled)
    // Preview when turning it on (this click is also the gesture that unlocks audio)
    if (enabled) playNotificationSound("message")
  }

  useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    apiFetch<{ user?: Record<string, unknown> } & Record<string, unknown>>(`/users/${user.id}/profile`)
      .then((data) => {
        const p = (data.user ?? data) as Record<string, unknown>
        setName(String(p.name ?? ""))
        setEmail(String(p.email ?? ""))
        setPhone(String(p.phone ?? ""))
        setGym(String(p.gym ?? ""))
        setAge(p.age != null ? String(p.age) : "")
        // Normalize M/F to Male/Female
        const rawSex = String(p.sex ?? "")
        setSex(rawSex === "M" ? "male" : rawSex === "F" ? "female" : rawSex.toLowerCase())
        setHeight(p.height != null ? String(p.height) : "")
        setWeight(p.weight != null ? String(p.weight) : "")
        setNotes(String(p.notes ?? ""))
        setUsername(String(p.username ?? ""))
        setSubStatus(String(p.subscription_status ?? p.subscriptionStatus ?? ""))
        setSubTier(String(p.subscription_tier ?? p.subscriptionTier ?? ""))
        setSubStart(String(p.subscription_start_date ?? p.subscriptionStartDate ?? ""))
        setSubEnd(String(p.subscription_end_date ?? p.subscriptionExpiry ?? p.subscriptionEndDate ?? ""))
        setCoachId(p.coach_id != null ? Number(p.coach_id) : null)
        setCoachName(String(p.assigned_coach ?? ""))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save profile ────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!user?.id) return
    setSaving(true); setSaveError("")
    try {
      await apiFetch(`/users/${user.id}/profile`, {
        method: "PUT",
        body: JSON.stringify({
          name,
          email,
          phone,
          gym,
          age: age ? parseInt(age, 10) : null,
          sex,
          height: height ? parseFloat(height) : null,
          weight: weight ? parseFloat(weight) : null,
          notes,
          username,
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  // ── Delete account ──────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!user?.id || !deletePin.trim()) return
    setDeleting(true)
    try {
      await apiFetch(`/users/${user.id}/account`, { method: "DELETE" })
      clearAuth()
      router.replace("/login")
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete account")
    } finally {
      setDeleting(false)
    }
  }

  // ── Leave coach (trainee) ────────────────────────────────────────────────

  const handleLeaveCoach = async () => {
    if (!user?.id || !coachId || leavingCoach) return
    setLeavingCoach(true)
    setLeaveCoachError("")
    try {
      const res = await apiFetch<{ coachName?: string }>(`/users/${user.id}/connection/${coachId}`, { method: "DELETE" })
      const formerCoach = res?.coachName || coachName
      setLeaveCoachDone(formerCoach)
      setCoachName("")
      setCoachId(null)
      setShowLeaveCoach(false)

      // Keep the cached session in sync so the rest of the dashboard stops
      // showing the old coach without forcing a re-login.
      const token = getToken()
      if (token) {
        setAuth(token, {
          ...user,
          coachId: null,
          coachName: null,
          assigned_coach: null,
          coachSubscriptionEndDate: null,
          coach_subscription_end_date: null,
        })
      }
    } catch (e) {
      setLeaveCoachError(e instanceof Error ? e.message : t.settings.leaveCoachError)
    } finally {
      setLeavingCoach(false)
    }
  }

  // ── Subscription helpers ────────────────────────────────────────────────

  const displayStatus = (() => {
    if (!subStatus) return ""
    if (subEnd) {
      const end = new Date(subEnd)
      if (end < new Date()) return "expired"
    }
    return subStatus
  })()

  const tierColor = subTier ? (tierColors[subTier.toLowerCase()] ?? "#888888") : null

  const daysLeft = subEnd
    ? Math.ceil((new Date(subEnd).getTime() - Date.now()) / 86400000)
    : null

  const formatNoteDate = (iso?: string) => {
    if (!iso) return ""
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ""
    return d.toLocaleDateString(lang === "en" ? "en-US" : "es-ES", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-[#00ffff]" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">

      {/* What's New — release notes (deep-linked from release-note notifications) */}
      <div
        ref={whatsNewRef}
        className={cn(
          "scroll-mt-24 rounded-2xl transition-shadow duration-500",
          whatsNewFocused && "ring-2 ring-[#ffd700]/70 ring-offset-2 ring-offset-[#0a0a0f]",
        )}
      >
        <Section title={t.settings.whatsNew} icon={<Sparkles className="h-4 w-4" />}>
          {releaseNotesLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-[#555555]" />
            </div>
          ) : releaseNotes.length === 0 ? (
            <p className="text-sm text-[#555555]">{t.settings.whatsNewEmpty}</p>
          ) : (
            <div className="space-y-3">
              {releaseNotes.map((note) => {
                const expanded = expandedNoteId === note.id
                const isNew = note.id > seenIdRef.current
                const date = formatNoteDate(note.createdAt)
                return (
                  <div
                    key={note.id}
                    className="rounded-xl border border-white/[0.08] bg-[#0a0a0f] transition-colors hover:border-white/[0.14]"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedNoteId(expanded ? null : note.id)}
                      className="flex w-full items-start justify-between gap-3 p-4 text-left"
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
                          {isNew && (
                            <span className="rounded-full bg-[#00ff88]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#00ff88]">
                              {t.settings.whatsNewNew}
                            </span>
                          )}
                          {date && <span className="text-xs text-[#555555]">{date}</span>}
                        </div>
                        <p className="mt-1.5 font-semibold text-white">{note.title}</p>
                      </div>
                      <ChevronDown
                        className={cn(
                          "mt-1 h-4 w-4 shrink-0 text-[#888888] transition-transform",
                          expanded && "rotate-180",
                        )}
                      />
                    </button>
                    {expanded && note.body && (
                      <p className="whitespace-pre-line border-t border-white/[0.06] px-4 py-3 text-sm leading-relaxed text-[#888888]">
                        {note.body}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Section>
      </div>

      {/* Personal Info */}
      <Section title={t.settings.personalInfo} icon={<User className="h-4 w-4" />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.settings.fullName}>
            <TextInput value={name} onChange={setName} placeholder={t.settings.fullNamePlaceholder} />
          </Field>
          <Field label={t.settings.email}>
            <TextInput value={email} onChange={setEmail} placeholder="you@example.com" type="email" disabled />
          </Field>
          <Field label={t.settings.phone}>
            <TextInput value={phone} onChange={setPhone} placeholder={t.settings.phonePlaceholder} />
          </Field>
          <Field label={t.settings.gym}>
            <TextInput value={gym} onChange={setGym} placeholder={t.settings.gymPlaceholder} />
          </Field>
          <Field label={t.settings.age}>
            <TextInput value={age} onChange={setAge} placeholder="25" type="number" />
          </Field>
          <Field label={t.settings.sex}>
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-4 py-2.5 text-white focus:border-[#00ffff]/50 focus:outline-none"
            >
              <option value="">{t.settings.sexSelect}</option>
              <option value="male">{t.settings.sexMale}</option>
              <option value="female">{t.settings.sexFemale}</option>
              <option value="other">{t.settings.sexOther}</option>
            </select>
          </Field>
          <Field label={t.settings.height}>
            <TextInput value={height} onChange={setHeight} placeholder="175" type="number" />
          </Field>
          <Field label={t.settings.weight}>
            <TextInput value={weight} onChange={setWeight} placeholder="75" type="number" />
          </Field>
        </div>

        <div className="mt-4">
          <Field label={t.settings.pathologies}>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.settings.pathologiesPlaceholder}
              rows={3}
              className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-4 py-2.5 text-white placeholder:text-[#555555] focus:border-[#00ffff]/50 focus:outline-none"
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label={t.settings.username} help={t.settings.usernameHelp}>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555555]">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                placeholder="yourhandle"
                maxLength={20}
                className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] py-2.5 pl-8 pr-4 text-white placeholder:text-[#555555] focus:border-[#00ffff]/50 focus:outline-none"
              />
            </div>
          </Field>
        </div>

        {saveError && <p className="mt-3 text-sm text-[#ff4444]">{saveError}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-5 flex items-center gap-2 rounded-xl px-6 py-2.5 font-medium text-black transition-all disabled:opacity-60"
          style={{ backgroundColor: saved ? "#00ff88" : "#00ffff" }}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? t.common.saving : saved ? t.common.saved : t.common.save}
        </button>
      </Section>

      {/* Subscription */}
      {(displayStatus || subTier) && (
        <Section title={t.settings.subscription} icon={<Shield className="h-4 w-4" />}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#888888]">{t.settings.status}</span>
              {displayStatus && (
                <span
                  className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
                  style={{ backgroundColor: subStatusColor(displayStatus).bg, color: subStatusColor(displayStatus).text }}
                >
                  {displayStatus}
                </span>
              )}
            </div>

            {subTier && tierColor && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#888888]">{t.settings.tier}</span>
                <span
                  className="rounded px-2.5 py-1 text-xs font-bold uppercase tracking-wider"
                  style={{ backgroundColor: `${tierColor}22`, color: tierColor }}
                >
                  {subTier}
                </span>
              </div>
            )}

            {subStart && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#888888]">{t.settings.started}</span>
                <span className="text-sm text-white">{new Date(subStart).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              </div>
            )}

            {subEnd && (
              <div className="flex items-center justify-between border-t border-white/[0.06] pt-4">
                <span className="text-sm text-[#888888]">{t.settings.expires}</span>
                <div className="text-right">
                  <p className="text-sm text-white">{new Date(subEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                  {daysLeft !== null && daysLeft <= 7 && daysLeft >= 0 && (
                    <p className="text-xs font-semibold text-[#ffd700]">⚠ {daysLeft}{t.settings.daysLeft}</p>
                  )}
                  {daysLeft !== null && daysLeft < 0 && (
                    <p className="text-xs font-semibold text-[#ff4444]">{t.settings.expired}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Notifications */}
      <Section title={t.settings.notifications} icon={<Bell className="h-4 w-4" />}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-white">{t.settings.pushNotifications}</p>
              <p className="text-sm text-[#888888]">{t.settings.pushNotificationsDesc}</p>
            </div>
            <Toggle enabled={notificationsEnabled} onChange={setNotificationsEnabled} />
          </div>
          <div className="h-px bg-white/[0.06]" />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-white">{t.settings.workoutAlerts}</p>
              <p className="text-sm text-[#888888]">{t.settings.workoutAlertsDesc}</p>
            </div>
            <Toggle enabled={workoutStatusNotif} onChange={setWorkoutStatusNotif} />
          </div>
          <div className="h-px bg-white/[0.06]" />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-white">{t.settings.notificationSound}</p>
              <p className="text-sm text-[#888888]">{t.settings.notificationSoundDesc}</p>
            </div>
            <Toggle enabled={soundEnabled} onChange={handleSoundToggle} />
          </div>
        </div>
      </Section>

      {/* Language */}
      <Section title={t.settings.language} icon={<Globe className="h-4 w-4" />}>
        <div className="flex gap-3">
          {(["en", "es"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className="flex items-center gap-2 rounded-xl border px-5 py-2.5 font-medium transition-all"
              style={{
                borderColor: lang === l ? "#00ffff" : "rgba(255,255,255,0.08)",
                backgroundColor: lang === l ? "rgba(0,255,255,0.1)" : "transparent",
                color: lang === l ? "#00ffff" : "#888888",
              }}
            >
              <span>{l === "en" ? "🇺🇸" : "🇪🇸"}</span>
              <span>{l === "en" ? "English" : "Español"}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* My Coach (trainees only) */}
      {user?.role?.toLowerCase() === "trainee" && (
        <Section title={t.settings.myCoach} icon={<UserMinus className="h-4 w-4" />}>
          {coachName ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-[#0a0a0f] px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{coachName}</p>
                  <p className="text-xs text-[#888888]">{t.settings.leaveCoachDesc}</p>
                </div>
                {!showLeaveCoach && (
                  <button
                    onClick={() => { setLeaveCoachError(""); setShowLeaveCoach(true) }}
                    className="flex shrink-0 items-center gap-2 rounded-xl border border-[#ff4444]/40 bg-[#ff4444]/10 px-4 py-2.5 text-sm font-medium text-[#ff4444] transition-colors hover:bg-[#ff4444]/20"
                  >
                    <UserMinus className="h-4 w-4" />
                    {t.settings.leaveCoach}
                  </button>
                )}
              </div>

              {showLeaveCoach && (
                <div className="space-y-4 rounded-xl border border-[#ff4444]/30 bg-[#ff4444]/5 p-4">
                  <p className="text-sm leading-relaxed text-[#888888]">
                    {t.settings.leaveCoachConfirm.replace("{name}", coachName)}
                  </p>
                  {leaveCoachError && <p role="alert" className="text-sm text-[#ff7777]">{leaveCoachError}</p>}
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setShowLeaveCoach(false); setLeaveCoachError("") }}
                      disabled={leavingCoach}
                      className="flex-1 rounded-xl border border-white/[0.15] py-2.5 font-medium text-white transition-colors hover:bg-[#1c2128] disabled:opacity-40"
                    >
                      {t.common.cancel}
                    </button>
                    <button
                      onClick={handleLeaveCoach}
                      disabled={leavingCoach}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#ff4444] py-2.5 font-medium text-white transition-colors hover:bg-[#e03030] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {leavingCoach && <Loader2 className="h-4 w-4 animate-spin" />}
                      {t.settings.leaveCoachAction}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-[#888888]">{t.settings.noCoach}</p>
          )}

          {leaveCoachDone && (
            <p className="mt-4 rounded-xl border border-[#00ff88]/30 bg-[#00ff88]/10 px-4 py-2.5 text-sm text-[#00ff88]">
              {t.settings.leaveCoachSuccess.replace("{name}", leaveCoachDone)}
            </p>
          )}
        </Section>
      )}

      {/* Danger Zone */}
      <div className="rounded-2xl border bg-[#161b22] p-6" style={{ borderColor: "rgba(255,68,68,0.3)" }}>
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff4444]/10">
            <Trash2 className="h-4 w-4 text-[#ff4444]" />
          </div>
          <h3 className="font-bold text-white">{t.settings.dangerZone}</h3>
        </div>

        {!showDeleteConfirm ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-white">{t.settings.deleteAccount}</p>
              <p className="text-sm text-[#888888]">{t.settings.deleteAccountDesc}</p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 rounded-xl border border-[#ff4444]/40 bg-[#ff4444]/10 px-4 py-2.5 font-medium text-[#ff4444] transition-colors hover:bg-[#ff4444]/20"
            >
              <Trash2 className="h-4 w-4" />
              {t.settings.deleteButton}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[#888888]">{t.settings.deleteConfirmDesc}</p>
            <div className="relative">
              <input
                type={showPin ? "text" : "password"}
                value={deletePin}
                onChange={(e) => setDeletePin(e.target.value)}
                placeholder={t.settings.pinPlaceholder}
                className="w-full rounded-xl border border-[#ff4444]/30 bg-[#0a0a0f] px-4 py-2.5 pr-12 text-white placeholder:text-[#555555] focus:border-[#ff4444]/60 focus:outline-none"
              />
              <button
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555555] hover:text-white"
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeletePin("") }}
                className="flex-1 rounded-xl border border-white/[0.15] py-2.5 font-medium text-white hover:bg-[#1c2128]"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleDelete}
                disabled={!deletePin.trim() || deleting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#ff4444] py-2.5 font-medium text-white hover:bg-[#e03030] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                {t.settings.confirmDelete}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
