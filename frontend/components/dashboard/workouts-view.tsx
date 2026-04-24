"use client"

import { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import {
  Plus, Trash2, Dumbbell, X, UserPlus,
  ArrowLeft, CheckCircle2, Clock, ClipboardList,
  ChevronRight, Users, Search, Loader2, AlertCircle,
  Calendar, CalendarDays, RefreshCw, Pencil, RotateCcw, Check, Lock,
  LayoutList, ChevronLeft
} from "lucide-react"
import { AssignWorkoutModal } from "./assign-workout-modal"
import { Calendar as CalendarPicker } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { format, parseISO } from "date-fns"
import { apiFetch, getUserInfo } from "@/lib/api"

// ── API types ─────────────────────────────────────────────────────────────

interface ApiSetLog {
  id: number
  set_number?: number
  setNumber?: number
  weight_used?: number
  weightUsed?: number
  reps_completed?: number
  repsCompleted?: number
  completed?: boolean
  is_completed?: boolean
  rpe?: number | null
  rir?: number | null
  duration?: number | null
  distance?: number | null
  calories?: number | null
}

interface ApiExercise {
  id: number
  name: string
  sets: number
  reps: number
  target_weight?: number
  targetWeight?: number
  weight_unit?: string
  rest_time?: number
  notes?: string
  track_rpe?: boolean | number
  trackRpe?: boolean | number
  track_rir?: boolean | number
  trackRir?: boolean | number
  is_cardio?: boolean | number
  isCardio?: boolean | number
  exerciseOrder?: number
  logs?: ApiSetLog[]
}

interface ApiWorkout {
  id: number
  name: string
  description?: string
  scheduledDate: string
  status: "pending" | "assigned" | "completed"
  coach_id?: number
  coachId?: number
  is_shared?: number | boolean
  exercises?: ApiExercise[]
}

interface ExerciseSuggestion {
  id: number
  name: string
  muscle_group?: string
  muscle_category?: string
  is_cardio?: boolean | number
  category?: string
}

// ── Internal display types ────────────────────────────────────────────────

interface DisplayExercise {
  id: string
  name: string
  sets: number
  reps: number
  weight: number
  notes?: string
}

interface DisplayWorkout {
  id: number
  name: string
  description?: string
  scheduledDate: Date
  exercises: DisplayExercise[]
  status: "completed" | "assigned" | "pending"
  isCoachAssigned: boolean
  isCoOp: boolean
}

function apiToDisplay(w: ApiWorkout, currentUserId?: number): DisplayWorkout {
  const userId = currentUserId ?? 0
  return {
    id: w.id,
    name: w.name,
    description: w.description,
    scheduledDate: parseISO(w.scheduledDate),
    exercises: (w.exercises ?? []).map((ex, i) => ({
      id: String(ex.id ?? i),
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      weight: ex.target_weight ?? ex.targetWeight ?? 0,
      notes: ex.notes,
    })),
    status: ((w.status ?? "pending").toLowerCase()) as DisplayWorkout["status"],
    isCoachAssigned: !!(w.coach_id || w.coachId) && w.coach_id !== userId,
    isCoOp: w.is_shared === 1 || w.is_shared === true,
  }
}

// ── Date grouping ─────────────────────────────────────────────────────────

function dayStart(d: Date) {
  const c = new Date(d); c.setHours(0, 0, 0, 0); return c
}

function getDateGroup(date: Date): { label: string; sortKey: number } {
  const today = dayStart(new Date())
  const d = dayStart(date)
  const diffDays = Math.round((today.getTime() - d.getTime()) / 86400000)

  if (diffDays === -1) return { label: "Tomorrow",  sortKey: -1 }
  if (diffDays < -1)   return { label: date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }), sortKey: diffDays }
  if (diffDays === 0)  return { label: "Today",     sortKey: 0 }
  if (diffDays === 1)  return { label: "Yesterday", sortKey: 1 }
  if (diffDays < 7)    return { label: date.toLocaleDateString("en-US", { weekday: "long" }), sortKey: diffDays }
  // Older than a week: actual date
  return {
    label: date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" }),
    sortKey: diffDays,
  }
}

function groupByDate(workouts: DisplayWorkout[]): { label: string; sortKey: number; items: DisplayWorkout[] }[] {
  const map = new Map<string, { label: string; sortKey: number; items: DisplayWorkout[] }>()
  workouts.forEach((w) => {
    const { label, sortKey } = getDateGroup(w.scheduledDate)
    if (!map.has(label)) map.set(label, { label, sortKey, items: [] })
    map.get(label)!.items.push(w)
  })
  return Array.from(map.values()).sort((a, b) => a.sortKey - b.sortKey)
}

const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
  completed: { bg: "rgba(0,255,136,0.15)", color: "#00ff88", label: "COMPLETED" },
  assigned:  { bg: "rgba(255,215,0,0.15)",  color: "#ffd700", label: "ASSIGNED"  },
  pending:   { bg: "rgba(136,136,136,0.15)", color: "#888888", label: "PENDING"  },
}

const fallbackStatus = { bg: "rgba(136,136,136,0.15)", color: "#888888", label: "PENDING" }

function getStatusConfig(status: string) {
  return statusConfig[status?.toLowerCase()] ?? fallbackStatus
}

