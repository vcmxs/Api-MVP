"use client"

import { useState, useEffect } from "react"
import {
  ArrowLeft, BarChart3, Apple, MessageCircle, CreditCard, Plus,
  ChevronDown, ChevronUp, Dumbbell, Calendar, Mail, Phone,
  Building, User, Loader2, X, ChevronRight, ChevronLeft,
  LayoutList, CalendarDays, Zap,
} from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { AssignWorkoutModal } from "./assign-workout-modal"
import { ManageSubscriptionModal } from "./manage-subscription-modal"
import { apiFetch, getUserInfo } from "@/lib/api"
import { useT } from "@/lib/i18n"
import { cn, getLocalISOString } from "@/lib/utils"
import type { ApiTrainee } from "./trainees-view"

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
  // Cardio
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
  exerciseOrder?: number
  is_cardio?: boolean
  isCardio?: boolean
  track_rpe?: boolean
  trackRpe?: boolean
  track_rir?: boolean
  trackRir?: boolean
  logs?: ApiSetLog[]
}

interface ApiWorkout {
  id: number
  name: string
  description?: string
  scheduledDate: string
  status: "pending" | "assigned" | "completed"
  exercises?: ApiExercise[]
  coach_id?: number
  coachId?: number
}

interface ApiNote {
  id: number
  exercise_name?: string
  exerciseName?: string
  note: string
  created_at?: string
  createdAt?: string
  workout_name?: string
  workoutName?: string
}

interface ApiProfile {
  id: number
  name: string
  email: string
  phone?: string
  gym?: string
  age?: number
  sex?: string
  height?: number
  weight?: number
  notes?: string
  subscriptionTier?: string
  subscriptionStatus?: string
  subscriptionExpiry?: string
  subscription_status?: string
  subscription_tier?: string
  subscription_end_date?: string
  coach_subscription_status?: string
  coach_subscription_end_date?: string
  status?: string
}

// ── Date grouping ─────────────────────────────────────────────────────────

function dayStart(d: Date) { const c = new Date(d); c.setHours(0, 0, 0, 0); return c }

function getDateGroup(date: Date): { label: string; sortKey: number } {
  const today = dayStart(new Date())
  const d = dayStart(date)
  const diffDays = Math.round((today.getTime() - d.getTime()) / 86400000)
  if (diffDays < -1) return { label: date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }), sortKey: diffDays }
  if (diffDays === -1) return { label: "__tomorrow__", sortKey: -1 }
  if (diffDays === 0) return { label: "__today__", sortKey: 0 }
  if (diffDays === 1) return { label: "__yesterday__", sortKey: 1 }
  if (diffDays < 7) return { label: date.toLocaleDateString("en-US", { weekday: "long" }), sortKey: diffDays }
  return { label: date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" }), sortKey: diffDays }
}

function groupWorkoutsByDate(workouts: ApiWorkout[]): { label: string; sortKey: number; items: ApiWorkout[] }[] {
  const map = new Map<string, { label: string; sortKey: number; items: ApiWorkout[] }>()
  workouts.forEach((w) => {
    const dateStr = w.scheduledDate ? w.scheduledDate.split("T")[0] : ""
    const date = dateStr ? new Date(dateStr + "T12:00:00") : new Date(0)
    const { label, sortKey } = getDateGroup(date)
    if (!map.has(label)) map.set(label, { label, sortKey, items: [] })
    map.get(label)!.items.push(w)
  })
  return Array.from(map.values()).sort((a, b) => a.sortKey - b.sortKey)
}

// ── Constants ─────────────────────────────────────────────────────────────

const tierColors: Record<string, string> = {
  BRONZE: "#cd7f32",
  SILVER: "#c0c0c0",
  GOLD: "#ffd700",
  PLATINUM: "#e5e4e2",
  starter: "#888888",
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  gold: "#ffd700",
  olympian: "#85a9f7",
}

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "completed": return { bg: "rgba(0,255,136,0.15)", text: "#00ff88" }
    case "assigned": return { bg: "rgba(255,215,0,0.15)", text: "#ffd700" }
    default: return { bg: "rgba(255,255,255,0.08)", text: "#888888" }
  }
}

const getSubscriptionStatusColor = (status?: string) => {
  switch (status?.toLowerCase()) {
    case "active": return { bg: "rgba(0,255,136,0.15)", text: "#00ff88" }
    case "inactive":
    case "blocked": return { bg: "rgba(255,68,68,0.15)", text: "#ff4444" }
    case "expiring": return { bg: "rgba(255,215,0,0.15)", text: "#ffd700" }
    default: return { bg: "rgba(255,255,255,0.08)", text: "#888888" }
  }
}

// ── Props ─────────────────────────────────────────────────────────────────

interface TraineeDetailProps {
  trainee: ApiTrainee
  onBack: () => void
  onOpenProgression?: (trainee: { id: number; name: string }) => void
  onOpenMessages?: (traineeId: number) => void
  onOpenNutrition?: (trainee: { id: number; name: string }) => void
}

