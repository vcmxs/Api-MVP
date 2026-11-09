"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { BookOpen, Check, Dumbbell, ExternalLink, Loader2, Play, Plus, Share2, Target } from "lucide-react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { apiFetch, getUserInfo } from "@/lib/api"
import { useT } from "@/lib/i18n"
import {
  datasetMediaUrl,
  getExerciseDescription,
  getExerciseGifUrl,
  getExerciseVideoUrl,
  getYouTubeSearchUrl,
  getYouTubeVideoId,
  getYouTubeWatchUrl,
  normalizeExerciseName,
} from "@/lib/exercise-media"

/** Full catalog row for one exercise (dataset-enriched fields included). */
interface ExerciseRecord {
  id: number
  name: string
  description?: string | null
  muscle_category?: string | null
  body_part?: string | null
  equipment?: string | null
  target_muscle?: string | null
  muscle_group?: string | null
  secondary_muscles?: string[] | null
  instructions_es?: string | null
  instruction_steps_es?: string[] | null
  gif_url?: string | null
  gif_file?: string | null
  thumb_url?: string | null
  thumb_file?: string | null
  media_attribution?: string | null
  source?: string | null
  video_url?: string | null
  videoUrl?: string | null
}

/** One lookup per exercise name per session; failures are not cached. */
const exerciseRecordRequests = new Map<string, Promise<ExerciseRecord | null>>()

function loadExerciseRecord(exerciseName: string): Promise<ExerciseRecord | null> {
  const key = normalizeExerciseName(exerciseName)
  if (!key) return Promise.resolve(null)

  const cached = exerciseRecordRequests.get(key)
  if (cached) return cached

  const request = apiFetch<{ exercise?: ExerciseRecord | null }>(`/exercises/lookup?name=${encodeURIComponent(exerciseName)}`)
    .then(data => data?.exercise ?? null)
    .catch(error => {
      exerciseRecordRequests.delete(key)
      throw error
    })

  exerciseRecordRequests.set(key, request)
  return request
}

/**
 * Catalog record for one exercise plus the media URLs derived from it.
 *
 * Cards only need the still thumbnail while the dialog needs the whole record,
 * so both mount the same hook and share the cached request above.
 */
function useExerciseRecord(exerciseName: string) {
  const [record, setRecord] = useState<ExerciseRecord | null>(null)
  const [recordLoading, setRecordLoading] = useState(false)
  const [recordError, setRecordError] = useState(false)

  // One lightweight lookup per exercise instead of downloading the whole catalog.
  // Fetched on mount (not on open) so the card trigger already shows the dataset
  // still at first paint instead of an empty icon that fills in after a click.
  useEffect(() => {
    if (!exerciseName) {
      setRecord(null)
      setRecordLoading(false)
      setRecordError(false)
      return
    }
    let active = true
    setRecordLoading(true)
    setRecordError(false)
    loadExerciseRecord(exerciseName)
      .then(result => { if (active) setRecord(result) })
      .catch(() => {
        if (!active) return
        setRecord(null)
        setRecordError(true)
      })
      .finally(() => { if (active) setRecordLoading(false) })
    return () => { active = false }
  }, [exerciseName])

  // Dataset media first (self-hosted), then the legacy static map.
  // The GIF is 180×180 and heavy, so cards use the still JPG and only the
  // dialog's media panel animates.
  const gifUrl = record?.gif_url || datasetMediaUrl(record?.gif_file, "gif") || getExerciseGifUrl(exerciseName)
  const thumbUrl = record?.thumb_url || datasetMediaUrl(record?.thumb_file, "thumb")

  return { record, recordLoading, recordError, gifUrl, thumbUrl }
}

