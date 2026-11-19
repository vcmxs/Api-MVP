"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, CalendarDays, CheckCircle2, Clock, Dumbbell, Loader2, RefreshCw } from "lucide-react"
import { format, parseISO, type Locale } from "date-fns"
import { enUS as dateFnsEnUS, es as dateFnsEs } from "date-fns/locale"
import { apiFetch } from "@/lib/api"
import { useLanguage, useT } from "@/lib/i18n"
import { cn, getLocalISOString } from "@/lib/utils"
import { WorkoutRow, type AgendaWorkout } from "./workout-row"

interface AgendaResponse {
  date: string
  summary?: { total: number; completed: number; pending: number }
  workouts?: AgendaWorkout[]
}

interface TodayWorkoutsProps {
  /** Opens the workout behind a row. Rows are read-only without it. */
  onOpenWorkout?: (workout: AgendaWorkout) => void
  onViewAll?: () => void
  /** Bump to refetch the agenda (e.g. after logging sets from the log sheet). */
  reloadKey?: number
}

function SummaryChip({ icon, label, value, color }: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
}) {
  return (
    <span
      className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold"
      style={{ backgroundColor: `${color}14`, color }}
    >
      {icon}
      <span className="text-white">{value}</span>
      <span className="font-medium opacity-80">{label}</span>
    </span>
  )
}

export function TodayWorkouts({ onOpenWorkout, onViewAll, reloadKey = 0 }: TodayWorkoutsProps) {
  const { t } = useT()
  const { language } = useLanguage()
  const dateLocale: Locale = language === "en" ? dateFnsEnUS : dateFnsEs

  const [data, setData] = useState<AgendaResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const reload = useCallback(() => setRefreshKey((n) => n + 1), [])

  useEffect(() => {
    // The agenda is "the coach's local today": the API compares DATE values
    // verbatim, so the client sends its own YYYY-MM-DD instead of a timestamp.
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    apiFetch<AgendaResponse>(`/agenda/today?date=${getLocalISOString()}`, { signal: controller.signal })
      .then((res) => {
        if (controller.signal.aborted) return
        setData(res ?? null)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setData(null)
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
    // `reloadKey` is a pure trigger: the parent bumps it when the day's plans
    // were changed elsewhere (sets logged from the agenda's log sheet), so the
    // agenda has to be fetched again even though the value is not read here.
  }, [refreshKey, reloadKey])

  const workouts = data?.workouts ?? []
  const completed = workouts.filter((w) => String(w.status).toLowerCase() === "completed").length
  const summary = data?.summary ?? { total: workouts.length, completed, pending: workouts.length - completed }
  const dateLabel = data?.date
    ? format(parseISO(`${data.date}T00:00:00`), "EEE d MMM", { locale: dateLocale })
    : null

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-[#00ff88]" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#888888]">{t.todayWorkouts.title}</h3>
          {dateLabel && <span className="text-xs text-[#555555]">{dateLabel}</span>}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={reload}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-[#888888] transition-colors hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
            title={t.todayWorkouts.refresh}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            <span className="hidden sm:inline">{t.todayWorkouts.refresh}</span>
          </button>
          {onViewAll && (
            <button onClick={onViewAll} className="text-sm font-medium text-[#00ffff] hover:underline">
              {t.todayWorkouts.viewAll}
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-4">
        {loading && !data ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-[#555555]" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <AlertCircle className="h-7 w-7 text-[#ff4444]" />
            <p className="text-sm text-[#888888]">{t.todayWorkouts.error}</p>
            <button onClick={reload} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#00ffff] hover:bg-white/[0.05]">
              {t.todayWorkouts.retry}
            </button>
          </div>
        ) : workouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 py-10 text-center">
            <Dumbbell className="mb-1 h-8 w-8 text-[#333]" />
            <p className="text-sm text-[#888888]">{t.todayWorkouts.empty}</p>
            <p className="text-xs text-[#555555]">{t.todayWorkouts.emptyHint}</p>
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <SummaryChip icon={<Dumbbell className="h-3 w-3" />} label={t.todayWorkouts.total} value={summary.total} color="#00ffff" />
              <SummaryChip icon={<CheckCircle2 className="h-3 w-3" />} label={t.todayWorkouts.completed} value={summary.completed} color="#00ff88" />
              <SummaryChip icon={<Clock className="h-3 w-3" />} label={t.todayWorkouts.pending} value={summary.pending} color="#ffd700" />
            </div>
            <div className="space-y-2">
              {workouts.map((workout) => (
                <WorkoutRow
                  key={workout.id}
                  workout={workout}
                  // "Mi rutina" only makes sense when the day mixes owners: a
                  // trainee sees nothing but their own plans, so there the
                  // routine name has to stay the headline.
                  labelMine={workouts.some((w) => w.isMine !== true)}
                  onOpen={onOpenWorkout ? () => onOpenWorkout(workout) : undefined}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