// ── Stat Card ─────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color, active, onClick }: {
  label: string; value: number; icon: React.ReactNode; color: string
  active?: boolean; onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-all",
        active ? "border-[color:var(--c)] bg-[color:var(--c)]/10" : "border-white/[0.08] bg-[#161b22] hover:border-white/[0.15]"
      )}
      style={{ "--c": color } as React.CSSProperties}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}18`, color }}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-[#555555]">{label}</p>
      </div>
    </button>
  )
}

// ── Workout Card ──────────────────────────────────────────────────────────

function WorkoutCard({ workout, onClick, onDelete, onAssign, isExpired }: {
  workout: DisplayWorkout
  onClick: () => void
  onDelete: (id: number) => void
  onAssign: (id: number) => void
  isExpired?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const sc = getStatusConfig(workout.status)

  let wrapperStyle: React.CSSProperties = {}
  let borderClass = "border border-white/[0.08]"
  if (workout.isCoOp) {
    wrapperStyle = { background: "linear-gradient(135deg,#ff4444,#00ffff)", padding: "2px", borderRadius: "16px" }
    borderClass = ""
  } else if (workout.isCoachAssigned && workout.status !== "completed") {
    // Yellow outline only for pending/assigned workouts from a coach — not for completed ones
    wrapperStyle = { background: "linear-gradient(135deg,#FFC107,#FFA000)", padding: "2px", borderRadius: "16px" }
    borderClass = ""
  }

  const inner = (
    <div
      className={cn("relative flex cursor-pointer items-center justify-between rounded-2xl bg-[#161b22] p-4 transition-all overflow-hidden", borderClass, hovered && !workout.isCoOp && !workout.isCoachAssigned && "bg-[#1c2128]")}
      style={workout.isCoOp || workout.isCoachAssigned ? { borderRadius: "14px" } : {}}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={isExpired ? () => alert("Your subscription has expired. Please contact your coach to resume your training.") : onClick}
    >
      {isExpired && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Lock className="h-6 w-6 text-white/70" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-bold text-white">{workout.name}</h3>
          {workout.isCoOp && <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: "rgba(255,68,68,0.15)", color: "#ff4444" }}>Co-Op</span>}
        </div>
        <p className="mt-0.5 text-sm text-[#888888]">{format(workout.scheduledDate, "MMM d, yyyy")}</p>
        <p className="mt-0.5 text-xs text-[#555555]">{workout.exercises.length} exercise{workout.exercises.length !== 1 ? "s" : ""}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: sc.bg, color: sc.color }}>{sc.label}</span>
        {hovered && (
          <>
            <button onClick={(e) => { e.stopPropagation(); onAssign(workout.id) }} title="Assign to trainee" className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00ffff]/10 text-[#00ffff] hover:bg-[#00ffff]/20"><UserPlus className="h-4 w-4" /></button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(workout.id) }} title="Delete" className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff4444]/10 text-[#ff4444] hover:bg-[#ff4444]/20"><Trash2 className="h-4 w-4" /></button>
          </>
        )}
        <ChevronRight className="h-4 w-4 shrink-0 text-[#555555]" />
      </div>
    </div>
  )

  const hasGradientBorder = workout.isCoOp || (workout.isCoachAssigned && workout.status !== "completed")
  return hasGradientBorder ? <div style={wrapperStyle}>{inner}</div> : inner
}

// ── Last session history hook ─────────────────────────────────────────────

function useLastSessionHistory(exerciseName: string, workoutDate?: string) {
  const user = getUserInfo()
  const [history, setHistory] = useState<Record<number, string>>({})

  useEffect(() => {
    if (!exerciseName || !user?.id) return
    let cancelled = false
    setHistory({})
    apiFetch<{ progression?: { date?: string; completed_at?: string; setNumber?: number; set_number?: number; weight?: number; weight_used?: number; weightUsed?: number; reps?: number; reps_completed?: number; repsCompleted?: number; weightUnit?: string; weight_unit?: string }[] }>(
      `/workout-plans/users/${user.id}/progression?exercise=${encodeURIComponent(exerciseName)}`
    ).then(d => {
      if (cancelled) return
      const rawLogs = d.progression ?? []
      if (!rawLogs.length) return
      const logsByDate: Record<string, typeof rawLogs> = {}
      for (const l of rawLogs) {
        const date = (l.date || l.completed_at || "").split("T")[0] || "unknown"
        ;(logsByDate[date] ??= []).push(l)
      }
      const sorted = Object.keys(logsByDate).sort((a, b) => b.localeCompare(a))
      const cutoff = workoutDate ?? new Date().toISOString().split("T")[0]
      const targetDate = sorted.find(d => d < cutoff)
      if (!targetDate) return
      const map: Record<number, string> = {}
      for (const l of logsByDate[targetDate]) {
        const setNum = l.setNumber ?? l.set_number
        const w = l.weight ?? l.weightUsed ?? l.weight_used
        const r = l.reps ?? l.repsCompleted ?? l.reps_completed
        const unit = l.weightUnit ?? l.weight_unit ?? "kg"
        if (setNum != null && w != null && r != null) map[setNum] = `${w}${unit}×${r}`
      }
      setHistory(map)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [exerciseName, user?.id, workoutDate]) // eslint-disable-line react-hooks/exhaustive-deps

  return history
}

// ── Set log row (interactive) ─────────────────────────────────────────────

function SetLogRow({ setNumber, log, exercise, workoutId, onRefresh, lastHistory }: {
  setNumber: number
  log: ApiSetLog | undefined
  exercise: ApiExercise
  workoutId: number
  onRefresh: () => void
  lastHistory?: string
}) {
  const isDone = !!(log?.completed || log?.is_completed)
  const [editing, setEditing] = useState(false)
  const [weight, setWeight] = useState("")
  const [reps, setReps] = useState("")
  const [saving, setSaving] = useState(false)

  // Sync inputs when log data changes
  useEffect(() => {
    const logWeight = log?.weight_used ?? log?.weightUsed
    const logReps   = log?.reps_completed ?? log?.repsCompleted
    setWeight(logWeight != null ? String(logWeight) : String(exercise.target_weight ?? exercise.targetWeight ?? ""))
    setReps(logReps != null ? String(logReps) : String(exercise.reps ?? ""))
  }, [log, exercise])

  const handleLog = async () => {
    setSaving(true)
    try {
      const payload = {
        setNumber,
        weightUsed: parseFloat(weight) || 0,
        repsCompleted: parseInt(reps) || 0,
        weightUnit: exercise.weight_unit ?? "kg",
        completed: true,
      }
      if (log?.id) {
        await apiFetch(`/workout-plans/${workoutId}/exercises/${exercise.id}/logs/${log.id}`, {
          method: "PUT", body: JSON.stringify(payload),
        })
      } else {
        await apiFetch(`/workout-plans/${workoutId}/exercises/${exercise.id}/logs`, {
          method: "POST", body: JSON.stringify(payload),
        })
      }
      onRefresh()
      setEditing(false)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to log set")
    } finally {
      setSaving(false)
    }
  }

  const handleUncheck = async () => {
    if (!log?.id) return
    setSaving(true)
    try {
      await apiFetch(`/workout-plans/${workoutId}/exercises/${exercise.id}/logs/${log.id}`, { method: "DELETE" })
      onRefresh()
      setEditing(false)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to uncheck set")
    } finally {
      setSaving(false)
    }
  }

  // Completed, read-only row
  if (isDone && !editing) {
    const w = log?.weight_used ?? log?.weightUsed
    const r = log?.reps_completed ?? log?.repsCompleted
    return (
      <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(0,255,136,0.06)" }}>
        <span className="w-6 shrink-0 text-sm font-bold text-[#00ff88]">{setNumber}</span>
        <span className="w-16 shrink-0 text-center text-[10px] font-bold" style={{ color: lastHistory ? "#00ffff" : "#444444" }}>{lastHistory ?? "—"}</span>
        <span className="w-20 shrink-0 text-center text-sm font-medium text-white">{w != null ? `${w}${exercise.weight_unit ?? "kg"}` : "—"}</span>
        <span className="w-14 shrink-0 text-center text-sm font-medium text-white">{r ?? "—"}</span>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setEditing(true)} className="flex h-6 w-6 items-center justify-center rounded text-[#555555] transition-colors hover:text-[#00ffff]" title="Edit set">
            <Pencil className="h-3 w-3" />
          </button>
          <button onClick={handleUncheck} disabled={saving} className="flex h-6 w-6 items-center justify-center rounded text-[#555555] transition-colors hover:text-[#ff4444]" title="Uncheck set">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
          </button>
        </div>
      </div>
    )
  }

  // Editable row (pending or editing a completed set)
  return (
    <div className="flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
      <span className="w-6 shrink-0 text-sm font-bold text-[#888888]">{setNumber}</span>
      <span className="w-16 shrink-0 text-center text-[10px] font-bold text-[#555555]">{lastHistory ?? "—"}</span>
      <input
        type="number"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        placeholder={String(exercise.target_weight ?? exercise.targetWeight ?? "0")}
        className="w-20 min-w-0 shrink-0 rounded-lg border border-white/[0.08] bg-[#0a0a0f] px-2 py-1.5 text-center text-sm text-white focus:border-[#00ffff]/50 focus:outline-none"
      />
      <input
        type="number"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        placeholder={String(exercise.reps ?? "0")}
        className="w-14 min-w-0 shrink-0 rounded-lg border border-white/[0.08] bg-[#0a0a0f] px-2 py-1.5 text-center text-sm text-white focus:border-[#00ffff]/50 focus:outline-none"
      />
      <div className="ml-auto flex items-center gap-1">
        {editing && (
          <button onClick={() => setEditing(false)} className="flex h-7 w-7 items-center justify-center rounded text-[#555555] hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={handleLog}
          disabled={saving || !weight || !reps}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00ffff] text-black transition-opacity disabled:opacity-40"
          title="Log set"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  )
}

// ── Exercise set section ───────────────────────────────────────────────────

function ExerciseSetSection({ exercise, index, workoutId, workoutDate, onRefresh }: {
  exercise: ApiExercise
  index: number
  workoutId: number
  workoutDate?: string
  onRefresh: () => void
}) {
  const logs = (exercise.logs ?? []).slice().sort(
    (a, b) => (a.set_number ?? a.setNumber ?? 0) - (b.set_number ?? b.setNumber ?? 0)
  )
  const rowCount = Math.max(exercise.sets ?? 1, logs.length)
  const completedCount = logs.filter(l => l.completed || l.is_completed).length
  const targetWeight = exercise.target_weight ?? exercise.targetWeight
  const isCardio = !!(exercise.is_cardio || exercise.isCardio)
  const lastHistory = useLastSessionHistory(exercise.name, workoutDate)

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#161b22] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#00ffff]/10 text-xs font-bold text-[#00ffff]">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate">{exercise.name}</p>
          <p className="text-xs text-[#555555]">
            Target: {exercise.sets} sets × {exercise.reps} reps
            {targetWeight != null && targetWeight > 0 && ` @ ${targetWeight}${exercise.weight_unit ?? "kg"}`}
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold" style={{ color: completedCount === rowCount && rowCount > 0 ? "#00ff88" : completedCount > 0 ? "#ffd700" : "#555555" }}>
          {completedCount}/{rowCount}
        </span>
      </div>

      {/* Column headers */}
      {!isCardio && (
        <div className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[#555555]">
          <span className="w-6 shrink-0">Set</span>
          <span className="w-16 shrink-0 text-center">Last</span>
          <span className="w-20 shrink-0 text-center">Weight</span>
          <span className="w-14 shrink-0 text-center">Reps</span>
        </div>
      )}

      {/* Set rows */}
      <div className="space-y-1 px-1 pb-2">
        {Array.from({ length: rowCount }, (_, i) => i + 1).map((setNum) => {
          const log = logs.find(l => (l.set_number ?? l.setNumber) === setNum)
          if (isCardio) {
            // Cardio: read-only display for now
            const isDone = !!(log?.completed || log?.is_completed)
            return (
              <div key={setNum} className="grid grid-cols-4 items-center rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: isDone ? "rgba(0,255,136,0.06)" : "rgba(255,255,255,0.03)" }}>
                <span className="font-bold" style={{ color: isDone ? "#00ff88" : "#888888" }}>{setNum}</span>
                <span className="text-center text-white">{log?.duration != null ? `${(log.duration / 60).toFixed(1)}m` : "—"}</span>
                <span className="text-center text-white">{log?.distance != null ? `${log.distance}km` : "—"}</span>
                <span className="text-center text-white">{log?.calories != null ? `${log.calories}kcal` : "—"}</span>
              </div>
            )
          }
          return (
            <SetLogRow
              key={setNum}
              setNumber={setNum}
              log={log}
              exercise={exercise}
              workoutId={workoutId}
              onRefresh={onRefresh}
              lastHistory={lastHistory[setNum]}
            />
          )
        })}
      </div>

      {exercise.notes && (
        <div className="mx-3 mb-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2">
          <p className="text-xs text-[#aaa]">{exercise.notes}</p>
        </div>
      )}
    </div>
  )
}

// ── Workout Detail Sheet ──────────────────────────────────────────────────

function WorkoutDetailSheet({ workout, open, onOpenChange }: {
  workout: DisplayWorkout | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [rawDetail, setRawDetail] = useState<ApiWorkout | null>(null)
  const [loading, setLoading] = useState(false)
  const [completing, setCompleting] = useState(false)

  const fetchDetail = useCallback(async (id: number, silent: boolean = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await apiFetch<ApiWorkout>(`/workout-plans/${id}`)
      setRawDetail(data)
    } catch {
      setRawDetail(null)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open || !workout) { setRawDetail(null); return }
    fetchDetail(workout.id)
  }, [open, workout?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleComplete = async () => {
    if (!workout || !rawDetail) return

    // Count incomplete sets across all exercises
    const exercises = rawDetail.exercises ?? []
    let totalSets = 0
    let completedSets = 0
    exercises.forEach(ex => {
      const setCount = ex.sets ?? 1
      totalSets += setCount
      const logs = ex.logs ?? []
      completedSets += logs.filter(l => l.completed || l.is_completed).length
    })
    const incompleteSets = totalSets - completedSets

    if (incompleteSets > 0) {
      const confirmed = window.confirm(
        `⚠️ Incomplete Workout\n\n` +
        `You have ${incompleteSets} unlogged set${incompleteSets !== 1 ? 's' : ''} out of ${totalSets} total.\n\n` +
        `If you complete now, those sets will remain unlogged.\n\n` +
        `Complete anyway?`
      )
      if (!confirmed) return
    }

    setCompleting(true)
    try {
      await apiFetch(`/workout-plans/${workout.id}/complete`, {
        method: "POST",
        body: JSON.stringify({ overallNotes: "Completed via Web App", rating: 5 }),
      })
      fetchDetail(workout.id)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to complete workout")
    } finally {
      setCompleting(false)
    }
  }

  if (!workout) return null
  const sc = getStatusConfig(workout.status)
  const isCompleted = workout.status === "completed"
  const exercises = (rawDetail?.exercises ?? [])
    .slice()
    .sort((a, b) => (a.exerciseOrder ?? 0) - (b.exerciseOrder ?? 0))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col border-l border-white/[0.08] bg-[#0a0a0f] p-0 sm:max-w-md">
        <SheetHeader className="flex-row items-center justify-between border-b border-white/[0.08] px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00ffff]/10">
              <Dumbbell className="h-5 w-5 text-[#00ffff]" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="truncate text-lg font-bold text-white">{workout.name}</SheetTitle>
              <p className="text-xs text-[#555555]">{format(workout.scheduledDate, "EEEE, MMM d yyyy")}</p>
            </div>
          </div>
          {/* No manual X button here — Sheet renders its own close button */}
        </SheetHeader>

        <div className="flex items-center gap-3 border-b border-white/[0.06] px-6 py-3">
          <span className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider" style={{ backgroundColor: sc.bg, color: sc.color }}>{sc.label}</span>
          {workout.isCoachAssigned && <span className="rounded px-2 py-1 text-[10px] font-bold uppercase" style={{ backgroundColor: "rgba(255,215,0,0.12)", color: "#ffd700" }}>Coach Assigned</span>}
          {workout.isCoOp && <span className="rounded px-2 py-1 text-[10px] font-bold uppercase" style={{ backgroundColor: "rgba(255,68,68,0.12)", color: "#ff4444" }}>Co-Op</span>}
        </div>
        {workout.description && <p className="border-b border-white/[0.04] px-6 py-3 text-sm text-[#888888]">{workout.description}</p>}

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#00ffff]" />
            </div>
          ) : exercises.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-[#555555]">
              <Dumbbell className="mb-2 h-8 w-8" />
              <p className="text-sm">No exercises found</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[#555555]">
                {exercises.length} Exercise{exercises.length !== 1 ? "s" : ""}
              </p>
              {exercises.map((ex, idx) => (
                <ExerciseSetSection
                  key={ex.id}
                  exercise={ex}
                  index={idx}
                  workoutId={workout.id}
                  workoutDate={workout.scheduledDate instanceof Date ? workout.scheduledDate.toISOString().split("T")[0] : String(workout.scheduledDate).split("T")[0]}
                  onRefresh={() => fetchDetail(workout.id, true)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer — Complete button (only when not already completed) */}
        {!loading && !isCompleted && (
          <div className="border-t border-white/[0.08] px-6 py-4">
            <button
              onClick={handleComplete}
              disabled={completing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00ff88] py-3 font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {completing ? "Saving…" : "Complete Workout"}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ── Exercise search hook ──────────────────────────────────────────────────

function useExerciseSuggestions(query: string) {
  const [suggestions, setSuggestions] = useState<ExerciseSuggestion[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await apiFetch<ExerciseSuggestion[] | { exercises: ExerciseSuggestion[] }>(`/exercises?search=${encodeURIComponent(query)}`)
        const list = Array.isArray(data) ? data : (data as { exercises: ExerciseSuggestion[] }).exercises ?? []
        setSuggestions(list.slice(0, 8))
      } catch { setSuggestions([]) }
      finally { setLoading(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  return { suggestions, loading }
}

// ── Exercise Picker Modal ─────────────────────────────────────────────────

function isCardioExercise(ex: ExerciseSuggestion): boolean {
  const cat = (ex.muscle_category ?? ex.muscle_group ?? "").toLowerCase()
  const name = (ex.name ?? "").toLowerCase()
  return !!(
    ex.is_cardio ||
    cat.includes("cardio") || cat.includes("aerobic") ||
    name.includes("treadmill") || name.includes("cycling") ||
    name.includes("running") || name.includes("correr") ||
    name.includes("bici") || name.includes("caminadora") ||
    name.includes("elíptica") || name.includes("eliptica")
  )
}

function ExercisePickerPanel({ open, onClose, onSelect, onDone }: {
  open: boolean
  onClose: () => void
  onSelect: (ex: { name: string; isCardio: boolean }) => void
  onDone: () => void
}) {
  const [mode, setMode] = useState<"categories" | "exercises" | "search">("categories")
  const [categories, setCategories] = useState<string[]>([])
  const [catsLoading, setCatsLoading] = useState(false)
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [catExercises, setCatExercises] = useState<ExerciseSuggestion[]>([])
  const [catLoading, setCatLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const { suggestions: searchResults, loading: searchLoading } = useExerciseSuggestions(searchQuery)

  useEffect(() => {
    if (!open) return
    setMode("categories")
    setSelectedCat(null)
    setSearchQuery("")
    setCatsLoading(true)
    apiFetch<string[] | { categories: string[] }>("/exercises/categories")
      .then((data) => setCategories(Array.isArray(data) ? data : (data as { categories: string[] }).categories ?? []))
      .catch(() => setCategories([]))
      .finally(() => setCatsLoading(false))
  }, [open])

  const selectCategory = async (cat: string) => {
    setSelectedCat(cat)
    setMode("exercises")
    setCatLoading(true)
    try {
      const data = await apiFetch<ExerciseSuggestion[] | { exercises: ExerciseSuggestion[] }>(`/exercises?category=${encodeURIComponent(cat)}`)
      setCatExercises(Array.isArray(data) ? data : (data as { exercises: ExerciseSuggestion[] }).exercises ?? [])
    } catch { setCatExercises([]) }
    finally { setCatLoading(false) }
  }

  const pick = (ex: ExerciseSuggestion) => {
    onSelect({ name: ex.name, isCardio: isCardioExercise(ex) })
    // Reset to categories so user can immediately pick the next exercise
    setMode("categories")
    setSelectedCat(null)
    setSearchQuery("")
  }

  if (typeof window === "undefined") return null

  return createPortal(
    <div
      className="fixed top-0 z-[199] flex h-screen w-72 flex-col border-r border-white/[0.08] bg-[#0f1117] shadow-2xl transition-transform duration-300 ease-in-out"
      style={{
        right: "32rem",
        transform: open ? "translateX(0)" : "translateX(calc(100% + 33rem))",
        pointerEvents: open ? "auto" : "none",
      }}
    >
      {/* Header */}
      <div className="flex h-20 items-center justify-between border-b border-white/[0.08] px-5">
        <div className="flex items-center gap-2">
          {mode === "exercises" ? (
            <button
              onClick={() => setMode("categories")}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] text-[#888888] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#00ffff]/10">
              <Dumbbell className="h-4 w-4 text-[#00ffff]" />
            </div>
          )}
          <span className="font-bold text-white text-sm">
            {mode === "search" ? "Search" : mode === "exercises" ? selectedCat : "Muscle Group"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setMode(mode === "search" ? "categories" : "search")}
            className={cn("flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] transition-colors",
              mode === "search" ? "bg-[#00ffff]/10 text-[#00ffff]" : "text-[#888888] hover:text-white")}
          >
            <Search className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] text-[#888888] hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Search input */}
      {mode === "search" && (
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#555555]" />
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search exercises..."
              className="w-full rounded-xl border border-white/[0.08] bg-[#161b22] py-2 pl-9 pr-3 text-sm text-white placeholder:text-[#555555] focus:border-[#00ffff]/50 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto py-1">
        {mode === "search" ? (
          searchLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-[#555555]" /></div>
          ) : searchQuery.length < 2 ? (
            <p className="py-8 text-center text-xs text-[#555555]">Type to search…</p>
          ) : searchResults.length === 0 ? (
            <p className="py-8 text-center text-xs text-[#555555]">No exercises found</p>
          ) : (
            searchResults.map((ex) => (
              <button key={ex.id} onClick={() => pick(ex)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04]">
                <Dumbbell className="h-3.5 w-3.5 shrink-0 text-[#555555]" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{ex.name}</p>
                  {(ex.muscle_category ?? ex.muscle_group) && (
                    <p className="text-[10px] text-[#555555]">{ex.muscle_category ?? ex.muscle_group}</p>
                  )}
                </div>
              </button>
            ))
          )
        ) : mode === "categories" ? (
          catsLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-[#555555]" /></div>
          ) : (
            categories.map((cat, i) => (
              <button key={i} onClick={() => selectCategory(cat)}
                className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-white/[0.04]">
                <span className="text-sm font-medium text-white">{cat}</span>
                <ChevronRight className="h-4 w-4 text-[#555555]" />
              </button>
            ))
          )
        ) : catLoading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-[#555555]" /></div>
        ) : catExercises.length === 0 ? (
          <p className="py-8 text-center text-xs text-[#555555]">No exercises found</p>
        ) : (
          catExercises.map((ex) => (
            <button key={ex.id} onClick={() => pick(ex)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04]">
              <Dumbbell className="h-3.5 w-3.5 shrink-0 text-[#555555]" />
              <span className="truncate text-sm font-medium text-white">{ex.name}</span>
            </button>
          ))
        )}
      </div>

      {/* Done footer */}
      <div className="border-t border-white/[0.08] p-3">
        <button
          onClick={onDone}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00ffff] py-2.5 text-sm font-bold text-black hover:bg-[#00e5e5]"
        >
          <Check className="h-4 w-4" /> Done
        </button>
      </div>
    </div>,
    document.body
  )
}

// ── Workout Builder Sheet ─────────────────────────────────────────────────

interface BuilderExercise {
  id: string
  name: string
  sets: number
  reps: number
  weight: number
  notes: string
  isCardio?: boolean
}

function ExerciseRow({ ex, index, onChange, onRemove, onPickExercise }: {
  ex: BuilderExercise
  index: number
  onChange: (id: string, field: keyof BuilderExercise, value: string | number) => void
  onRemove: (id: string) => void
  onPickExercise: (id: string) => void
}) {
  const lastHistory = useLastSessionHistory(ex.name)
  const historyEntries = Object.entries(lastHistory).sort((a, b) => Number(a[0]) - Number(b[0]))

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#0a0a0f] text-xs font-bold text-[#555555]">{index + 1}</span>
        <button
          onClick={() => onPickExercise(ex.id)}
          className={cn(
            "flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:border-[#00ffff]/40",
            ex.name
              ? "border-white/[0.08] bg-[#0a0a0f] font-medium text-white"
              : "border-dashed border-white/[0.12] bg-transparent text-[#555555]"
          )}
        >
          <Dumbbell className="h-3.5 w-3.5 shrink-0 text-[#555555]" />
          <span className="flex-1 truncate">{ex.name || "Select exercise..."}</span>
          {ex.isCardio && (
            <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ backgroundColor: "rgba(0,255,255,0.12)", color: "#00ffff" }}>Cardio</span>
          )}
        </button>
        <button onClick={() => onRemove(ex.id)} className="text-[#555555] hover:text-[#ff4444]"><X className="h-4 w-4" /></button>
      </div>

      {historyEntries.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#444]">Last</span>
          {historyEntries.map(([setNum, val]) => (
            <span key={setNum} className="rounded px-1.5 py-0.5 text-[9px] font-bold text-[#888888]" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
              {val}
            </span>
          ))}
        </div>
      )}

      {ex.isCardio ? (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[10px] text-[#555555]">Sets</label>
            <input type="number" value={ex.sets} onChange={(e) => onChange(ex.id, "sets", parseFloat(e.target.value) || 0)}
              className="w-full rounded-lg border border-white/[0.08] bg-[#0a0a0f] px-3 py-2 text-sm text-white focus:border-[#00ffff]/40 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-[#555555]">Duration (min)</label>
            <input type="number" value={ex.reps} onChange={(e) => onChange(ex.id, "reps", parseFloat(e.target.value) || 0)}
              className="w-full rounded-lg border border-white/[0.08] bg-[#0a0a0f] px-3 py-2 text-sm text-white focus:border-[#00ffff]/40 focus:outline-none" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {(["sets", "reps", "weight"] as const).map((field) => (
            <div key={field}>
              <label className="mb-1 block text-[10px] text-[#555555] capitalize">{field === "weight" ? "Weight (kg)" : field}</label>
              <input type="number" value={ex[field]} onChange={(e) => onChange(ex.id, field, parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-white/[0.08] bg-[#0a0a0f] px-3 py-2 text-sm text-white focus:border-[#00ffff]/40 focus:outline-none" />
            </div>
          ))}
        </div>
      )}

      <input type="text" value={ex.notes} onChange={(e) => onChange(ex.id, "notes", e.target.value)}
        placeholder="Notes (optional)"
        className="mt-2 w-full rounded-lg border border-white/[0.06] bg-transparent px-3 py-1.5 text-xs text-[#888888] placeholder:text-[#333] focus:outline-none" />
    </div>
  )
}

function WorkoutBuilderSheet({ open, onOpenChange, onSave, saving }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSave: (data: { name: string; description: string; scheduledDate: string; exercises: BuilderExercise[] }) => void
  saving: boolean
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [scheduledDate, setScheduledDate] = useState<Date>(new Date())
  const [exercises, setExercises] = useState<BuilderExercise[]>([])
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [pickerTargetId, setPickerTargetId] = useState<string | null>(null)

  const addExercise = () =>
    setExercises([...exercises, { id: `ex-${Date.now()}`, name: "", sets: 3, reps: 10, weight: 0, notes: "", isCardio: false }])

  const updateExercise = (id: string, field: keyof BuilderExercise, value: string | number) =>
    setExercises(exercises.map((ex) => ex.id === id ? { ...ex, [field]: value } : ex))

  const removeExercise = (id: string) =>
    setExercises(exercises.filter((ex) => ex.id !== id))

  const openPicker = (id: string) => setPickerTargetId(id)

  const handlePickExercise = ({ name: exName, isCardio }: { name: string; isCardio: boolean }) => {
    if (!pickerTargetId) return
    // Fill current row, then auto-add a new empty row and target it (panel stays open)
    const newId = `ex-${Date.now()}`
    setExercises(prev => [
      ...prev.map(ex => ex.id === pickerTargetId ? { ...ex, name: exName, isCardio } : ex),
      { id: newId, name: "", sets: 3, reps: 10, weight: 0, notes: "", isCardio: false },
    ])
    setPickerTargetId(newId)
  }

  const handlePickerDone = () => {
    // Remove trailing empty rows then close
    setExercises(prev => prev.filter(ex => ex.name.trim()))
    setPickerTargetId(null)
  }

  const handleSave = () => {
    if (!name.trim()) return
    onSave({ name, description, scheduledDate: format(scheduledDate, "yyyy-MM-dd"), exercises: exercises.filter((ex) => ex.name.trim()) })
  }

  // Reset on close
  useEffect(() => {
    if (!open) { setName(""); setDescription(""); setScheduledDate(new Date()); setExercises([]); setPickerTargetId(null) }
  }, [open])

  return (
  <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col border-l border-white/[0.08] bg-[#0a0a0f] p-0 sm:max-w-lg"
        style={{ zIndex: 200 }}
        onInteractOutside={(e) => { if (pickerTargetId) e.preventDefault() }}
      >
        <SheetHeader className="flex-row items-center justify-between border-b border-white/[0.08] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00ffff]/10">
              <Dumbbell className="h-5 w-5 text-[#00ffff]" />
            </div>
            <SheetTitle className="text-lg font-bold text-white">New Workout</SheetTitle>
          </div>
          <button onClick={() => onOpenChange(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#888888] hover:bg-white/[0.05] hover:text-white"><X className="h-4 w-4" /></button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#888888]">Workout Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Upper Body Strength" className="w-full rounded-xl border border-white/[0.08] bg-[#161b22] px-4 py-3 text-white placeholder:text-[#555555] focus:border-[#00ffff]/50 focus:outline-none" />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#888888]">Description (optional)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." rows={2} className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#161b22] px-4 py-3 text-white placeholder:text-[#555555] focus:border-[#00ffff]/50 focus:outline-none" />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#888888]">Scheduled Date</label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <button className="flex w-full items-center justify-between rounded-xl border border-white/[0.08] bg-[#161b22] px-4 py-3 text-white hover:border-white/[0.15]">
                    <span>{format(scheduledDate, "PPP")}</span>
                    <CalendarDays className="h-4 w-4 text-[#888888]" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto border-white/[0.08] bg-[#161b22] p-0" align="start">
                  <CalendarPicker mode="single" selected={scheduledDate} onSelect={(d) => { if (d) { setScheduledDate(d); setDatePickerOpen(false) } }} className="text-white" />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-medium text-[#888888]">Exercises ({exercises.length})</label>
                <button onClick={addExercise} className="flex items-center gap-1.5 rounded-lg bg-[#00ffff]/10 px-3 py-1.5 text-xs font-medium text-[#00ffff] hover:bg-[#00ffff]/20">
                  <Plus className="h-3.5 w-3.5" /> Add Exercise
                </button>
              </div>

              {exercises.length === 0 ? (
                <button onClick={addExercise} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.12] py-8 text-sm text-[#555555] hover:border-[#00ffff]/30 hover:text-[#00ffff]">
                  <Plus className="h-4 w-4" /> Add your first exercise
                </button>
              ) : (
                <div className="space-y-3">
                  {exercises.map((ex, i) => (
                    <ExerciseRow key={ex.id} ex={ex} index={i} onChange={updateExercise} onRemove={removeExercise} onPickExercise={openPicker} />
                  ))}
                  <button onClick={addExercise} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.08] py-3 text-sm text-[#555555] hover:border-[#00ffff]/30 hover:text-[#00ffff]">
                    <Plus className="h-4 w-4" /> Add Exercise
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 border-t border-white/[0.08] px-6 py-4">
          <button onClick={() => onOpenChange(false)} className="flex-1 rounded-xl border border-white/[0.15] bg-[#161b22] py-3 font-medium text-white hover:bg-[#1c2128]">Cancel</button>
          <button onClick={handleSave} disabled={!name.trim() || saving} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#00ffff] py-3 font-bold text-black hover:bg-[#00e5e5] disabled:cursor-not-allowed disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Workout
          </button>
        </div>
      </SheetContent>
    </Sheet>

    <ExercisePickerPanel
      open={pickerTargetId !== null}
      onClose={handlePickerDone}
      onSelect={handlePickExercise}
      onDone={handlePickerDone}
    />
  </>
  )
}


// ── Main WorkoutsView ─────────────────────────────────────────────────────

export function WorkoutsView() {
  const [workouts, setWorkouts] = useState<DisplayWorkout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const [builderOpen, setBuilderOpen] = useState(false)
  const [detailWorkout, setDetailWorkout] = useState<DisplayWorkout | null>(null)
  const [filterDate, setFilterDate] = useState<Date | undefined>()
  const [dateFilterOpen, setDateFilterOpen] = useState(false)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [assigningWorkoutId, setAssigningWorkoutId] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "assigned" | "pending">("all")
  const [isExpired, setIsExpired] = useState(false)
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar")
  const [calendarDate, setCalendarDate] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })

  const calendarDays = (() => {
    const monday = new Date(calendarDate)
    const dow = monday.getDay()
    monday.setDate(monday.getDate() + (dow === 0 ? -6 : 1 - dow))
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return d
    })
  })()

  const navigateWeek = (dir: 1 | -1) => {
    setCalendarDate(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() + dir * 7)
      return d
    })
  }

  const isToday = (d: Date) => {
    const today = new Date()
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  }

  // ── Fetch workouts ────────────────────────────────────────────────────

  const fetchWorkouts = useCallback(async () => {
    // Read user fresh on every call — avoids stale closure from initial render
    const user = getUserInfo()
    if (!user?.id) { setError("Not logged in"); setLoading(false); return }
    
    // Calculate expiry
    const endDate = user?.coachSubscriptionEndDate ?? user?.coach_subscription_end_date
    if (endDate) {
      const diff = new Date(endDate).getTime() - new Date().getTime()
      setIsExpired(Math.ceil(diff / (1000 * 60 * 60 * 24)) < 0)
    }

    setLoading(true); setError("")
    try {
      const data = await apiFetch<{ workoutPlans: ApiWorkout[] }>(`/trainees/${user.id}/workout-plans`)
      const plans = data.workoutPlans ?? []
      setWorkouts(plans.map((w) => apiToDisplay(w, user.id)))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load workouts"
      // 404 / "not found" just means no workouts yet — show empty state
      if (msg.toLowerCase().includes("not found") || msg.includes("404")) {
        setWorkouts([])
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchWorkouts() }, [fetchWorkouts])

  // ── Actions ───────────────────────────────────────────────────────────

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this workout?")) return
    try {
      await apiFetch(`/workout-plans/${id}`, { method: "DELETE" })
      setWorkouts((prev) => prev.filter((w) => w.id !== id))
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to delete")
    }
  }

  const handleAssign = (id: number) => { setAssigningWorkoutId(id); setAssignModalOpen(true) }

  const handleCreate = async (data: { name: string; description: string; scheduledDate: string; exercises: BuilderExercise[] }) => {
    const user = getUserInfo()
    if (!user?.id) return
    setSaving(true)
    try {
      const payload = {
        traineeId: user.id,
        coachId: user.id,
        name: data.name,
        description: data.description,
        scheduledDate: data.scheduledDate,
        exercises: data.exercises.map((ex, i) => ({
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          targetWeight: ex.weight,
          weightUnit: "kg",
          restTime: 60,
          notes: ex.notes,
          exerciseOrder: i,
          track_rpe: 0,
          track_rir: 0,
          is_cardio: ex.isCardio ? 1 : 0,
        })),
      }
      await apiFetch("/workout-plans", { method: "POST", body: JSON.stringify(payload) })
      setBuilderOpen(false)
      fetchWorkouts()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to create workout")
    } finally {
      setSaving(false)
    }
  }

  // ── Filtering ─────────────────────────────────────────────────────────

  const filtered = workouts
    .filter((w) => statusFilter === "all" || w.status === statusFilter)
    .filter((w) => !filterDate || w.scheduledDate.toDateString() === filterDate.toDateString())

  const grouped = groupByDate(filtered)

  const total = workouts.length
  const completed = workouts.filter((w) => w.status === "completed").length
  const assigned = workouts.filter((w) => w.status === "assigned").length
  const pending = workouts.filter((w) => w.status === "pending").length

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total" value={total} icon={<ClipboardList className="h-5 w-5" />} color="#00ffff" active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
        <StatCard label="Completed" value={completed} icon={<CheckCircle2 className="h-5 w-5" />} color="#00ff88" active={statusFilter === "completed"} onClick={() => setStatusFilter("completed")} />
        <StatCard label="Assigned" value={assigned} icon={<Users className="h-5 w-5" />} color="#ffd700" active={statusFilter === "assigned"} onClick={() => setStatusFilter("assigned")} />
        <StatCard label="Pending" value={pending} icon={<Clock className="h-5 w-5" />} color="#888888" active={statusFilter === "pending"} onClick={() => setStatusFilter("pending")} />
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status pill tabs */}
          <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-[#161b22] p-1">
            {(["all", "completed", "assigned", "pending"] as const).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} className={cn("rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all", statusFilter === s ? "bg-[#0a0a0f] text-white shadow" : "text-[#555555] hover:text-[#888888]")}>{s}</button>
            ))}
          </div>

          <div className="flex items-center rounded-lg border border-white/[0.08] bg-[#161b22] p-1">
            <button onClick={() => setViewMode("list")} className={cn("rounded-md p-1.5 transition-colors", viewMode === "list" ? "bg-[#1c222b] text-white" : "text-[#555555] hover:text-white")} title="List View">
              <LayoutList className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode("calendar")} className={cn("rounded-md p-1.5 transition-colors", viewMode === "calendar" ? "bg-[#1c222b] text-white" : "text-[#555555] hover:text-white")} title="Calendar View">
              <CalendarDays className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={fetchWorkouts} disabled={loading} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#161b22] text-[#888888] hover:text-white disabled:opacity-50">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>

          <Popover open={dateFilterOpen} onOpenChange={setDateFilterOpen}>
            <PopoverTrigger asChild>
              <button className={cn("flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors", filterDate ? "border-[#00ffff]/50 bg-[#00ffff]/10 text-[#00ffff]" : "border-white/[0.15] bg-[#161b22] text-white hover:bg-[#1c2128]")}>
                <Calendar className="h-4 w-4" />
                {filterDate ? format(filterDate, "MMM d") : "Filter by Date"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto border-white/[0.08] bg-[#161b22] p-0" align="end">
              <CalendarPicker mode="single" selected={filterDate} onSelect={(d) => { setFilterDate(d); setDateFilterOpen(false) }} className="text-white" />
              {filterDate && (
                <div className="border-t border-white/[0.08] p-2">
                  <button onClick={() => { setFilterDate(undefined); setDateFilterOpen(false) }} className="w-full rounded-lg py-2 text-sm text-[#ff4444] hover:bg-[#ff4444]/10">Clear Filter</button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          <button onClick={() => setBuilderOpen(true)} className="flex items-center gap-2 rounded-xl bg-[#00ffff] px-4 py-2.5 font-medium text-black hover:bg-[#00e5e5]">
            <Plus className="h-4 w-4" /> Create Workout
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#00ffff]" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[#ff4444]/20 bg-[#ff4444]/5 py-14">
          <AlertCircle className="mb-3 h-8 w-8 text-[#ff4444]" />
          <p className="text-sm font-medium text-[#ff4444]">{error}</p>
          <button onClick={fetchWorkouts} className="mt-4 flex items-center gap-2 rounded-xl border border-[#ff4444]/30 px-4 py-2 text-sm text-[#ff4444] hover:bg-[#ff4444]/10">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      ) : filtered.length === 0 && viewMode === "list" ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-[#161b22] py-16">
          <Dumbbell className="mb-3 h-10 w-10 text-[#333]" />
          <p className="text-lg font-medium text-[#888888]">{workouts.length === 0 ? "No workouts yet" : `No ${statusFilter === "all" ? "" : statusFilter} workouts`}</p>
          {workouts.length === 0 && (
            <button onClick={() => setBuilderOpen(true)} className="mt-6 flex items-center gap-2 rounded-xl bg-[#00ffff] px-6 py-2.5 font-medium text-black hover:bg-[#00e5e5]">
              <Plus className="h-4 w-4" /> Create Workout
            </button>
          )}
        </div>
      ) : viewMode === "calendar" ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-6 space-y-6">
          {/* Calendar Header / Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => navigateWeek(-1)} className="rounded-lg border border-white/[0.08] bg-[#0a0a0f] p-2 text-[#888888] hover:text-white hover:bg-white/[0.02]"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => navigateWeek(1)} className="rounded-lg border border-white/[0.08] bg-[#0a0a0f] p-2 text-[#888888] hover:text-white hover:bg-white/[0.02]"><ChevronRight className="h-4 w-4" /></button>
              <button onClick={() => setCalendarDate(new Date())} className="ml-2 rounded-lg text-xs font-semibold text-[#888888] hover:text-white px-2 py-1">Today</button>
            </div>
            <span className="text-sm font-bold text-white uppercase tracking-wider">
              {calendarDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {calendarDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>

          {/* 7-Day Grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((d, i) => {
              const isSelected = d.toDateString() === calendarDate.toDateString()
              const isDayToday = isToday(d)
              
              // Find workouts for this specific day
              const dayWorkouts = filtered.filter(w => {
                const dateStr = w.scheduledDate ? w.scheduledDate.toISOString().split("T")[0] : ""
                if (!dateStr) return false
                const wd = new Date(dateStr + "T12:00:00")
                return wd.getDate() === d.getDate() && wd.getMonth() === d.getMonth() && wd.getFullYear() === d.getFullYear()
              })

              return (
                <div key={i} className="flex flex-col gap-2">
                  <button onClick={() => setCalendarDate(d)} className={cn("flex flex-col items-center rounded-xl border py-2 transition-colors",
                    isSelected ? "border-[#00ffff]/40 bg-[#00ffff]/10" : "border-white/[0.08] bg-[#0a0a0f] hover:border-white/[0.15]",
                    isDayToday && !isSelected && "border-[#a78bfa]/30"
                  )}>
                    <span className={cn("text-[10px] font-bold uppercase", isSelected ? "text-[#00ffff]" : isDayToday ? "text-[#a78bfa]" : "text-[#555555]")}>
                      {d.toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                    <span className={cn("text-lg font-bold", isSelected ? "text-white" : isDayToday ? "text-[#a78bfa]" : "text-white")}>
                      {d.getDate()}
                    </span>
                    <div className="mt-1 flex h-1.5 w-1.5 gap-0.5">
                      {dayWorkouts.slice(0, 3).map((_, wi) => <div key={wi} className="h-1.5 w-1.5 rounded-full bg-[#00ffff]"></div>)}
                    </div>
                  </button>
                </div>
              )
            })}
          </div>

          {/* Selected Day Workouts List */}
          <div className="mt-4 border-t border-white/[0.08] pt-6">
            {(() => {
              const selectedWorkouts = filtered.filter(w => {
                const dateStr = w.scheduledDate ? w.scheduledDate.toISOString().split("T")[0] : ""
                if (!dateStr) return false
                const wd = new Date(dateStr + "T12:00:00")
                return wd.getDate() === calendarDate.getDate() && wd.getMonth() === calendarDate.getMonth() && wd.getFullYear() === calendarDate.getFullYear()
              })

              if (selectedWorkouts.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <span className="text-sm font-medium text-white">{calendarDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</span>
                    <p className="mt-1 text-xs text-[#555555]">No workouts</p>
                  </div>
                )
              }

              return (
                <div className="space-y-3">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#555555]">
                    {isToday(calendarDate) ? "Today" : calendarDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                  </p>
                  {selectedWorkouts.map((workout) => (
                    <WorkoutCard key={workout.id} workout={workout} onClick={() => setDetailWorkout(workout)} onDelete={handleDelete} onAssign={handleAssign} isExpired={isExpired} />
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ label, items }) => (
            <div key={label}>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#555555]">{label}</h3>
              <div className="space-y-3">
                {items.map((workout) => (
                  <WorkoutCard key={workout.id} workout={workout} onClick={() => setDetailWorkout(workout)} onDelete={handleDelete} onAssign={handleAssign} isExpired={isExpired} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Panels / Modals */}
      <WorkoutDetailSheet workout={detailWorkout} open={!!detailWorkout} onOpenChange={(v) => { if (!v) setDetailWorkout(null) }} />
      <WorkoutBuilderSheet open={builderOpen} onOpenChange={setBuilderOpen} onSave={handleCreate} saving={saving} />
      <AssignWorkoutModal open={assignModalOpen} onOpenChange={(v) => { setAssignModalOpen(v); if (!v) setAssigningWorkoutId(null) }} preselectedTemplateId={assigningWorkoutId ?? undefined} />
    </div>
  )
}