/** Dataset muscle names are lowercase ("upper chest") — display them capitalized. */
function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map(word => (word.length > 2 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ")
}

interface ProgressionPoint {
  date?: string
  completed_at?: string
  scheduled_date?: string
  weight?: number
  reps?: number
  setNumber?: number
  set_number?: number
  rpe?: number | null
  rir?: number | null
  oneRepMax?: number
  one_rep_max?: number
}

interface HistoryGroup {
  dateKey: string
  dateLabel: string
  best: number
  points: ProgressionPoint[]
}

function pointDate(point: ProgressionPoint): string {
  return (point.date ?? point.completed_at ?? point.scheduled_date ?? "").split("T")[0]
}

function formatDate(date: string): string {
  if (!date) return "—"
  const parsed = new Date(`${date}T12:00:00`)
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

const chipClass = "inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-[#b8bec8] transition hover:border-[#00ffff]/50 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ffff]/50"

/** Action chips shown under the media panel (hero card and dialog). */
function ExerciseMediaActions({ watchUrl, searchUrl, copied, onShare, onHowTo }: {
  watchUrl: string | null
  searchUrl: string
  copied: boolean
  onShare: () => void
  onHowTo: () => void
}) {
  const { t } = useT()

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <a href={watchUrl ?? searchUrl} target="_blank" rel="noreferrer" className={chipClass}>
        <ExternalLink className="h-3 w-3" />
        {t.workouts.openOnYouTube}
      </a>
      <button type="button" onClick={onShare} className={chipClass}>
        {copied ? <Check className="h-3 w-3 text-[#00ff88]" /> : <Share2 className="h-3 w-3" />}
        <span className={copied ? "text-[#00ff88]" : undefined}>{copied ? t.workouts.copied : t.workouts.shareVideo}</span>
      </button>
      <button type="button" onClick={onHowTo} className={chipClass}>
        <BookOpen className="h-3 w-3" />
        {t.workouts.howTo}
      </button>
    </div>
  )
}

export function ExerciseReferenceDialog({ open, onOpenChange, exerciseName, targetUserId, subjectName, onPick }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  exerciseName: string
  /** Whose progression is listed. Defaults to the signed-in user. */
  targetUserId?: number
  /** Shown on the history tab so it is obvious whose log is on screen. */
  subjectName?: string | null
  /** When provided, the dialog also offers a primary "add to routine" action. */
  onPick?: () => void
}) {
  const { t } = useT()
  const [progression, setProgression] = useState<ProgressionPoint[]>([])
  const [progressionLoading, setProgressionLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"about" | "history" | "progress">("about")
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { record, recordLoading, recordError, gifUrl, thumbUrl } = useExerciseRecord(exerciseName)
  const instructionsRef = useRef<HTMLElement | null>(null)
  const user = getUserInfo()

  const staticVideoUrl = getExerciseVideoUrl(exerciseName)
  const catalogVideoUrl = record?.video_url || record?.videoUrl
  // Only used for the "YouTube" link: the dialog itself never plays a video.
  const videoId = getYouTubeVideoId(staticVideoUrl) ?? getYouTubeVideoId(catalogVideoUrl)
  const hasMedia = Boolean(gifUrl || thumbUrl)

  // Muscle taxonomy (only rendered when the record carries it).
  const targetMuscle = record?.target_muscle ? titleCase(record.target_muscle) : null
  const muscleGroup = record?.muscle_group ? titleCase(record.muscle_group) : null
  const secondaryMuscles = (record?.secondary_muscles ?? []).map(titleCase)
  const bodyPart = record?.body_part ? titleCase(record.body_part) : null
  const equipment = record?.equipment ? titleCase(record.equipment) : null
  const mediaAttribution = record?.media_attribution ?? null
  const hasMuscleInfo = Boolean(targetMuscle || muscleGroup || secondaryMuscles.length || bodyPart || equipment)

  // The old catalog rows kept a placeholder description ("Ejercicio para .").
  const recordDescription = record?.description && record.description.trim() !== "Ejercicio para ." ? record.description : null
  const description = recordDescription || record?.instructions_es || getExerciseDescription(exerciseName)
  const instructionSteps = record?.instruction_steps_es?.length ? record.instruction_steps_es : null

  const historyGroups = useMemo<HistoryGroup[]>(() => {
    const grouped = new Map<string, ProgressionPoint[]>()
    progression.forEach(point => {
      const date = pointDate(point) || "unknown"
      if (!grouped.has(date)) grouped.set(date, [])
      grouped.get(date)!.push(point)
    })
    return Array.from(grouped.entries())
      .map(([dateKey, points]) => ({
        dateKey,
        dateLabel: formatDate(dateKey),
        best: Math.max(...points.map(point => Number(point.oneRepMax ?? point.one_rep_max ?? 0))),
        points: points.slice().sort((a, b) => (a.setNumber ?? a.set_number ?? 0) - (b.setNumber ?? b.set_number ?? 0)),
      }))
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
  }, [progression])

  const chartData = useMemo(() => historyGroups
    .slice()
    .reverse()
    .slice(-10)
    .map(group => ({
      date: group.dateKey,
      label: group.dateKey === "unknown" ? "—" : group.dateKey.slice(5),
      oneRepMax: group.best,
    })), [historyGroups])

  const latestBest = historyGroups[0]?.best ?? 0
  const selectedGroup = historyGroups.find(group => group.dateKey === selectedDate) ?? historyGroups[0]

  useEffect(() => {
    if (!open || !exerciseName) return
    setActiveTab("about")
    setSelectedDate(null)
    setProgression([])
    setProgressionLoading(true)
    const userId = targetUserId ?? user?.id
    if (!userId) {
      setProgressionLoading(false)
      return
    }
    apiFetch<{ progression?: ProgressionPoint[] }>(`/workout-plans/users/${userId}/progression?exercise=${encodeURIComponent(exerciseName)}`)
      .then(data => setProgression(data.progression ?? []))
      .catch(() => setProgression([]))
      .finally(() => setProgressionLoading(false))
  }, [open, exerciseName, targetUserId, user?.id])

  // Scroll the dialog to the instructions when the "how to" chip opens it.
  const videoSearchUrl = getYouTubeSearchUrl(exerciseName)
  const watchUrl = videoId ? getYouTubeWatchUrl(videoId) : null

  const handleShare = async () => {
    const shareUrl = watchUrl ?? videoSearchUrl
    if (typeof navigator === "undefined") return

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `${exerciseName} · Dupla`, url: shareUrl })
      } catch {
        // The user dismissed the native share sheet — nothing else to do.
      }
      return
    }

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable; the YouTube chip still exposes the link.
    }
  }

  const handleHowTo = () => {
    setActiveTab("about")
    instructionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  /** The dialog's media panel leads with the animated GIF, then the still JPG. */
  const heroImageUrl = gifUrl || thumbUrl

  // Flat frame: no halo, gradient border or coloured drop shadow behind the
  // GIF — the media panel only keeps the card's hairline border.
  const mediaFrameClass = "relative z-10 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0a0f]"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[calc(100%-1rem)] max-w-3xl flex-col overflow-hidden border-white/[0.1] bg-[#0a0a0f] p-0 text-white"
        // Always above the routine sheets (z-200) and the picker that can open it.
        overlayZIndex={400}>
        <DialogHeader className="flex-row items-center justify-between border-b border-white/[0.08] px-5 py-4 pr-12">
          <div className="min-w-0">
            <DialogTitle className="truncate text-lg font-bold">{exerciseName}</DialogTitle>
            {(record?.muscle_category || bodyPart) && (
              <p className="mt-1 text-xs text-[#888]">{record?.muscle_category || bodyPart}</p>
            )}
          </div>
        </DialogHeader>

        <div className="flex border-b border-white/[0.08] px-3 sm:px-5">
          {(["about", "history", "progress"] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`relative flex-1 px-2 py-3 text-xs font-semibold transition-colors sm:text-sm ${activeTab === tab ? "text-[#00ffff]" : "text-[#888] hover:text-white"}`}
            >
              {tab === "about" ? t.workouts.about : tab === "history" ? t.workouts.history : t.workouts.progress}
              {activeTab === tab && <span className="absolute inset-x-3 bottom-0 h-0.5 bg-[#00ffff]" />}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === "about" && (
            <div className="space-y-5">
              <div className="relative">
                <div className={mediaFrameClass}>
                  <div className="relative overflow-hidden rounded-[15px] bg-[#0a0a0f]">
                    {hasMedia ? (
                      /* The dataset GIFs are square (180×180): a square panel reads
                         better than a letterboxed 16:9 box. The GIF leads; the
                         "YouTube" chip opens the full video in a new tab. */
                      <div className="relative flex w-full items-center justify-center bg-black py-2.5">
                        <div className="relative h-[240px] w-[240px] max-w-full overflow-hidden rounded-xl bg-[#05060a]">
                          <img src={heroImageUrl ?? undefined} alt="" loading="eager" className="h-full w-full object-contain" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex aspect-video max-h-[260px] w-full flex-col items-center justify-center gap-3 px-4 text-center">
                        {recordLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin text-[#00ffff]" />
                        ) : (
                          <>
                            <p className="text-xs text-[#888]">{t.workouts.mediaUnavailable}</p>
                            <a href={videoSearchUrl} target="_blank" rel="noreferrer" className={chipClass}>
                              <Play className="h-3 w-3 fill-current" />
                              {t.workouts.searchOnYouTube}
                            </a>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <ExerciseMediaActions
                  watchUrl={watchUrl}
                  searchUrl={videoSearchUrl}
                  copied={copied}
                  onShare={handleShare}
                  onHowTo={handleHowTo}
                />
              </div>

              {hasMuscleInfo && (
                <section className="rounded-xl border border-white/[0.08] bg-[#151a21] p-4">
                  <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wide text-[#888]">{t.workouts.muscles}</h3>

                  {(targetMuscle || muscleGroup) && (
                    <div className="mb-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#666]">{t.workouts.targetMuscle}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {targetMuscle && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00ffff]/40 bg-[#00ffff]/10 px-3 py-1 text-xs font-bold text-[#00ffff]">
                            <Target className="h-3 w-3" />
                            {targetMuscle}
                          </span>
                        )}
                        {muscleGroup && <span className="text-[11px] text-[#888]">{muscleGroup}</span>}
                      </div>
                    </div>
                  )}

                  {secondaryMuscles.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#666]">{t.workouts.secondaryMuscles}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {secondaryMuscles.map(muscle => (
                          <span key={muscle} className="rounded-full border border-white/[0.1] bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-[#b8bec8]">
                            {muscle}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {(bodyPart || equipment) && (
                    <div className="grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-3">
                      {bodyPart && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#666]">{t.workouts.bodyPart}</p>
                          <p className="mt-0.5 text-xs font-semibold text-white">{bodyPart}</p>
                        </div>
                      )}
                      {equipment && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#666]">{t.workouts.equipment}</p>
                          <p className="mt-0.5 text-xs font-semibold text-white">{equipment}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {mediaAttribution && (
                    <p className="mt-3 border-t border-white/[0.06] pt-2 text-[10px] text-[#555]">{mediaAttribution}</p>
                  )}
                </section>
              )}

              {(instructionSteps || description) && (
                <section ref={instructionsRef}>
                  <h3 className="mb-2 text-sm font-bold text-white">{t.workouts.instructions}</h3>
                  {instructionSteps ? (
                    <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-[#b8bec8]">
                      {instructionSteps.map((step, index) => (
                        <li key={`${index}-${step.slice(0, 12)}`}>{step}</li>
                      ))}
                    </ol>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#b8bec8]">{description}</p>
                  )}
                </section>
              )}
              {!recordLoading && !record && !recordError && <p className="text-xs text-[#777]">{t.workouts.noCatalogMatch}</p>}
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-3">
              {subjectName && (
                <p className="text-xs font-semibold text-[#888]">
                  {t.exercisePicker.historyFor.replace("{name}", subjectName)}
                </p>
              )}
              {progressionLoading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#00ffff]" /></div>
              : historyGroups.length === 0 ? <p className="py-12 text-center text-sm text-[#777]">{t.workouts.noExerciseHistory}</p>
                : (
                  <div className="space-y-3">
                    {historyGroups.map(group => (
                    <section key={group.dateKey} className="rounded-xl border border-white/[0.08] bg-[#151a21] p-4">
                      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-medium text-[#888]">{group.dateLabel}</span>
                        <span className="text-xs font-bold text-[#00ffff]">{t.workouts.best1RM}: {group.best.toFixed(1)} kg</span>
                      </header>
                      <div className="space-y-2">
                        {group.points.map((point, index) => (
                          <div key={`${group.dateKey}-${point.setNumber ?? point.set_number ?? index}`} className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.05] pt-2 text-xs">
                            <span className="text-[#aaa]">Set {point.setNumber ?? point.set_number ?? index + 1}: <strong className="text-white">{point.weight ?? "—"} kg × {point.reps ?? "—"}</strong></span>
                            <span className="flex gap-3 text-[#888]">
                              {point.rpe != null && <span>RPE {point.rpe}</span>}
                              {point.rir != null && <span>RIR {point.rir}</span>}
                              <span className="text-[#00ffff]">1RM {Number(point.oneRepMax ?? point.one_rep_max ?? 0).toFixed(1)} kg</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                  </div>
                )}
            </div>
          )}

          {activeTab === "progress" && (
            progressionLoading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#00ffff]" /></div>
              : chartData.length < 2 ? <p className="py-12 text-center text-sm text-[#777]">{t.workouts.notEnoughProgress}</p>
                : <div className="space-y-4">
                  <section className="rounded-xl border border-white/[0.08] bg-[#151a21] p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#888]">{t.workouts.current1RM}</p>
                    <p className="mt-1 text-3xl font-bold text-white">{latestBest.toFixed(1)} <span className="text-base text-[#00ffff]">kg</span></p>
                    <p className="mt-1 text-xs text-[#777]">{selectedGroup?.dateLabel}</p>
                  </section>
                  <section className="h-64 rounded-xl border border-white/[0.08] bg-[#151a21] p-3 sm:p-5">
                    <h3 className="mb-3 text-sm font-bold text-white">{t.workouts.recentProgress}</h3>
                    <ResponsiveContainer width="100%" height="85%">
                      <LineChart
                        data={chartData}
                        onClick={state => {
                          const date = state?.activePayload?.[0]?.payload?.date
                          if (typeof date === "string") setSelectedDate(date)
                        }}
                        margin={{ top: 8, right: 12, left: -18, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="label" tick={{ fill: "#888", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#888", fontSize: 10 }} axisLine={false} tickLine={false} unit="kg" width={52} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#0a0a0f", border: "1px solid rgba(0,255,255,0.25)", borderRadius: 10, color: "#fff" }}
                          formatter={(value) => [`${Number(value).toFixed(1)} kg`, "1RM"]}
                        />
                        <Line type="monotone" dataKey="oneRepMax" stroke="#00ffff" strokeWidth={2} dot={{ r: 4, fill: "#00ffff", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </section>
                  {selectedGroup && (
                    <section className="rounded-xl border border-[#00ffff]/20 bg-[#00ffff]/[0.04] p-4">
                      <p className="mb-3 text-center text-sm font-bold text-[#00ffff]">{selectedGroup.dateLabel}</p>
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div><p className="text-[10px] uppercase text-[#888]">1RM</p><p className="mt-1 font-bold text-white">{selectedGroup.best.toFixed(1)} kg</p></div>
                        <div><p className="text-[10px] uppercase text-[#888]">{t.workouts.bestSet}</p><p className="mt-1 font-bold text-white">{(() => { const best = selectedGroup.points.slice().sort((a, b) => Number(b.oneRepMax ?? b.one_rep_max ?? 0) - Number(a.oneRepMax ?? a.one_rep_max ?? 0))[0]; return `${best?.weight ?? "—"} kg × ${best?.reps ?? "—"}` })()}</p></div>
                      </div>
                    </section>
                  )}
                </div>
          )}
        </div>

        {onPick && (
          <div className="shrink-0 border-t border-white/[0.08] bg-[#0a0a0f] p-3 sm:p-4">
            <button
              type="button"
              onClick={() => { onPick(); onOpenChange(false) }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00ffff] py-2.5 text-sm font-bold text-black transition hover:bg-[#00e5e5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ffff]/50"
            >
              <Plus className="h-4 w-4" />
              {t.exercisePicker.addToRoutine}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Thumbnail trigger + dialog, for the rows that show the reference inline.
 *
 * Screens that need to open the dialog programmatically (the exercise picker's
 * "?" button) render `ExerciseReferenceDialog` directly instead.
 */
export function ExerciseReferenceButton({ exerciseName, targetUserId, variant = "compact" }: {
  exerciseName: string
  targetUserId?: number
  /**
   * thumb: portrait 48×64 trigger used at the top-left of an exercise card (replaces the old number badge).
   * compact: 64×48 landscape thumbnail for superset rows.
   */
  variant?: "thumb" | "compact"
}) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const { recordLoading, gifUrl, thumbUrl } = useExerciseRecord(exerciseName)
  const isThumb = variant === "thumb"
  // Cards use the light JPG still and only fall back to the GIF when a row has none.
  const stillUrl = thumbUrl || gifUrl

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t.workouts.exerciseReference}
        aria-label={`${t.workouts.exerciseReference}: ${exerciseName}`}
        className={isThumb
          ? "group relative h-[68px] w-14 shrink-0 overflow-hidden rounded-lg border border-white/[0.12] bg-[#0a0a0f] shadow-[0_10px_24px_-16px_rgba(0,255,255,0.9)] transition hover:border-[#00ffff]/60 focus:outline-none focus:ring-2 focus:ring-[#00ffff]/50 sm:h-20 sm:w-16"
          : "group relative h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-white/[0.1] bg-[#0a0a0f] transition hover:border-[#00ffff]/50 focus:outline-none focus:ring-2 focus:ring-[#00ffff]/50"}
      >
        {stillUrl ? (
          <img src={stillUrl} alt="" loading="lazy" className="h-full w-full bg-black object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            {recordLoading ? <Loader2 className="h-4 w-4 animate-spin text-[#00ffff]" /> : <Dumbbell className="h-5 w-5 text-[#777]" />}
          </span>
        )}
      </button>

      <ExerciseReferenceDialog
        open={open}
        onOpenChange={setOpen}
        exerciseName={exerciseName}
        targetUserId={targetUserId}
      />
    </>
  )
}