export function TraineeDetail({ trainee, onBack, onOpenProgression, onOpenMessages, onOpenNutrition }: TraineeDetailProps) {
  const { t } = useT()
  const [profile, setProfile] = useState<ApiProfile | null>(null)
  const [workouts, setWorkouts] = useState<ApiWorkout[]>([])
  const [notes, setNotes] = useState<ApiNote[]>([])
  const [workoutsLoading, setWorkoutsLoading] = useState(false)
  const [notesExpanded, setNotesExpanded] = useState(false)
  const [showAllTraineeNotes, setShowAllTraineeNotes] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [showSubModal, setShowSubModal] = useState(false)
  const [detailWorkout, setDetailWorkout] = useState<ApiWorkout | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [lastLogsMap, setLastLogsMap] = useState<Record<string, Record<number, string>>>({})
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar")
  const [calendarDate, setCalendarDate] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })

  useEffect(() => {
    // Fetch full profile
    apiFetch<ApiProfile>(`/users/${trainee.id}/profile`)
      .then((data) => setProfile(data))
      .catch(() => setProfile(null))

    // Fetch workouts
    setWorkoutsLoading(true)
    apiFetch<{ workoutPlans: ApiWorkout[] }>(`/trainees/${trainee.id}/workout-plans`)
      .then((data) => setWorkouts(data.workoutPlans ?? []))
      .catch(() => setWorkouts([]))
      .finally(() => setWorkoutsLoading(false))

    // Fetch notes
    apiFetch<ApiNote[]>(`/users/${trainee.id}/notes`)
      .then((data) => setNotes(Array.isArray(data) ? data : []))
      .catch(() => setNotes([]))
  }, [trainee.id])

  // Fetch previous-session history for each exercise whenever the detail workout changes
  useEffect(() => {
    if (!detailWorkout?.exercises?.length) { setLastLogsMap({}); return }
    const workoutDate = detailWorkout.scheduledDate
      ? detailWorkout.scheduledDate.split("T")[0]
      : getLocalISOString()
    const map: Record<string, Record<number, string>> = {}
    let pending = detailWorkout.exercises.length
    for (const ex of detailWorkout.exercises) {
      if (!ex.name) { pending--; continue }
      apiFetch<{ progression?: { date?: string; completed_at?: string; setNumber?: number; set_number?: number; weight?: number; weight_used?: number; weightUsed?: number; reps?: number; reps_completed?: number; repsCompleted?: number; weightUnit?: string; weight_unit?: string }[] }>(
        `/workout-plans/users/${trainee.id}/progression?exercise=${encodeURIComponent(ex.name)}`
      ).then(d => {
        const rawLogs = d.progression ?? []
        const byDate: Record<string, typeof rawLogs> = {}
        for (const l of rawLogs) {
          const date = (l.date || l.completed_at || "").split("T")[0] || "unknown"
          ;(byDate[date] ??= []).push(l)
        }
        const targetDate = Object.keys(byDate).sort((a, b) => b.localeCompare(a)).find(d => d < workoutDate)
        if (targetDate) {
          const setMap: Record<number, string> = {}
          for (const l of byDate[targetDate]) {
            const setNum = l.setNumber ?? l.set_number
            const w = l.weight ?? l.weightUsed ?? l.weight_used
            const r = l.reps ?? l.repsCompleted ?? l.reps_completed
            const unit = l.weightUnit ?? l.weight_unit ?? "kg"
            if (setNum != null && w != null && r != null) setMap[setNum] = `${w}${unit}×${r}`
          }
          map[ex.name] = setMap
        }
      }).catch(() => {}).finally(() => {
        pending--
        if (pending === 0) setLastLogsMap({ ...map })
      })
    }
  }, [detailWorkout?.id, trainee.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const openDetail = async (workout: ApiWorkout) => {
    // Always fetch the full workout — the list endpoint returns exercises without logs
    setDetailLoading(true)
    setDetailWorkout(workout) // open sheet immediately with basic data
    try {
      const full = await apiFetch<ApiWorkout>(`/workout-plans/${workout.id}`)
      setDetailWorkout(full)
    } catch {
      // keep the basic workout data already set
    } finally {
      setDetailLoading(false)
    }
  }

  // Merge: use profile data if available, fall back to list data
  const display = {
    name: profile?.name ?? trainee.name,
    email: profile?.email ?? trainee.email,
    phone: profile?.phone ?? trainee.phone,
    gym: profile?.gym ?? trainee.gym,
    age: profile?.age ?? trainee.age,
    sex: profile?.sex,
    height: profile?.height,
    weight: profile?.weight,
    notes: profile?.notes,
    subscriptionTier: profile?.subscription_tier ?? profile?.subscriptionTier ?? trainee.subscriptionTier,
    subscriptionStatus: profile?.coach_subscription_status ?? profile?.subscription_status ?? profile?.subscriptionStatus ?? trainee.coach_subscription_status ?? trainee.subscriptionStatus ?? trainee.status,
    subscriptionExpiry: profile?.coach_subscription_end_date ?? profile?.subscription_end_date ?? profile?.subscriptionExpiry ?? trainee.coach_subscription_end_date ?? trainee.subscriptionExpiry,
  }

  const tier = display.subscriptionTier?.toUpperCase() ?? ""
  const tierColor = tierColors[tier] ?? tierColors[display.subscriptionTier ?? ""] ?? "#888888"

  const calendarDays = (() => {
    const monday = new Date(calendarDate)
    const dow = monday.getDay()
    monday.setDate(monday.getDate() + (dow === 0 ? -6 : 1 - dow)) // Set to Monday
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

  // Merge notes from workouts
  const traineeNotes = (() => {
    const extracted: {
      workout: ApiWorkout;
      exercise: ApiExercise;
      workoutId: number;
      workoutName: string;
      workoutDate: string;
      exerciseId: number;
      exerciseName: string;
      noteArray: any[];
    }[] = []

    workouts.forEach(w => {
      if (!w.exercises) return
      w.exercises.forEach(ex => {
        if (ex.notes) {
          try {
            const parsed = JSON.parse(ex.notes)
            if (Array.isArray(parsed) && parsed.length > 0) {
              extracted.push({
                workout: w,
                exercise: ex,
                workoutId: w.id,
                workoutName: w.name,
                workoutDate: w.scheduledDate,
                exerciseId: ex.id,
                exerciseName: ex.name,
                noteArray: parsed
              })
            }
          } catch (e) {
            // fallback plain text
            extracted.push({
              workout: w,
              exercise: ex,
              workoutId: w.id,
              workoutName: w.name,
              workoutDate: w.scheduledDate,
              exerciseId: ex.id,
              exerciseName: ex.name,
              noteArray: [{ userName: "Coach", text: ex.notes, createdAt: new Date().toISOString() }]
            })
          }
        }
      })
    })
    
    // Sort by workout date descending
    extracted.sort((a, b) => new Date(b.workoutDate || 0).getTime() - new Date(a.workoutDate || 0).getTime())
    return extracted
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#161b22] text-[#888888] transition-colors hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-white">{display.name}</h1>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#00ffff]/30 to-[#00ff88]/30 text-lg font-bold text-[#00ffff]">
          {display.name.split(" ").map((n) => n[0]).join("")}
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-4">
            <ActionButton icon={<BarChart3 className="h-5 w-5" />} label={t.traineeDetail.progression} color="#00ffff" onClick={() => onOpenProgression?.({ id: trainee.id, name: trainee.name })} />
            <ActionButton icon={<Apple className="h-5 w-5" />} label={t.traineeDetail.nutrition} color="#00ff88" onClick={() => onOpenNutrition?.({ id: trainee.id, name: trainee.name })} />
            <ActionButton icon={<MessageCircle className="h-5 w-5" />} label={t.traineeDetail.message} color="#a78bfa" onClick={() => onOpenMessages?.(trainee.id)} />
            <ActionButton icon={<CreditCard className="h-5 w-5" />} label={t.traineeDetail.subscription} color="#ffd700" onClick={() => setShowSubModal(true)} />
          </div>

          {/* Assigned Workouts */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-6">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-bold text-white">{t.traineeDetail.assignedWorkouts}</h2>
                <div className="flex items-center rounded-lg border border-white/[0.08] bg-[#0a0a0f] p-1">
                  <button onClick={() => setViewMode("list")} className={cn("rounded-md p-1.5 transition-colors", viewMode === "list" ? "bg-[#1c222b] text-white" : "text-[#555555] hover:text-white")} title="List View">
                    <LayoutList className="h-4 w-4" />
                  </button>
                  <button onClick={() => setViewMode("calendar")} className={cn("rounded-md p-1.5 transition-colors", viewMode === "calendar" ? "bg-[#1c222b] text-white" : "text-[#555555] hover:text-white")} title="Calendar View">
                    <CalendarDays className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <button
                onClick={() => setAssignOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-[#00ffff] px-3 py-2 text-sm font-semibold text-black transition-all hover:bg-[#00ffff]/90"
              >
                <Plus className="h-4 w-4" />
                {t.traineeDetail.assignWorkout}
              </button>
            </div>

            {workoutsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-[#555555]" />
              </div>
            ) : workouts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Dumbbell className="mb-3 h-8 w-8 text-[#333]" />
                <p className="text-sm text-[#555555]">{t.traineeDetail.noWorkouts}</p>
              </div>
            ) : viewMode === "calendar" ? (
              <div className="space-y-6">
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
                    const dayWorkouts = workouts.filter(w => {
                      const dateStr = w.scheduledDate ? w.scheduledDate.split("T")[0] : ""
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
                    const selectedWorkouts = workouts.filter(w => {
                      const dateStr = w.scheduledDate ? w.scheduledDate.split("T")[0] : ""
                      if (!dateStr) return false
                      const wd = new Date(dateStr + "T12:00:00")
                      return wd.getDate() === calendarDate.getDate() && wd.getMonth() === calendarDate.getMonth() && wd.getFullYear() === calendarDate.getFullYear()
                    })

                    if (selectedWorkouts.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                          <span className="text-sm font-medium text-white">{calendarDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</span>
                          <p className="mt-1 text-xs text-[#555555]">Rest Day</p>
                        </div>
                      )
                    }

                    return (
                      <div className="space-y-2">
                        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#555555]">
                          {isToday(calendarDate) ? "Today" : calendarDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                        </p>
                        {selectedWorkouts.map((workout) => {
                          const sc = getStatusColor(workout.status)
                          const isCoachAssigned = !!(workout.coach_id || workout.coachId)
                          const isCompleted = workout.status?.toLowerCase() === "completed"
                          return (
                            <button key={workout.id} onClick={() => openDetail(workout)}
                              className="flex w-full items-center justify-between rounded-xl border border-white/[0.08] bg-[#0a0a0f] p-4 text-left transition-all hover:border-white/[0.25] hover:bg-[#1c222b]"
                              style={isCoachAssigned && !isCompleted ? { borderLeftWidth: "4px", borderLeftColor: "#ffd700" } : undefined}>
                              <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#161b22]">
                                  <Dumbbell className="h-5 w-5 text-[#888888]" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-white">{workout.name}</h3>
                                  {workout.exercises && <p className="text-sm text-[#888888]">{workout.exercises.length} exercises</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide" style={{ backgroundColor: sc.bg, color: sc.text }}>
                                  {workout.status}
                                </div>
                                <ChevronRight className="h-4 w-4 text-[#555555]" />
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {groupWorkoutsByDate(workouts).map((group) => (
                  <div key={group.label}>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#555555]">
                      {group.label === "__today__" ? t.traineeDetail.today : group.label === "__yesterday__" ? t.traineeDetail.yesterday : group.label === "__tomorrow__" ? t.traineeDetail.tomorrow : group.label}
                    </p>
                    <div className="space-y-2">
                      {group.items.map((workout) => {
                        const sc = getStatusColor(workout.status)
                        const isCoachAssigned = !!(workout.coach_id || workout.coachId)
                        const isCompleted = workout.status?.toLowerCase() === "completed"
                        return (
                          <button
                            key={workout.id}
                            onClick={() => openDetail(workout)}
                            className="flex w-full items-center justify-between rounded-xl border border-white/[0.08] bg-[#0a0a0f] p-4 text-left transition-all hover:border-white/[0.25] hover:bg-[#1c222b]"
                            style={isCoachAssigned && !isCompleted ? { borderLeftWidth: "4px", borderLeftColor: "#ffd700" } : undefined}
                          >
                            <div className="flex items-center gap-4">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#161b22]">
                                <Dumbbell className="h-5 w-5 text-[#888888]" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-white">{workout.name}</h3>
                                {workout.exercises && (
                                  <p className="text-sm text-[#888888]">{workout.exercises.length} exercises</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div
                                className="rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
                                style={{ backgroundColor: sc.bg, color: sc.text }}
                              >
                                {workout.status}
                              </div>
                              <ChevronRight className="h-4 w-4 text-[#555555]" />
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Exercise Notes - Collapsible */}
          {notes.length > 0 && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] overflow-hidden">
              <button
                onClick={() => setNotesExpanded(!notesExpanded)}
                className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-[#1c222b]"
              >
                <h2 className="text-lg font-bold text-white">Exercise Notes ({notes.length})</h2>
                {notesExpanded ? <ChevronUp className="h-5 w-5 text-[#888888]" /> : <ChevronDown className="h-5 w-5 text-[#888888]" />}
              </button>

              {notesExpanded && (
                <div className="border-t border-white/[0.08] p-6 pt-0">
                  <div className="mt-4 space-y-3">
                    {notes.map((note) => (
                      <div key={note.id} className="rounded-xl border border-white/[0.08] bg-[#0a0a0f] p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-white">
                            {note.exercise_name ?? note.exerciseName ?? "Exercise"}
                          </h3>
                          <span className="text-xs text-[#555555]">
                            {new Date(note.created_at ?? note.createdAt ?? "").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-[#888888]">{note.note}</p>
                        {(note.workout_name ?? note.workoutName) && (
                          <p className="mt-2 text-xs text-[#555555]">{note.workout_name ?? note.workoutName}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column - Trainee Info */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-6">
            <h2 className="mb-4 text-lg font-bold text-white">{t.traineeDetail.traineeInfo}</h2>
            <div className="space-y-4">
              {display.gym && <InfoRow icon={<Building className="h-4 w-4" />} label={t.traineeDetail.gym} value={display.gym} />}
              <InfoRow icon={<Mail className="h-4 w-4" />} label={t.traineeDetail.email} value={display.email} />
              {display.phone && <InfoRow icon={<Phone className="h-4 w-4" />} label={t.traineeDetail.phone} value={display.phone} />}
              {display.age && <InfoRow icon={<User className="h-4 w-4" />} label={t.traineeDetail.age} value={`${display.age} ${t.traineeDetail.years}`} />}
              {display.sex && <InfoRow icon={<User className="h-4 w-4" />} label={t.traineeDetail.sex} value={display.sex.charAt(0).toUpperCase() + display.sex.slice(1)} />}
              {display.height != null && <InfoRow icon={<User className="h-4 w-4" />} label={t.traineeDetail.height} value={`${display.height} cm`} />}
              {display.weight != null && <InfoRow icon={<User className="h-4 w-4" />} label={t.traineeDetail.weight} value={`${display.weight} kg`} />}

              {display.notes && (
                <div className="border-t border-white/[0.06] pt-4">
                  <p className="mb-1.5 text-sm text-[#888888]">{t.traineeDetail.pathologies}</p>
                  <p className="text-sm leading-relaxed text-white">{display.notes}</p>
                </div>
              )}

              {display.subscriptionTier && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#888888]">{t.traineeDetail.tier}</span>
                  <span
                    className="rounded px-2 py-1 text-xs font-bold uppercase tracking-wider"
                    style={{ backgroundColor: `${tierColor}20`, color: tierColor }}
                  >
                    {display.subscriptionTier}
                  </span>
                </div>
              )}

              {display.subscriptionStatus && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#888888]">{t.traineeDetail.status}</span>
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-semibold uppercase"
                    style={{
                      backgroundColor: getSubscriptionStatusColor(display.subscriptionStatus).bg,
                      color: getSubscriptionStatusColor(display.subscriptionStatus).text,
                    }}
                  >
                    {display.subscriptionStatus}
                  </span>
                </div>
              )}

              {display.subscriptionExpiry && (
                <div className="flex items-center justify-between border-t border-white/[0.08] pt-4">
                  <span className="text-sm text-[#888888]">{t.traineeDetail.expires}</span>
                  <span className="text-sm font-medium text-white">{display.subscriptionExpiry}</span>
                </div>
              )}
            </div>
          </div>

          {/* Grouped Exercise Notes */}
          {traineeNotes.length > 0 && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-6 mt-6">
              <h2 className="mb-4 text-lg font-bold text-white">Exercise Notes</h2>
              <div className="space-y-4">
                {(showAllTraineeNotes ? traineeNotes : traineeNotes.slice(0, 3)).map((group, groupIdx) => {
                  const targetWeight = group.exercise.target_weight ?? group.exercise.targetWeight;
                  return (
                  <div key={groupIdx} className="rounded-xl border border-white/[0.06] bg-[#0a0a0f] overflow-hidden">
                    <button 
                      onClick={() => openDetail(group.workout)}
                      className="w-full text-left bg-[#1c222b] px-4 py-3 border-b border-white/[0.06] transition-colors hover:bg-[#252d3a] flex flex-col"
                    >
                      <div className="flex w-full items-center justify-between">
                        <h3 className="font-bold text-white text-sm">{group.exerciseName}</h3>
                        <ChevronRight className="h-4 w-4 text-[#555555]" />
                      </div>
                      <p className="text-xs text-[#888888] mb-1.5">{group.workoutName} • {group.workoutDate ? new Date(group.workoutDate.split("T")[0] + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}</p>
                      
                      <p className="text-[10px] font-semibold text-[#00ffff]">
                        {group.exercise.sets} {t.traineeDetail?.sets || "sets"} × {group.exercise.reps} {t.traineeDetail?.reps || "reps"}
                        {targetWeight != null && targetWeight > 0 && ` @ ${targetWeight}${group.exercise.weight_unit ?? "kg"}`}
                        {group.exercise.track_rpe || group.exercise.trackRpe ? " @ RPE" : ""}
                        {group.exercise.track_rir || group.exercise.trackRir ? " @ RIR" : ""}
                      </p>
                    </button>
                    <div className="p-3 flex flex-col gap-2 max-h-[250px] overflow-y-auto custom-scrollbar">
                      {group.noteArray.map((n, idx) => (
                        <div key={idx} className="flex flex-col rounded bg-white/[0.03] p-2">
                          <span className="text-[10px] font-bold" style={{ color: n.userName !== "Coach" ? "#a78bfa" : "#ffd700" }}>{n.userName}</span>
                          <span className="mt-1 text-xs text-[#aaa]">{n.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )})}
                {traineeNotes.length > 3 && (
                  <button 
                    onClick={() => setShowAllTraineeNotes(!showAllTraineeNotes)}
                    className="w-full mt-2 text-xs font-bold text-[#888888] hover:text-white py-2.5 text-center border border-white/[0.08] rounded-xl transition-colors bg-[#0a0a0f] hover:bg-[#1c222b]"
                  >
                    {showAllTraineeNotes ? "Show Less" : `View All ${traineeNotes.length} Notes`}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showSubModal && (
        <ManageSubscriptionModal
          trainee={{
            id: trainee.id,
            name: trainee.name,
            coachSubscriptionEndDate: display.subscriptionExpiry,
            coachSubscriptionStatus: display.subscriptionStatus,
          }}
          onClose={() => setShowSubModal(false)}
        />
      )}

      <AssignWorkoutModal
        open={assignOpen}
        onOpenChange={setAssignOpen}
        preselectedTraineeId={trainee.id}
        onAssigned={() => {
          setAssignOpen(false)
          apiFetch<{ workoutPlans: ApiWorkout[] }>(`/trainees/${trainee.id}/workout-plans`)
            .then((data) => setWorkouts(data.workoutPlans ?? []))
            .catch(() => {})
        }}
      />

      {/* Workout Detail Sheet */}
      <Sheet open={detailWorkout !== null} onOpenChange={(v) => { if (!v) setDetailWorkout(null) }}>
        <SheetContent side="right" className="flex w-full flex-col border-l border-white/[0.08] bg-[#0a0a0f] p-0 sm:max-w-md">
          <SheetHeader className="flex-row items-center justify-between border-b border-white/[0.08] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00ffff]/10">
                <Dumbbell className="h-5 w-5 text-[#00ffff]" />
              </div>
              <SheetTitle className="text-lg font-bold text-white">{detailWorkout?.name ?? ""}</SheetTitle>
            </div>
            <button
              onClick={() => setDetailWorkout(null)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-[#888888] transition-colors hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6">
            {/* Workout meta */}
            {detailWorkout && (
              <div className="mb-6 flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-[#888888]">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {detailWorkout.scheduledDate
                      ? new Date(detailWorkout.scheduledDate.split("T")[0] + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                      : "—"}
                  </span>
                </div>
                <div
                  className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                  style={{ backgroundColor: getStatusColor(detailWorkout.status).bg, color: getStatusColor(detailWorkout.status).text }}
                >
                  {detailWorkout.status}
                </div>
              </div>
            )}

            {/* Exercises */}
            {detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[#555555]" />
              </div>
            ) : !detailWorkout?.exercises || detailWorkout.exercises.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Dumbbell className="mb-3 h-8 w-8 text-[#333]" />
                <p className="text-sm text-[#555555]">No exercises found</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[#555555]">
                  {detailWorkout.exercises.length} Exercise{detailWorkout.exercises.length !== 1 ? "s" : ""}
                </p>
                {(() => {
                  const sortedEx = detailWorkout.exercises.slice().sort((a, b) => (a.exerciseOrder ?? 0) - (b.exerciseOrder ?? 0))
                  const grouped: Array<{ type: "single", exercise: any } | { type: "superset", exercises: any[] }> = []
                  for (let i = 0; i < sortedEx.length; i++) {
                    const ex = sortedEx[i]
                    if (ex.rest_time === -1 || ex.restTime === -1) {
                      const prev = grouped[grouped.length - 1]
                      if (prev) {
                        if (prev.type === "single") grouped[grouped.length - 1] = { type: "superset", exercises: [prev.exercise, ex] }
                        else prev.exercises.push(ex)
                      } else {
                        grouped.push({ type: "single", exercise: ex })
                      }
                    } else {
                      grouped.push({ type: "single", exercise: ex })
                    }
                  }

                  const renderSingle = (ex: any, idx: number | string) => {
                    const targetWeight = ex.target_weight ?? ex.targetWeight
                    const isCardio = !!(ex.is_cardio || ex.isCardio)
                    const showRpe = !!(ex.track_rpe || ex.trackRpe)
                    const showRir = !!(ex.track_rir || ex.trackRir)
                    const logs = (ex.logs ?? []).slice().sort((a: any, b: any) => (a.set_number ?? a.setNumber ?? 0) - (b.set_number ?? b.setNumber ?? 0))
                    const hasLogs = logs.length > 0
                    const completedLogs = logs.filter((l: any) => l.completed || l.is_completed)

                    return (
                      <div key={ex.id} className="rounded-xl border border-white/[0.08] bg-[#161b22] overflow-hidden">
                        {/* Exercise header */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#00ffff]/10 text-xs font-bold text-[#00ffff]">
                            {idx}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white truncate">{ex.name}</p>
                            <p className="text-xs text-[#555555]">
                              {t.workouts?.target || "Target:"} {ex.sets} {t.traineeDetail?.sets || "sets"} × {ex.reps} {t.traineeDetail?.reps || "reps"}
                              {targetWeight != null && targetWeight > 0 && ` @ ${targetWeight}${ex.weight_unit ?? "kg"}`}
                            </p>
                          </div>
                          {hasLogs && (
                            <span className="shrink-0 text-xs font-semibold" style={{ color: completedLogs.length === logs.length ? "#00ff88" : "#ffd700" }}>
                              {completedLogs.length}/{logs.length} done
                            </span>
                          )}
                        </div>

                        {/* Sets table */}
                        {hasLogs ? (
                          <div className="p-3">
                            {/* Table header */}
                            <div className={`grid text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-2 px-1 ${isCardio ? "grid-cols-4" : showRpe || showRir ? "grid-cols-6" : "grid-cols-5"}`}>
                              <span>{t.workouts?.setColumn || "Set"}</span>
                              {isCardio ? (
                                <>
                                  <span className="text-center">Time</span>
                                  <span className="text-center">Dist</span>
                                  <span className="text-center">kcal</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-center">{t.workouts?.lastColumn || "Last"}</span>
                                  <span className="text-center">{t.workouts?.weightColumn || "Weight"}</span>
                                  <span className="text-center">{t.workouts?.repsColumn || "Reps"}</span>
                                  {showRpe && <span className="text-center">RPE</span>}
                                  {showRir && <span className="text-center">RIR</span>}
                                  {!showRpe && !showRir && <span className="text-center">Status</span>}
                                </>
                              )}
                            </div>

                            {/* Set rows */}
                            <div className="space-y-1">
                              {logs.map((log: any) => {
                                const setNum = log.set_number ?? log.setNumber ?? "—"
                                const isDone = !!(log.completed || log.is_completed)
                                const weight = log.weight_used ?? log.weightUsed
                                const reps = log.reps_completed ?? log.repsCompleted

                                const lastVal = lastLogsMap[ex.name]?.[log.set_number ?? log.setNumber ?? 0]
                                return (
                                  <div
                                    key={log.id}
                                    className={`grid items-center rounded-lg px-3 py-2 text-sm ${isCardio ? "grid-cols-4" : showRpe || showRir ? "grid-cols-6" : "grid-cols-5"}`}
                                    style={{ backgroundColor: isDone ? "rgba(0,255,136,0.06)" : "rgba(255,255,255,0.03)" }}
                                  >
                                    <span className="font-bold" style={{ color: isDone ? "#00ff88" : "#888888" }}>
                                      {setNum}
                                    </span>

                                    {isCardio ? (
                                      <>
                                        <span className="text-center text-white">
                                          {log.duration != null ? `${(log.duration / 60).toFixed(1)}m` : "—"}
                                        </span>
                                        <span className="text-center text-white">
                                          {log.distance != null ? `${log.distance}km` : "—"}
                                        </span>
                                        <span className="text-center text-white">
                                          {log.calories != null ? `${log.calories}` : "—"}
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="text-center text-[10px] font-bold" style={{ color: lastVal ? "#00ffff" : "#444444" }}>
                                          {lastVal ?? "—"}
                                        </span>
                                        <span className="text-center font-medium text-white">
                                          {weight != null ? `${weight}${ex.weight_unit ?? "kg"}` : "—"}
                                        </span>
                                        <span className="text-center font-medium text-white">
                                          {reps != null ? `${reps}` : "—"}
                                        </span>
                                        {showRpe && (
                                          <span className="text-center text-[#888888]">
                                            {log.rpe != null ? log.rpe : "—"}
                                          </span>
                                        )}
                                        {showRir && (
                                          <span className="text-center text-[#888888]">
                                            {log.rir != null ? log.rir : "—"}
                                          </span>
                                        )}
                                        {!showRpe && !showRir && (
                                          <span className="text-center text-xs font-semibold" style={{ color: isDone ? "#00ff88" : "#555555" }}>
                                            {isDone ? "✓" : "—"}
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ) : (
                          <p className="px-4 py-3 text-xs text-[#555555]">{t.traineeDetail.noSets}</p>
                        )}

                        {/* Exercise note */}
                        {ex.notes && (
                          <div className="mx-3 mb-3 flex flex-col gap-2 rounded-lg border border-white/5 bg-[#161b22] px-3 py-2">
                            {(() => {
                              try {
                                const parsed = JSON.parse(ex.notes)
                                if (Array.isArray(parsed)) {
                                  return parsed.map((n: any, idx2: number) => (
                                    <div key={idx2} className="flex flex-col rounded bg-white/[0.03] p-2">
                                      <span className="text-[10px] font-bold" style={{ color: n.userName !== "Coach" ? "#a78bfa" : "#ffd700" }}>{n.userName}</span>
                                      <span className="mt-1 text-xs text-[#aaa]">{n.text}</span>
                                    </div>
                                  ))
                                }
                              } catch (e) {}
                              // Fallback for old plain text
                              return (
                                <div className="flex flex-col rounded bg-yellow-500/5 border border-yellow-500/20 p-2">
                                  <span className="text-[10px] font-bold text-[#ffd700]">Coach</span>
                                  <span className="mt-1 text-xs text-[#aaa]">{ex.notes}</span>
                                </div>
                              )
                            })()}
                          </div>
                        )}
                      </div>
                    )
                  }

                  return grouped.map((group, idx) => {
                    if (group.type === "single") {
                      return renderSingle(group.exercise, idx + 1)
                    }

                    // Render Superset
                    let maxSets = 0
                    let totalCompleted = 0
                    let totalRows = 0
                    for (const ex of group.exercises) {
                      const logs = ex.logs ?? []
                      const rowCount = Math.max(ex.sets ?? 1, logs.length)
                      if (rowCount > maxSets) maxSets = rowCount
                      totalRows += rowCount
                      totalCompleted += logs.filter((l: any) => l.completed || l.is_completed).length
                    }

                    return (
                      <div key={group.exercises.map(e => e.id).join("-")} className="rounded-xl border border-[#00ffff]/20 bg-[#161b22] overflow-hidden">
                        <div className="bg-gradient-to-r from-[#00ffff]/10 to-transparent px-4 py-2 flex items-center justify-between border-b border-[#00ffff]/10">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-[#00ffff]" />
                            <span className="text-xs font-bold uppercase tracking-wider text-[#00ffff]">Bi-Serie</span>
                          </div>
                          <span className="shrink-0 text-xs font-semibold" style={{ color: totalCompleted === totalRows && totalRows > 0 ? "#00ff88" : totalCompleted > 0 ? "#ffd700" : "#555555" }}>
                            {totalCompleted}/{totalRows} done
                          </span>
                        </div>

                        <div className="p-3 space-y-4">
                          {Array.from({ length: maxSets }, (_, i) => i + 1).map(setNum => (
                            <div key={setNum} className="rounded-xl border border-white/[0.05] bg-black/20 p-3 relative">
                              <p className="text-[10px] font-bold text-[#888] mb-2 uppercase tracking-widest">Round {setNum}</p>
                              <div className="space-y-3 relative">
                                <div className="absolute left-[11px] top-[24px] bottom-[24px] w-[1px] bg-[#00ffff]/20" />
                                {group.exercises.map((ex) => {
                                  const logs = ex.logs ?? []
                                  const log = logs.find((l: any) => (l.set_number ?? l.setNumber) === setNum)
                                  const isCardio = !!(ex.is_cardio || ex.isCardio)
                                  const showRpe = !!(ex.track_rpe || ex.trackRpe)
                                  const showRir = !!(ex.track_rir || ex.trackRir)
                                  
                                  const isDone = log ? !!(log.completed || log.is_completed) : false
                                  const weight = log?.weight_used ?? log?.weightUsed
                                  const reps = log?.reps_completed ?? log?.repsCompleted
                                  const lastVal = lastLogsMap[ex.name]?.[setNum]

                                  return (
                                    <div key={ex.id} className="space-y-1.5 rounded-lg bg-black/10 p-2">
                                      <div className="flex flex-col gap-1 mb-2 px-1">
                                        <div className="flex items-center gap-2">
                                          <Dumbbell className="h-3 w-3 text-[#00ffff]" />
                                          <p className="text-xs font-semibold text-white">{ex.name}</p>
                                        </div>
                                        <p className="text-[10px] text-[#888888] ml-5">
                                          {t.workouts?.target || "Target:"} {ex.sets} {t.traineeDetail?.sets || "sets"} × {ex.reps} {t.traineeDetail?.reps || "reps"}
                                          {(ex.target_weight ?? ex.targetWeight) != null && (ex.target_weight ?? ex.targetWeight) > 0 && ` @ ${ex.target_weight ?? ex.targetWeight}${ex.weight_unit ?? "kg"}`}
                                        </p>
                                      </div>
                                      
                                      {!isCardio && (
                                        <div className="flex items-center gap-2 px-1 text-[9px] font-bold uppercase tracking-wider text-[#888888] mb-1">
                                          <span className="w-6 shrink-0">{t.workouts?.setColumn || "Set"}</span>
                                          <span className="w-16 shrink-0 text-center">{t.workouts?.lastColumn || "Last"}</span>
                                          <span className="w-20 shrink-0 text-center">{t.workouts?.weightColumn || "Weight"}</span>
                                          <span className="w-14 shrink-0 text-center">{t.workouts?.repsColumn || "Reps"}</span>
                                          {showRpe && <span className="w-10 shrink-0 text-center">RPE</span>}
                                          {showRir && <span className="w-10 shrink-0 text-center">RIR</span>}
                                        </div>
                                      )}

                                      {isCardio ? (
                                        <div className="grid grid-cols-4 items-center rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: isDone ? "rgba(0,255,136,0.06)" : "rgba(255,255,255,0.03)" }}>
                                          <span className="font-bold" style={{ color: isDone ? "#00ff88" : "#888888" }}>{setNum}</span>
                                          <span className="text-center text-white">{log?.duration != null ? `${(log.duration / 60).toFixed(1)}m` : "—"}</span>
                                          <span className="text-center text-white">{log?.distance != null ? `${log.distance}km` : "—"}</span>
                                          <span className="text-center text-white">{log?.calories != null ? `${log.calories}kcal` : "—"}</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm" style={{ backgroundColor: isDone ? "rgba(0,255,136,0.06)" : "rgba(255,255,255,0.03)" }}>
                                          <span className="w-6 shrink-0 font-bold" style={{ color: isDone ? "#00ff88" : "#888888" }}>{setNum}</span>
                                          <span className="w-16 shrink-0 text-center text-[10px] font-bold" style={{ color: lastVal ? "#00ffff" : "#444444" }}>{lastVal ?? "—"}</span>
                                          <span className="w-20 shrink-0 text-center font-medium text-white">{weight != null ? `${weight}${ex.weight_unit ?? "kg"}` : "—"}</span>
                                          <span className="w-14 shrink-0 text-center font-medium text-white">{reps != null ? `${reps}` : "—"}</span>
                                          {showRpe && <span className="w-10 shrink-0 text-center text-[#888888]">{log?.rpe != null ? log.rpe : "—"}</span>}
                                          {showRir && <span className="w-10 shrink-0 text-center text-[#888888]">{log?.rir != null ? log.rir : "—"}</span>}
                                          {!showRpe && !showRir && <span className="flex-1 text-right pr-2 text-xs font-semibold" style={{ color: isDone ? "#00ff88" : "#555555" }}>{isDone ? "✓" : "—"}</span>}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function ActionButton({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-[#161b22] p-6 transition-all hover:border-white/[0.15] hover:bg-[#1c222b]"
      style={{ boxShadow: `0 0 20px ${color}15` }}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}20`, color }}>
        {icon}
      </div>
      <span className="text-sm font-medium text-white">{label}</span>
    </button>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-[#888888]">
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-sm text-white">{value}</span>
    </div>
  )
}
