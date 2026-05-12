"use client"

import { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import {
  X, Search, Dumbbell, Users, CalendarDays, Check, Loader2,
  AlertCircle, Plus, ChevronRight, ArrowLeft,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { apiFetch, getUserInfo } from "@/lib/api"

// ── Types ──────────────────────────────────────────────────────────────────

interface ExistingWorkout {
  id: number
  name: string
  description?: string
  exercises?: { id: number; name: string; sets: number; reps: number; targetWeight?: number; weightUnit?: string; notes?: string; is_cardio?: boolean | number; track_rpe?: boolean | number; track_rir?: boolean | number }[]
}

interface ApiProgram {
  id: number
  name: string
  hex_color?: string
  workout_count?: number
}

interface ApiProgramWorkout {
  id: number
  name: string
  description?: string
  exercises?: { id: number; name: string; sets: number; reps: number; targetWeight?: number; target_weight?: number; weightUnit?: string; weight_unit?: string; notes?: string; is_cardio?: boolean | number; track_rpe?: boolean | number; track_rir?: boolean | number }[]
}

interface Trainee {
  id: number
  name: string
  email: string
  subscriptionTier?: string
}

interface BuilderExercise {
  id: string
  name: string
  sets: number
  reps: number
  weight: number
  notes: string
  isCardio: boolean
}

interface ExSuggestion {
  id: number
  name: string
  muscle_group?: string
  muscle_category?: string
  is_cardio?: boolean | number
}

// ── Exercise autocomplete hook ──────────────────────────────────────────────

function useExSuggestions(query: string) {
  const [suggestions, setSuggestions] = useState<ExSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return }
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await apiFetch<ExSuggestion[] | { exercises: ExSuggestion[] }>(`/exercises?search=${encodeURIComponent(query)}`)
        const list = Array.isArray(data) ? data : (data as { exercises: ExSuggestion[] }).exercises ?? []
        setSuggestions(list.slice(0, 6))
      } catch { setSuggestions([]) }
      finally { setLoading(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [query])
  return { suggestions, loading }
}

// ── Exercise picker panel (portal) ─────────────────────────────────────────

function isCardioEx(ex: ExSuggestion) {
  const cat = (ex.muscle_category ?? ex.muscle_group ?? "").toLowerCase()
  const name = (ex.name ?? "").toLowerCase()
  return !!(ex.is_cardio || cat.includes("cardio") || cat.includes("aerobic") ||
    name.includes("treadmill") || name.includes("cycling") || name.includes("running"))
}

function ExPickerPanel({ open, onClose, onSelect, onDone }: {
  open: boolean
  onClose: () => void
  onSelect: (ex: { name: string; isCardio: boolean }) => void
  onDone: () => void
}) {
  const [mode, setMode] = useState<"categories" | "exercises" | "search">("categories")
  const [categories, setCategories] = useState<string[]>([])
  const [catsLoading, setCatsLoading] = useState(false)
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [catExs, setCatExs] = useState<ExSuggestion[]>([])
  const [catLoading, setCatLoading] = useState(false)
  const [searchQ, setSearchQ] = useState("")
  const { suggestions: searchResults, loading: searchLoading } = useExSuggestions(searchQ)

  useEffect(() => {
    if (!open) return
    setMode("categories"); setSelectedCat(null); setSearchQ("")
    setCatsLoading(true)
    apiFetch<string[] | { categories: string[] }>("/exercises/categories")
      .then((d) => setCategories(Array.isArray(d) ? d : (d as { categories: string[] }).categories ?? []))
      .catch(() => setCategories([]))
      .finally(() => setCatsLoading(false))
  }, [open])

  const selectCat = async (cat: string) => {
    setSelectedCat(cat); setMode("exercises"); setCatLoading(true)
    try {
      const d = await apiFetch<ExSuggestion[] | { exercises: ExSuggestion[] }>(`/exercises?category=${encodeURIComponent(cat)}`)
      setCatExs(Array.isArray(d) ? d : (d as { exercises: ExSuggestion[] }).exercises ?? [])
    } catch { setCatExs([]) }
    finally { setCatLoading(false) }
  }

  const pick = (ex: ExSuggestion) => {
    onSelect({ name: ex.name, isCardio: isCardioEx(ex) })
    setMode("categories"); setSelectedCat(null); setSearchQ("")
  }

  if (typeof window === "undefined") return null
  return createPortal(
    <div
      className="fixed top-0 z-[220] flex h-screen w-64 flex-col border-r border-white/[0.08] bg-[#0f1117] shadow-2xl transition-transform duration-300 ease-in-out"
      style={{ right: "0rem", transform: open ? "translateX(0)" : "translateX(calc(100% + 1rem))", pointerEvents: open ? "auto" : "none" }}
    >
      <div className="flex h-16 items-center justify-between border-b border-white/[0.08] px-4">
        <div className="flex items-center gap-2">
          {mode === "exercises" ? (
            <button onClick={() => setMode("categories")} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] text-[#888888] hover:text-white">
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#00ffff]/10">
              <Dumbbell className="h-3.5 w-3.5 text-[#00ffff]" />
            </div>
          )}
          <span className="text-sm font-bold text-white">{mode === "search" ? "Search" : mode === "exercises" ? selectedCat : "Muscle Group"}</span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setMode(mode === "search" ? "categories" : "search")}
            className={cn("flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08]", mode === "search" ? "bg-[#00ffff]/10 text-[#00ffff]" : "text-[#888888] hover:text-white")}>
            <Search className="h-3.5 w-3.5" />
          </button>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] text-[#888888] hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {mode === "search" && (
        <div className="px-3 pt-3 pb-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#555555]" />
            <input autoFocus type="text" value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search exercises..." className="w-full rounded-xl border border-white/[0.08] bg-[#161b22] py-2 pl-9 pr-3 text-sm text-white placeholder:text-[#555555] focus:border-[#00ffff]/50 focus:outline-none" />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-1">
        {mode === "search" ? (
          searchLoading ? <div className="flex justify-center py-8"><Loader2 className="h-4 w-4 animate-spin text-[#555555]" /></div>
          : searchQ.length < 2 ? <p className="py-8 text-center text-xs text-[#555555]">Type to search…</p>
          : searchResults.length === 0 ? <p className="py-8 text-center text-xs text-[#555555]">No results</p>
          : searchResults.map((ex) => (
            <button key={ex.id} onClick={() => pick(ex)} className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-white/[0.04]">
              <Dumbbell className="h-3 w-3 shrink-0 text-[#555555]" />
              <span className="truncate text-sm text-white">{ex.name}</span>
            </button>
          ))
        ) : mode === "categories" ? (
          catsLoading ? <div className="flex justify-center py-8"><Loader2 className="h-4 w-4 animate-spin text-[#555555]" /></div>
          : categories.map((cat, i) => (
            <button key={i} onClick={() => selectCat(cat)} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-white/[0.04]">
              <span className="text-sm font-medium text-white">{cat}</span>
              <ChevronRight className="h-3.5 w-3.5 text-[#555555]" />
            </button>
          ))
        ) : catLoading ? <div className="flex justify-center py-8"><Loader2 className="h-4 w-4 animate-spin text-[#555555]" /></div>
        : catExs.map((ex) => (
          <button key={ex.id} onClick={() => pick(ex)} className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-white/[0.04]">
            <Dumbbell className="h-3 w-3 shrink-0 text-[#555555]" />
            <span className="truncate text-sm text-white">{ex.name}</span>
          </button>
        ))}
      </div>

      <div className="border-t border-white/[0.08] p-3">
        <button onClick={onDone} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00ffff] py-2 text-sm font-bold text-black hover:bg-[#00e5e5]">
          <Check className="h-3.5 w-3.5" /> Done
        </button>
      </div>
    </div>,
    document.body
  )
}

// ── Mini exercise row for the builder ─────────────────────────────────────

function BuilderRow({ ex, index, onChange, onRemove, onPick, lastHistory }: {
  ex: BuilderExercise
  index: number
  onChange: (id: string, field: keyof BuilderExercise, value: string | number) => void
  onRemove: (id: string) => void
  onPick: (id: string) => void
  lastHistory?: Record<number, string>
}) {
  const historyEntries = lastHistory ? Object.entries(lastHistory).sort((a, b) => Number(a[0]) - Number(b[0])) : []

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0f] p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold text-[#555555]">{index + 1}</span>
        <button onClick={() => onPick(ex.id)}
          className={cn("flex flex-1 items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs transition-colors hover:border-[#00ffff]/40",
            ex.name ? "border-white/[0.08] bg-[#161b22] font-medium text-white" : "border-dashed border-white/[0.12] text-[#555555]")}>
          <Dumbbell className="h-3 w-3 shrink-0 text-[#555555]" />
          <span className="flex-1 truncate">{ex.name || "Select exercise…"}</span>
          {ex.isCardio && <span className="shrink-0 rounded px-1 text-[9px] font-bold uppercase" style={{ backgroundColor: "rgba(0,255,255,0.12)", color: "#00ffff" }}>Cardio</span>}
        </button>
        <button onClick={() => onRemove(ex.id)} className="text-[#555555] hover:text-[#ff4444]"><X className="h-3.5 w-3.5" /></button>
      </div>
      {historyEntries.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#444]">Last</span>
          {historyEntries.map(([setNum, val]) => (
            <span key={setNum} className="rounded px-1.5 py-0.5 text-[9px] font-bold text-[#888888]" style={{ backgroundColor: "rgba(0,255,255,0.06)" }}>{val}</span>
          ))}
        </div>
      )}
      <div className={cn("grid gap-2", ex.isCardio ? "grid-cols-2" : "grid-cols-3")}>
        <div>
          <label className="mb-0.5 block text-[9px] text-[#555555]">Sets</label>
          <input type="number" value={ex.sets} onChange={(e) => onChange(ex.id, "sets", parseFloat(e.target.value) || 0)}
            className="w-full rounded-lg border border-white/[0.08] bg-[#161b22] px-2 py-1.5 text-xs text-white focus:border-[#00ffff]/40 focus:outline-none" />
        </div>
        {ex.isCardio ? (
          <div>
            <label className="mb-0.5 block text-[9px] text-[#555555]">Duration (min)</label>
            <input type="number" value={ex.reps} onChange={(e) => onChange(ex.id, "reps", parseFloat(e.target.value) || 0)}
              className="w-full rounded-lg border border-white/[0.08] bg-[#161b22] px-2 py-1.5 text-xs text-white focus:border-[#00ffff]/40 focus:outline-none" />
          </div>
        ) : (
          <>
            <div>
              <label className="mb-0.5 block text-[9px] text-[#555555]">Reps</label>
              <input type="number" value={ex.reps} onChange={(e) => onChange(ex.id, "reps", parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-white/[0.08] bg-[#161b22] px-2 py-1.5 text-xs text-white focus:border-[#00ffff]/40 focus:outline-none" />
            </div>
            <div>
              <label className="mb-0.5 block text-[9px] text-[#555555]">Weight (kg)</label>
              <input type="number" value={ex.weight} onChange={(e) => onChange(ex.id, "weight", parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-white/[0.08] bg-[#161b22] px-2 py-1.5 text-xs text-white focus:border-[#00ffff]/40 focus:outline-none" />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Props ──────────────────────────────────────────────────────────────────

interface AssignWorkoutModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preselectedTraineeId?: number
  preselectedTemplateId?: number
  preselectedWorkout?: ExistingWorkout
  onAssigned?: () => void
}

// ── Main component ─────────────────────────────────────────────────────────

export function AssignWorkoutModal({
  open, onOpenChange, preselectedTraineeId, preselectedTemplateId, preselectedWorkout, onAssigned,
}: AssignWorkoutModalProps) {
  const user = getUserInfo()

  type Step = "workout" | "build" | "trainee" | "date"
  const [step, setStep] = useState<Step>("workout")

  // Program folder browser
  const [programs, setPrograms] = useState<ApiProgram[]>([])
  const [programsLoading, setProgramsLoading] = useState(false)
  const [openProgramId, setOpenProgramId] = useState<number | null>(null)
  const [programWorkouts, setProgramWorkouts] = useState<ApiProgramWorkout[]>([])
  const [programWorkoutsLoading, setProgramWorkoutsLoading] = useState(false)
  const [workoutSearch, setWorkoutSearch] = useState("")

  // Trainees
  const [trainees, setTrainees] = useState<Trainee[]>([])
  const [traineesLoading, setTraineesLoading] = useState(false)
  const [traineeSearch, setTraineeSearch] = useState("")

  // Selections
  const [selectedTrainee, setSelectedTrainee] = useState<Trainee | null>(null)
  const [scheduledDate, setScheduledDate] = useState<Date>(new Date())
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  // Builder state (for "create new" path)
  const [buildName, setBuildName] = useState("")
  const [buildDesc, setBuildDesc] = useState("")
  const [buildExercises, setBuildExercises] = useState<BuilderExercise[]>([])
  const [pickerTargetId, setPickerTargetId] = useState<string | null>(null)
  // Last session history per exercise id: { [exId]: { [setNum]: "75kg×10" } }
  const [lastSessionLogs, setLastSessionLogs] = useState<Record<string, Record<number, string>>>({})

  // Submit
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [loadError, setLoadError] = useState("")

  // ── Load data ──────────────────────────────────────────────────────────

  const fetchPrograms = useCallback(async () => {
    if (!user?.id) return
    setProgramsLoading(true)
    try {
      const data = await apiFetch<{ programs: ApiProgram[] }>(`/programs/users/${user.id}`)
      setPrograms(data.programs ?? [])
    } catch { setPrograms([]) }
    finally { setProgramsLoading(false) }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProgramWorkouts = useCallback(async (programId: number) => {
    setProgramWorkoutsLoading(true)
    try {
      const data = await apiFetch<{ workouts: ApiProgramWorkout[] }>(`/programs/${programId}/workouts`)
      setProgramWorkouts(data.workouts ?? [])
    } catch { setProgramWorkouts([]) }
    finally { setProgramWorkoutsLoading(false) }
  }, [])

  const fetchTrainees = useCallback(async () => {
    if (!user?.id) return
    setTraineesLoading(true)
    try {
      const data = await apiFetch<Trainee[] | { trainees: Trainee[] }>(`/coaches/${user.id}/trainees`)
      const fetched = Array.isArray(data) ? data : ((data as { trainees: Trainee[] }).trainees ?? [])
      const meAsTrainee: Trainee = { id: user.id, name: `${user.name || "Coach"} (Me)`, email: user.email || "" }
      setTrainees([meAsTrainee, ...fetched.filter(t => t.id !== user.id)])
    } catch (e) {
      const meAsTrainee: Trainee = { id: user.id, name: `${user.name || "Coach"} (Me)`, email: user.email || "" }
      setTrainees([meAsTrainee])
      setLoadError(e instanceof Error ? e.message : "Failed to load trainees")
    } finally { setTraineesLoading(false) }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadWorkoutIntoBuilder = (workout: ExistingWorkout) => {
    setBuildName(workout.name)
    setBuildDesc(workout.description || "")
    setBuildExercises((workout.exercises ?? []).map((ex, i) => ({
      id: `ex-${ex.id}-${Date.now()}-${i}`,
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      weight: ex.targetWeight ?? (ex as any).target_weight ?? 0,
      notes: ex.notes ?? "",
      isCardio: !!ex.is_cardio,
    })))
  }

  useEffect(() => {
    if (!open) return
    // Reset
    setSubmitError(""); setLoadError("")
    setWorkoutSearch(""); setTraineeSearch("")
    setBuildName(""); setBuildDesc(""); setBuildExercises([])
    setPickerTargetId(null); setLastSessionLogs({})
    setOpenProgramId(null); setProgramWorkouts([])

    setSelectedTrainee(null)
    setScheduledDate(new Date())

    if (preselectedWorkout) {
      loadWorkoutIntoBuilder(preselectedWorkout)
      setStep(preselectedTraineeId ? "build" : "trainee")
    } else {
      setStep(preselectedTraineeId ? "workout" : "trainee")
      if (!preselectedTraineeId) fetchPrograms()
    }
    fetchTrainees()
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (openProgramId !== null) fetchProgramWorkouts(openProgramId)
  }, [openProgramId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (preselectedTraineeId && trainees.length > 0) {
      const t = trainees.find((t) => t.id === preselectedTraineeId)
      if (t) setSelectedTrainee(t)
    }
  }, [preselectedTraineeId, trainees]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Builder helpers ────────────────────────────────────────────────────

  const addBuilderEx = () => {
    const newId = `ex-${Date.now()}`
    setBuildExercises(prev => [...prev, { id: newId, name: "", sets: 3, reps: 10, weight: 0, notes: "", isCardio: false }])
    setPickerTargetId(newId)
  }

  const updateBuilderEx = (id: string, field: keyof BuilderExercise, value: string | number) =>
    setBuildExercises(prev => prev.map(ex => ex.id === id ? { ...ex, [field]: value } : ex))

  const removeBuilderEx = (id: string) =>
    setBuildExercises(prev => prev.filter(ex => ex.id !== id))

  const handlePickEx = ({ name: exName, isCardio }: { name: string; isCardio: boolean }) => {
    if (!pickerTargetId) return
    const newId = `ex-${Date.now()}`
    setBuildExercises(prev => [
      ...prev.map(ex => ex.id === pickerTargetId ? { ...ex, name: exName, isCardio } : ex),
      { id: newId, name: "", sets: 3, reps: 10, weight: 0, notes: "", isCardio: false },
    ])
    setPickerTargetId(newId)
  }

  const handlePickerDone = () => {
    setBuildExercises(prev => prev.filter(ex => ex.name.trim()))
    setPickerTargetId(null)
  }

  // ── Last session history ───────────────────────────────────────────────
  // Fetch when an exercise gets a name assigned; use preselectedTraineeId or selectedTrainee
  useEffect(() => {
    const targetId = preselectedTraineeId ?? selectedTrainee?.id
    if (!targetId) return
    for (const ex of buildExercises) {
      if (!ex.name || lastSessionLogs[ex.id] !== undefined) continue
      apiFetch<{ progression?: { date?: string; completed_at?: string; setNumber?: number; set_number?: number; weight?: number; weight_used?: number; weightUsed?: number; reps?: number; reps_completed?: number; repsCompleted?: number; weightUnit?: string; weight_unit?: string }[] }>(
        `/workout-plans/users/${targetId}/progression?exercise=${encodeURIComponent(ex.name)}`
      ).then(d => {
        const rawLogs = d.progression ?? []
        if (!rawLogs.length) { setLastSessionLogs(p => ({ ...p, [ex.id]: {} })); return }
        const byDate: Record<string, typeof rawLogs> = {}
        for (const l of rawLogs) {
          const date = (l.date || l.completed_at || "").split("T")[0] || "unknown"
          ;(byDate[date] ??= []).push(l)
        }
        const latest = Object.keys(byDate).sort((a, b) => b.localeCompare(a))[0]
        if (!latest) { setLastSessionLogs(p => ({ ...p, [ex.id]: {} })); return }
        const map: Record<number, string> = {}
        for (const l of byDate[latest]) {
          const setNum = l.setNumber ?? l.set_number
          const w = l.weight ?? l.weightUsed ?? l.weight_used
          const r = l.reps ?? l.repsCompleted ?? l.reps_completed
          const unit = l.weightUnit ?? l.weight_unit ?? "kg"
          if (setNum != null && w != null && r != null) map[setNum] = `${w}${unit}×${r}`
        }
        setLastSessionLogs(p => ({ ...p, [ex.id]: map }))
      }).catch(() => {})
    }
  }, [buildExercises, preselectedTraineeId, selectedTrainee?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Submit ─────────────────────────────────────────────────────────────

  const handleAssign = async () => {
    if (!selectedTrainee || !user?.id) return
    setSubmitting(true); setSubmitError("")
    try {
      const exercises = buildExercises.filter(ex => ex.name.trim()).map((ex, i) => ({
        name: ex.name, sets: ex.sets, reps: ex.reps,
        targetWeight: ex.weight, weightUnit: "kg",
        restTime: 60, notes: ex.notes, exerciseOrder: i,
        track_rpe: 0, track_rir: 0, is_cardio: ex.isCardio ? 1 : 0,
      }))

      await apiFetch("/workout-plans", {
        method: "POST",
        body: JSON.stringify({
          traineeId: selectedTrainee.id,
          coachId: user.id,
          name: buildName,
          description: buildDesc,
          scheduledDate: format(scheduledDate, "yyyy-MM-dd"),
          exercises,
        }),
      })
      onAssigned?.()
      onOpenChange(false)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to assign workout")
    } finally { setSubmitting(false) }
  }

  // ── Step navigation ────────────────────────────────────────────────────

  const handleNext = () => {
    if (step === "trainee") {
      setStep(preselectedWorkout ? "build" : "workout")
    } else if (step === "workout") {
      setStep("build")
    } else if (step === "build") {
      setStep("date")
    } else {
      handleAssign()
    }
  }

  const handleBack = () => {
    if (step === "workout") {
      if (preselectedTraineeId) onOpenChange(false)
      else setStep("trainee")
    } else if (step === "build") {
      if (preselectedWorkout) {
        if (preselectedTraineeId) onOpenChange(false)
        else setStep("trainee")
      } else {
        setStep("workout")
      }
    } else if (step === "date") {
      setStep("build")
    } else if (step === "trainee") {
      onOpenChange(false)
    }
  }

  const canAdvance =
    step === "workout" ? false :
    step === "build" ? !!buildName.trim() && buildExercises.filter(e => e.name.trim()).length > 0 :
    step === "trainee" ? !!selectedTrainee : true

  const filteredProgramWorkouts = programWorkouts.filter(w => w.name.toLowerCase().includes(workoutSearch.toLowerCase()))
  const filteredTrainees = trainees.filter(t =>
    t.name.toLowerCase().includes(traineeSearch.toLowerCase()) ||
    t.email.toLowerCase().includes(traineeSearch.toLowerCase())
  )

  const tierColor: Record<string, string> = {
    BRONZE: "#cd7f32", SILVER: "#c0c0c0", GOLD: "#ffd700", PLATINUM: "#e5e4e2",
  }

  const stepLabel: Record<Step, string> = {
    workout: "Select Workout",
    build: "Build Workout",
    trainee: "Select Trainee",
    date: "Schedule Date",
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-h-[90vh] border-[#00ffff]/20 bg-[#161b22] p-0 sm:max-w-lg overflow-hidden flex flex-col"
          style={{ zIndex: 200 }}
          showCloseButton={false}
          onInteractOutside={(e) => { if (pickerTargetId) e.preventDefault() }}
        >
          {/* Header */}
          <DialogHeader className="flex-row items-center justify-between border-b border-white/[0.08] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00ffff]/10">
                <Dumbbell className="h-5 w-5 text-[#00ffff]" />
              </div>
              <DialogTitle className="text-lg font-bold text-white">{stepLabel[step]}</DialogTitle>
            </div>
            <button onClick={() => onOpenChange(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#888888] hover:bg-white/[0.05] hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </DialogHeader>

          {loadError && (
            <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl border border-[#ff4444]/30 bg-[#ff4444]/10 px-4 py-3 text-sm text-[#ff4444]">
              <AlertCircle className="h-4 w-4 shrink-0" />{loadError}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">

            {/* ── STEP: workout ── */}
            {step === "workout" && (
              <div className="space-y-3">
                {/* Build new */}
                <button
                  onClick={() => { setBuildName(""); setBuildDesc(""); setBuildExercises([]); setStep("build") }}
                  className="flex w-full items-center gap-4 rounded-xl border border-dashed border-[#00ffff]/30 bg-[#00ffff]/5 p-4 text-left transition-all hover:border-[#00ffff]/60 hover:bg-[#00ffff]/10"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00ffff]/20">
                    <Plus className="h-5 w-5 text-[#00ffff]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#00ffff]">Build new workout</p>
                    <p className="text-xs text-[#888888]">Create a workout from scratch</p>
                  </div>
                </button>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/[0.06]" />
                  <span className="text-xs text-[#555555]">or pick from your library</span>
                  <div className="h-px flex-1 bg-white/[0.06]" />
                </div>

                {/* Folder browser — back button when inside a folder */}
                {openProgramId !== null ? (
                  <>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setOpenProgramId(null); setProgramWorkouts([]); setWorkoutSearch("") }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-[#888888] hover:text-white">
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <span className="text-sm font-semibold text-white">
                        {programs.find(p => p.id === openProgramId)?.name ?? "Folder"}
                      </span>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555555]" />
                      <input value={workoutSearch} onChange={(e) => setWorkoutSearch(e.target.value)}
                        placeholder="Search workouts..."
                        className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-[#555555] focus:border-[#00ffff]/50 focus:outline-none" />
                    </div>
                    {programWorkoutsLoading ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#00ffff]" /></div>
                    ) : filteredProgramWorkouts.length === 0 ? (
                      <div className="flex flex-col items-center py-8 text-[#555555]">
                        <Dumbbell className="mb-2 h-7 w-7" />
                        <p className="text-sm">{programWorkouts.length === 0 ? "No workouts in this folder." : "No matches."}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredProgramWorkouts.map((w) => {
                          const folderColor = programs.find(p => p.id === openProgramId)?.hex_color ?? "#a78bfa"
                          const asExisting: ExistingWorkout = {
                            id: w.id, name: w.name, description: w.description,
                            exercises: (w.exercises ?? []).map(ex => ({
                              id: ex.id, name: ex.name, sets: ex.sets, reps: ex.reps,
                              targetWeight: ex.targetWeight ?? ex.target_weight,
                              weightUnit: ex.weightUnit ?? ex.weight_unit ?? "kg",
                              notes: ex.notes, is_cardio: ex.is_cardio,
                              track_rpe: ex.track_rpe, track_rir: ex.track_rir,
                            }))
                          }
                          return (
                            <button key={w.id} onClick={() => { loadWorkoutIntoBuilder(asExisting); setStep("build") }}
                              className="flex w-full items-center gap-4 rounded-xl border border-white/[0.08] bg-[#0a0a0f] p-4 text-left transition-all hover:border-[#00ffff]/50">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${folderColor}18` }}>
                                <Dumbbell className="h-5 w-5" style={{ color: folderColor }} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-white">{w.name}</p>
                                {w.description && <p className="truncate text-xs text-[#888888]">{w.description}</p>}
                                {w.exercises && <p className="text-xs text-[#555555]">{w.exercises.length} exercise{w.exercises.length !== 1 ? "s" : ""}</p>}
                              </div>
                              <ChevronRight className="h-5 w-5 shrink-0 text-[#555555]" />
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  /* Program folder list */
                  programsLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#00ffff]" /></div>
                  ) : programs.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-[#555555]">
                      <Dumbbell className="mb-2 h-7 w-7" />
                      <p className="text-sm">No program folders yet.</p>
                      <p className="mt-1 text-xs">Create folders in the Programs section to organize your workouts.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {programs.map((p) => {
                        const color = p.hex_color ?? "#a78bfa"
                        return (
                          <button key={p.id} onClick={() => { setOpenProgramId(p.id); setWorkoutSearch("") }}
                            className="flex w-full items-center gap-4 rounded-xl border border-white/[0.08] bg-[#0a0a0f] p-4 text-left transition-all hover:border-white/[0.15]"
                            style={{ borderLeftWidth: "3px", borderLeftColor: color }}>
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}18` }}>
                              <ChevronRight className="h-4 w-4" style={{ color }} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-white">{p.name}</p>
                              <p className="text-xs text-[#555555]">{p.workout_count ?? 0} workout{(p.workout_count ?? 0) !== 1 ? "s" : ""}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-[#555555]" />
                          </button>
                        )
                      })}
                    </div>
                  )
                )}
              </div>
            )}

            {/* ── STEP: build ── */}
            {step === "build" && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#888888]">Workout Name</label>
                  <input type="text" value={buildName} onChange={(e) => setBuildName(e.target.value)}
                    placeholder="e.g., Upper Body Strength"
                    className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-4 py-2.5 text-white placeholder:text-[#555555] focus:border-[#00ffff]/50 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#888888]">Description (optional)</label>
                  <input type="text" value={buildDesc} onChange={(e) => setBuildDesc(e.target.value)}
                    placeholder="Brief description…"
                    className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-4 py-2.5 text-white placeholder:text-[#555555] focus:border-[#00ffff]/50 focus:outline-none" />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium text-[#888888]">Exercises ({buildExercises.filter(e => e.name).length})</label>
                    <button onClick={addBuilderEx}
                      className="flex items-center gap-1.5 rounded-lg bg-[#00ffff]/10 px-3 py-1.5 text-xs font-medium text-[#00ffff] hover:bg-[#00ffff]/20">
                      <Plus className="h-3.5 w-3.5" /> Add Exercise
                    </button>
                  </div>
                  {buildExercises.length === 0 ? (
                    <button onClick={addBuilderEx}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.12] py-6 text-sm text-[#555555] hover:border-[#00ffff]/30 hover:text-[#00ffff]">
                      <Plus className="h-4 w-4" /> Add your first exercise
                    </button>
                  ) : (
                    <div className="space-y-2">
                      {buildExercises.map((ex, i) => (
                        <BuilderRow key={ex.id} ex={ex} index={i}
                          onChange={updateBuilderEx} onRemove={removeBuilderEx}
                          onPick={(id) => setPickerTargetId(id)}
                          lastHistory={lastSessionLogs[ex.id]} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP: trainee ── */}
            {step === "trainee" && (
              <div className="space-y-3">
                {buildName && (
                  <div className="flex items-center gap-3 rounded-xl border border-[#00ffff]/20 bg-[#00ffff]/5 px-4 py-3">
                    <Dumbbell className="h-4 w-4 shrink-0 text-[#00ffff]" />
                    <span className="truncate text-sm font-medium text-[#00ffff]">{buildName}</span>
                  </div>
                )}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555555]" />
                  <input value={traineeSearch} onChange={(e) => setTraineeSearch(e.target.value)} placeholder="Search trainees..."
                    className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-[#555555] focus:border-[#00ffff]/50 focus:outline-none" />
                </div>
                {traineesLoading ? (
                  <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[#00ffff]" /></div>
                ) : filteredTrainees.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-[#555555]">
                    <Users className="mb-2 h-7 w-7" />
                    <p className="text-sm">{trainees.length === 0 ? "No trainees yet." : "No matches."}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTrainees.map((t) => {
                      const initials = t.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                      const color = tierColor[t.subscriptionTier ?? ""] ?? "#888888"
                      return (
                        <button key={t.id} onClick={() => setSelectedTrainee(t)}
                          className={cn("flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all",
                            selectedTrainee?.id === t.id ? "border-[#00ffff]/50 bg-[#00ffff]/10" : "border-white/[0.08] bg-[#0a0a0f] hover:border-white/[0.15]")}>
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#00ffff]/30 to-[#00ff88]/30 text-sm font-bold text-[#00ffff]">
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-medium text-white">{t.name}</p>
                              {t.subscriptionTier && (
                                <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase" style={{ backgroundColor: `${color}20`, color }}>{t.subscriptionTier}</span>
                              )}
                            </div>
                            <p className="truncate text-xs text-[#888888]">{t.email}</p>
                          </div>
                          {selectedTrainee?.id === t.id && <Check className="h-5 w-5 shrink-0 text-[#00ffff]" />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── STEP: date ── */}
            {step === "date" && (
              <div className="space-y-4">
                <div className="space-y-2 rounded-xl border border-white/[0.08] bg-[#0a0a0f] p-4">
                  <div className="flex items-center gap-3">
                    <Dumbbell className="h-4 w-4 text-[#00ffff]" />
                    <span className="text-sm text-white">{buildName}</span>
                  </div>
                  {selectedTrainee && (
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-[#00ff88]" />
                      <span className="text-sm text-white">{selectedTrainee.name}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#888888]">Scheduled Date</label>
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <button className="flex w-full items-center justify-between rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-4 py-3 text-white hover:border-white/[0.15]">
                        <span>{format(scheduledDate, "EEEE, MMMM d, yyyy")}</span>
                        <CalendarDays className="h-4 w-4 text-[#888888]" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto border-white/[0.08] bg-[#161b22] p-0" align="start">
                      <Calendar mode="single" selected={scheduledDate}
                        onSelect={(d) => { if (d) { setScheduledDate(d); setDatePickerOpen(false) } }} className="text-white" />
                    </PopoverContent>
                  </Popover>
                </div>
                {submitError && (
                  <div className="flex items-center gap-2 rounded-xl border border-[#ff4444]/30 bg-[#ff4444]/10 px-4 py-3 text-sm text-[#ff4444]">
                    <AlertCircle className="h-4 w-4 shrink-0" />{submitError}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 border-t border-white/[0.08] px-6 py-4">
            <button onClick={handleBack} className="flex-1 rounded-xl border border-white/[0.15] bg-[#0a0a0f] py-3 font-medium text-white hover:bg-[#161b22]">
              {step === "trainee" || (step === "workout" && preselectedTraineeId) ? "Cancel" : "Back"}
            </button>
            {step !== "workout" && (
              <button onClick={handleNext} disabled={!canAdvance || submitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#00ffff] py-3 font-bold text-black hover:bg-[#00e5e5] disabled:cursor-not-allowed disabled:opacity-50">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {step === "date" ? "Assign Workout" : "Next"}
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ExPickerPanel
        open={pickerTargetId !== null}
        onClose={handlePickerDone}
        onSelect={handlePickEx}
        onDone={handlePickerDone}
      />
    </>
  )
}
