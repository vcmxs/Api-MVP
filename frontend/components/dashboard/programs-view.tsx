"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { createPortal } from "react-dom"
import {
  Plus, ClipboardList, Dumbbell, X,
  FolderOpen, Folder, Trash2, Pencil,
  ArrowLeft, Search, ChevronRight, Loader2, AlertCircle, Check,
  CalendarDays, Users, LayoutList,
} from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { apiFetch, getUserInfo } from "@/lib/api"
import { AssignWorkoutModal } from "./assign-workout-modal"

// ── API Types ─────────────────────────────────────────────────────────────

interface ApiProgram {
  id: number
  name: string
  hex_color?: string
  workout_count?: number
}

interface ProgramExercise {
  id?: number
  name: string
  sets: number
  reps: number
  targetWeight?: number
  target_weight?: number
  weightUnit?: string
  weight_unit?: string
  notes?: string
  is_cardio?: boolean | number
  track_rpe?: boolean | number
  track_rir?: boolean | number
  exerciseOrder?: number
  isCardio?: boolean
}

interface ApiProgramWorkout {
  id: number
  name: string
  description?: string
  exercises?: ProgramExercise[]
}

// ── Plan Types + localStorage ─────────────────────────────────────────────

const DAY_NAMES: Record<number, string> = {
  1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday",
  5: "Friday", 6: "Saturday", 7: "Sunday",
}
const DAY_SHORT: Record<number, string> = {
  1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat", 7: "Sun",
}
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 7]

// Web format: { workoutId, workoutName, programId }
// Mobile format: { type, name, templateId }
interface DaySlot {
  // Web format
  workoutId?: number
  workoutName?: string
  programId?: number
  // Mobile format
  templateId?: number
  name?: string
  type?: string
}

// Helpers to normalise slots from either platform
const getSlotWorkoutId = (slot: DaySlot) => slot.workoutId || slot.templateId
const getSlotName = (slot: DaySlot) => slot.workoutName || slot.name || "Workout"

interface TrainingPlan {
  id: string
  name: string
  description?: string
  durationWeeks: number
  isReusable: boolean
  programFolderId?: number   // undefined = standalone
  schedule: Partial<Record<number, DaySlot>>  // 1=Mon … 7=Sun
  createdAt: string
}

async function loadAllPlans(userId: number | string): Promise<TrainingPlan[]> {
  if (!userId) return [];
  try {
    const res = await apiFetch(`/training-plans/users/${userId}`)
    return (res.plans || []).map((p: any) => ({
      ...p,
      programFolderId: p.program_folder_id,
      durationWeeks: p.duration_weeks,
      isReusable: p.is_reusable
    }))
  } catch {
    return []
  }
}
async function upsertPlan(plan: TrainingPlan, userId: number | string) {
  if (!userId) return;
  const payload = {
    ...plan,
    user_id: userId,
    program_folder_id: plan.programFolderId,
    duration_weeks: plan.durationWeeks,
    is_reusable: plan.isReusable
  }
  try {
    if (plan.id && !plan.id.toString().startsWith('plan_')) {
      await apiFetch(`/training-plans/${plan.id}`, { method: "PUT", body: JSON.stringify(payload) })
    } else {
      await apiFetch(`/training-plans`, { method: "POST", body: JSON.stringify(payload) })
    }
  } catch (err) {
    console.error("Failed to sync plan to cloud", err)
  }
}
async function removePlan(id: string) {
  try {
    await apiFetch(`/training-plans/${id}`, { method: "DELETE" })
  } catch (err) {
    console.error("Failed to delete plan from cloud", err)
  }
}

// ── Date helpers ──────────────────────────────────────────────────────────

/** stored day 1=Mon…7=Sun → JS day 0=Sun…6=Sat */
function toJsDay(d: number) { return d === 7 ? 0 : d }

function getMondayOf(date: Date): Date {
  const d = new Date(date); d.setHours(0, 0, 0, 0)
  const dow = d.getDay()
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow))
  return d
}

function getPlanDates(
  startDate: Date,
  durationWeeks: number,
  schedule: Partial<Record<number, DaySlot>>,
): { date: Date; slot: DaySlot }[] {
  const results: { date: Date; slot: DaySlot }[] = []
  const monday = getMondayOf(startDate)
  const start = new Date(startDate); start.setHours(0, 0, 0, 0)
  const dayNums = Object.keys(schedule).map(Number).sort()
  for (let w = 0; w < durationWeeks; w++) {
    for (const dn of dayNums) {
      const slot = schedule[dn]; if (!slot) continue
      const jsDay = toJsDay(dn)
      const offset = jsDay === 0 ? 6 : jsDay - 1        // Mon=0 … Sun=6
      const d = new Date(monday)
      d.setDate(monday.getDate() + w * 7 + offset)
      if (d >= start) results.push({ date: d, slot })
    }
  }
  return results
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

// ── Constants ─────────────────────────────────────────────────────────────

const folderColors = ["#00ffff", "#00ff88", "#ffd700", "#a78bfa", "#ff4444", "#ff8800", "#4F46E5", "#10B981"]

// ── Exercise Picker Panel ─────────────────────────────────────────────────

interface ExSuggestion { id: number; name: string; muscle_group?: string; muscle_category?: string; is_cardio?: boolean | number }

function isCardioEx(ex: ExSuggestion) {
  const cat = (ex.muscle_category ?? ex.muscle_group ?? "").toLowerCase()
  const name = (ex.name ?? "").toLowerCase()
  return !!(ex.is_cardio || cat.includes("cardio") || cat.includes("aerobic") || name.includes("treadmill") || name.includes("cycling") || name.includes("running"))
}

function useExSuggestions(query: string) {
  const [suggestions, setSuggestions] = useState<ExSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return }
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await apiFetch<ExSuggestion[] | { exercises: ExSuggestion[] }>(`/exercises?search=${encodeURIComponent(query)}`)
        setSuggestions((Array.isArray(data) ? data : (data as { exercises: ExSuggestion[] }).exercises ?? []).slice(0, 8))
      } catch { setSuggestions([]) } finally { setLoading(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [query])
  return { suggestions, loading }
}

function ExPickerPanel({ open, onClose, onSelect, onDone, rightRem = 34 }: {
  open: boolean; onClose: () => void
  onSelect: (ex: { name: string; isCardio: boolean }) => void; onDone: () => void
  rightRem?: number
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
    setMode("categories"); setSelectedCat(null); setSearchQ(""); setCatsLoading(true)
    apiFetch<string[] | { categories: string[] }>("/exercises/categories")
      .then(d => setCategories(Array.isArray(d) ? d : (d as { categories: string[] }).categories ?? []))
      .catch(() => setCategories([])).finally(() => setCatsLoading(false))
  }, [open])

  const selectCat = async (cat: string) => {
    setSelectedCat(cat); setMode("exercises"); setCatLoading(true)
    try {
      const d = await apiFetch<ExSuggestion[] | { exercises: ExSuggestion[] }>(`/exercises?category=${encodeURIComponent(cat)}`)
      setCatExs(Array.isArray(d) ? d : (d as { exercises: ExSuggestion[] }).exercises ?? [])
    } catch { setCatExs([]) } finally { setCatLoading(false) }
  }

  const pick = (ex: ExSuggestion) => { onSelect({ name: ex.name, isCardio: isCardioEx(ex) }); setMode("categories"); setSelectedCat(null); setSearchQ("") }

  if (typeof window === "undefined") return null
  return createPortal(
    <div className="fixed top-0 z-[199] flex h-screen w-64 flex-col border-r border-white/[0.08] bg-[#0f1117] shadow-2xl transition-transform duration-300 ease-in-out"
      style={{ right: `${rightRem}rem`, transform: open ? "translateX(0)" : `translateX(calc(100% + ${rightRem + 1}rem))`, pointerEvents: open ? "auto" : "none" }}>
      <div className="flex h-16 items-center justify-between border-b border-white/[0.08] px-4">
        <div className="flex items-center gap-2">
          {mode === "exercises"
            ? <button onClick={() => setMode("categories")} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] text-[#888888] hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /></button>
            : <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#a78bfa]/10"><Dumbbell className="h-3.5 w-3.5 text-[#a78bfa]" /></div>}
          <span className="text-sm font-bold text-white">{mode === "search" ? "Search" : mode === "exercises" ? selectedCat : "Muscle Group"}</span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setMode(mode === "search" ? "categories" : "search")}
            className={cn("flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08]", mode === "search" ? "bg-[#a78bfa]/10 text-[#a78bfa]" : "text-[#888888] hover:text-white")}>
            <Search className="h-3.5 w-3.5" /></button>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] text-[#888888] hover:text-white"><X className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      {mode === "search" && (
        <div className="px-3 pt-3 pb-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#555555]" />
            <input autoFocus type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search exercises..."
              className="w-full rounded-xl border border-white/[0.08] bg-[#161b22] py-2 pl-9 pr-3 text-sm text-white placeholder:text-[#555555] focus:border-[#a78bfa]/50 focus:outline-none" />
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto py-1">
        {mode === "search"
          ? searchLoading ? <div className="flex justify-center py-8"><Loader2 className="h-4 w-4 animate-spin text-[#555555]" /></div>
            : searchQ.length < 2 ? <p className="py-8 text-center text-xs text-[#555555]">Type to search…</p>
            : searchResults.length === 0 ? <p className="py-8 text-center text-xs text-[#555555]">No results</p>
            : searchResults.map(ex => <button key={ex.id} onClick={() => pick(ex)} className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-white/[0.04]"><Dumbbell className="h-3 w-3 shrink-0 text-[#555555]" /><span className="truncate text-sm text-white">{ex.name}</span></button>)
          : mode === "categories"
          ? catsLoading ? <div className="flex justify-center py-8"><Loader2 className="h-4 w-4 animate-spin text-[#555555]" /></div>
            : categories.map((cat, i) => <button key={i} onClick={() => selectCat(cat)} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-white/[0.04]"><span className="text-sm font-medium text-white">{cat}</span><ChevronRight className="h-3.5 w-3.5 text-[#555555]" /></button>)
          : catLoading ? <div className="flex justify-center py-8"><Loader2 className="h-4 w-4 animate-spin text-[#555555]" /></div>
          : catExs.map(ex => <button key={ex.id} onClick={() => pick(ex)} className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-white/[0.04]"><Dumbbell className="h-3 w-3 shrink-0 text-[#555555]" /><span className="truncate text-sm text-white">{ex.name}</span></button>)}
      </div>
      <div className="border-t border-white/[0.08] p-3">
        <button onClick={onDone} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#a78bfa] py-2 text-sm font-bold text-black hover:opacity-90">
          <Check className="h-3.5 w-3.5" /> Done
        </button>
      </div>
    </div>,
    document.body
  )
}

// ── Workout Picker Panel ──────────────────────────────────────────────────
// Slides in from behind the Plan Builder Sheet.
// Two screens: "list" (library + create card) and "create" (inline builder).

function WorkoutPickerPanel({ open, onClose, onSelect, available, programFolderId, onWorkoutCreated }: {
  open: boolean
  onClose: () => void
  onSelect: (w: AvailableWorkout) => void
  available: AvailableWorkout[]
  programFolderId?: number
  onWorkoutCreated: (w: AvailableWorkout) => void
}) {
  const user = getUserInfo()
  const [mode, setMode] = useState<"list" | "create">("list")
  const [search, setSearch] = useState("")

  // Create mode
  const [createName, setCreateName] = useState("")
  const [createExercises, setCreateExercises] = useState<BuilderEx[]>([])
  const [exPickerTarget, setExPickerTarget] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")

  useEffect(() => {
    if (!open) { setMode("list"); setSearch(""); setSaveError("") }
  }, [open])

  const filtered = useMemo(() =>
    available.filter(w => w.name.toLowerCase().includes(search.toLowerCase())),
    [available, search]
  )

  const grouped = useMemo(() => {
    const map = new Map<string, AvailableWorkout[]>()
    for (const w of filtered) {
      if (!map.has(w.programName)) map.set(w.programName, [])
      map.get(w.programName)!.push(w)
    }
    return map
  }, [filtered])

  const enterCreate = () => {
    setCreateName(""); setCreateExercises([]); setExPickerTarget(null); setSaveError("")
    setMode("create")
  }

  const addCreateEx = () => {
    const id = `ex-${Date.now()}`
    setCreateExercises(p => [...p, { id, name: "", sets: 3, reps: 10, weight: 0, notes: "", isCardio: false }])
    setExPickerTarget(id)
  }

  const updateCreateEx = (id: string, field: keyof BuilderEx, value: string | number) =>
    setCreateExercises(p => p.map(e => e.id === id ? { ...e, [field]: value } : e))

  const removeCreateEx = (id: string) =>
    setCreateExercises(p => p.filter(e => e.id !== id))

  const handlePickEx = ({ name: n, isCardio }: { name: string; isCardio: boolean }) => {
    if (!exPickerTarget) return
    const nid = `ex-${Date.now()}`
    setCreateExercises(p => [
      ...p.map(e => e.id === exPickerTarget ? { ...e, name: n, isCardio } : e),
      { id: nid, name: "", sets: 3, reps: 10, weight: 0, notes: "", isCardio: false },
    ])
    setExPickerTarget(nid)
  }

  const handleExPickerDone = () => {
    setCreateExercises(p => p.filter(e => e.name.trim()))
    setExPickerTarget(null)
  }

  const handleSaveNew = async () => {
    if (!createName.trim()) return
    setSaving(true); setSaveError("")
    try {
      const validEx = createExercises.filter(e => e.name.trim())
      let newW: AvailableWorkout

      if (programFolderId && user?.id) {
        // Save to backend under the program folder
        const created = await apiFetch<{ id: number; name: string }>("/workout-templates", {
          method: "POST",
          body: JSON.stringify({
            userId: user.id, name: createName.trim(), programId: programFolderId,
            exercises: validEx.map((e, i) => ({
              name: e.name.trim(), sets: e.sets, reps: e.reps, targetWeight: e.weight,
              weightUnit: "kg", restTime: 60, notes: e.notes || "", exerciseOrder: i,
              trackRpe: false, trackRir: false, isCardio: e.isCardio,
            })),
          }),
        })
        const folderName = available.find(a => a.programId === programFolderId)?.programName ?? "Folder"
        newW = { id: created.id, name: createName.trim(), programId: programFolderId, programName: folderName }
      } else {
        // Standalone plan — save locally with a negative ID
        const localId = -(Date.now())
        newW = { id: localId, name: createName.trim(), programId: 0, programName: "Local" }
        const stored = JSON.parse(localStorage.getItem("dupla_local_workouts") ?? "[]")
        stored.unshift({ id: localId, name: createName.trim(), exercises: validEx })
        localStorage.setItem("dupla_local_workouts", JSON.stringify(stored))
      }

      onWorkoutCreated(newW)
      onSelect(newW)
      setMode("list")
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Failed to save workout")
    } finally { setSaving(false) }
  }

  if (typeof window === "undefined") return null

  // WorkoutPickerPanel: right=34rem, width=w-72 (18rem) → left edge at 52rem
  // ExPickerPanel for exercises: right=53rem (52+1 gap)
  return createPortal(
    <>
      <div
        className="fixed top-0 z-[198] flex h-screen w-72 flex-col bg-[#0d0f14] border-r border-white/[0.08] shadow-2xl transition-transform duration-300 ease-in-out"
        style={{ right: "32rem", transform: open ? "translateX(0)" : "translateX(calc(100% + 33rem))", pointerEvents: open ? "auto" : "none" }}
      >
        {/* ── List mode ── */}
        {mode === "list" && (
          <>
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.08] px-4">
              <span className="text-sm font-bold text-white">Select Workout</span>
              <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] text-[#888888] hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Create new card */}
            <button onClick={enterCreate}
              className="flex shrink-0 items-center gap-3 border-b border-white/[0.06] px-4 py-3 text-left transition-colors hover:bg-white/[0.03]">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#a78bfa]/10">
                <Plus className="h-4 w-4 text-[#a78bfa]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#a78bfa]">Create new workout</p>
                <p className="text-xs text-[#555555]">Build from scratch</p>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-[#555555]" />
            </button>

            {/* Search */}
            <div className="shrink-0 px-3 py-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#555555]" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search library…"
                  className="w-full rounded-xl border border-white/[0.08] bg-[#161b22] py-1.5 pl-9 pr-3 text-sm text-white placeholder:text-[#555555] focus:border-[#a78bfa]/40 focus:outline-none" />
              </div>
            </div>

            {/* Workout list */}
            <div className="flex-1 overflow-y-auto py-1">
              {filtered.length === 0
                ? <p className="py-8 text-center text-xs text-[#555555]">{available.length === 0 ? "No workouts in library yet" : "No matches"}</p>
                : Array.from(grouped.entries()).map(([progName, wks]) => (
                  <div key={progName}>
                    <p className="px-4 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-[#444]">{progName}</p>
                    {wks.map(w => (
                      <button key={w.id} onClick={() => { onSelect(w); onClose() }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left hover:bg-white/[0.04]">
                        <Dumbbell className="h-3.5 w-3.5 shrink-0 text-[#555555]" />
                        <span className="truncate text-sm text-white">{w.name}</span>
                      </button>
                    ))}
                  </div>
                ))}
            </div>
          </>
        )}

        {/* ── Create mode ── */}
        {mode === "create" && (
          <>
            <div className="flex h-14 shrink-0 items-center gap-2 border-b border-white/[0.08] px-4">
              <button onClick={() => setMode("list")}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] text-[#888888] hover:text-white">
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
              <span className="text-sm font-bold text-white">Create Workout</span>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {saveError && (
                <p className="rounded-xl border border-[#ff4444]/20 bg-[#ff4444]/10 px-3 py-2 text-xs text-[#ff4444]">{saveError}</p>
              )}

              <input type="text" value={createName} onChange={e => setCreateName(e.target.value)}
                placeholder="Workout name…" autoFocus
                className="w-full rounded-xl border border-white/[0.08] bg-[#161b22] px-3 py-2.5 text-sm text-white placeholder:text-[#555555] focus:border-[#a78bfa]/50 focus:outline-none" />

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs text-[#555555]">{createExercises.filter(e => e.name).length} exercises</p>
                  <button onClick={addCreateEx}
                    className="flex items-center gap-1 rounded-lg bg-[#a78bfa]/10 px-2.5 py-1 text-xs font-medium text-[#a78bfa] hover:bg-[#a78bfa]/20">
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </div>

                {createExercises.length === 0
                  ? <button onClick={addCreateEx}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/[0.10] py-5 text-xs text-[#555555] transition-colors hover:border-[#a78bfa]/30 hover:text-[#a78bfa]">
                      <Plus className="h-3.5 w-3.5" /> Add first exercise
                    </button>
                  : <div className="space-y-2">
                      {createExercises.map((e, i) => (
                        <BuilderRow key={e.id} ex={e} index={i}
                          onChange={updateCreateEx} onRemove={removeCreateEx}
                          onPick={id => setExPickerTarget(id)} userId={user?.id} />
                      ))}
                      <button onClick={addCreateEx}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/[0.08] py-2.5 text-xs text-[#555555] hover:border-[#a78bfa]/30 hover:text-[#a78bfa]">
                        <Plus className="h-3.5 w-3.5" /> Add Exercise
                      </button>
                    </div>}
              </div>
            </div>

            <div className="shrink-0 border-t border-white/[0.08] p-3">
              <button onClick={handleSaveNew} disabled={!createName.trim() || saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#a78bfa] py-2.5 text-sm font-bold text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Saving…" : "Save & Select"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Exercise picker for create mode — slides further left (right=50rem: 32+18) */}
      <ExPickerPanel
        open={exPickerTarget !== null}
        onClose={handleExPickerDone}
        onSelect={handlePickEx}
        onDone={handleExPickerDone}
        rightRem={50}
      />
    </>,
    document.body
  )
}

// ── Builder Exercise Row ──────────────────────────────────────────────────

interface BuilderEx { id: string; name: string; sets: number; reps: number; weight: number; notes: string; isCardio: boolean }

function BuilderRow({ ex, index, onChange, onRemove, onPick, userId }: {
  ex: BuilderEx; index: number
  onChange: (id: string, field: keyof BuilderEx, value: string | number) => void
  onRemove: (id: string) => void; onPick: (id: string) => void
  userId?: number
}) {
  const [rawSets, setRawSets] = useState(String(ex.sets))
  const [rawReps, setRawReps] = useState(String(ex.reps))
  const [rawWeight, setRawWeight] = useState(String(ex.weight))
  const [lastHistory, setLastHistory] = useState<Record<number, string>>({})

  // Sync display when parent resets the row (e.g. on exercise pick)
  useEffect(() => { setRawSets(String(ex.sets)) }, [ex.sets])
  useEffect(() => { setRawReps(String(ex.reps)) }, [ex.reps])
  useEffect(() => { setRawWeight(String(ex.weight)) }, [ex.weight])

  // Fetch last session history when exercise name is set
  useEffect(() => {
    if (!ex.name || !userId) return
    setLastHistory({})
    apiFetch<{ progression?: { date?: string; completed_at?: string; setNumber?: number; set_number?: number; weight?: number; weight_used?: number; weightUsed?: number; reps?: number; reps_completed?: number; repsCompleted?: number; weightUnit?: string; weight_unit?: string }[] }>(
      `/workout-plans/users/${userId}/progression?exercise=${encodeURIComponent(ex.name)}`
    ).then(d => {
      const rawLogs = d.progression ?? []
      if (!rawLogs.length) return
      const byDate: Record<string, typeof rawLogs> = {}
      for (const l of rawLogs) {
        const date = (l.date || l.completed_at || "").split("T")[0] || "unknown"
        ;(byDate[date] ??= []).push(l)
      }
      const latest = Object.keys(byDate).sort((a, b) => b.localeCompare(a))[0]
      if (!latest) return
      const map: Record<number, string> = {}
      for (const l of byDate[latest]) {
        const setNum = l.setNumber ?? l.set_number
        const w = l.weight ?? l.weightUsed ?? l.weight_used
        const r = l.reps ?? l.repsCompleted ?? l.reps_completed
        const unit = l.weightUnit ?? l.weight_unit ?? "kg"
        if (setNum != null && w != null && r != null) map[setNum] = `${w}${unit}×${r}`
      }
      setLastHistory(map)
    }).catch(() => {})
  }, [ex.name, userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const historyEntries = Object.entries(lastHistory).sort((a, b) => Number(a[0]) - Number(b[0]))

  const commitNum = (field: "sets" | "reps" | "weight", raw: string, max: number) => {
    const n = Math.min(max, Math.max(0, parseFloat(raw) || 0))
    onChange(ex.id, field, n)
    if (field === "sets") setRawSets(String(n))
    else if (field === "reps") setRawReps(String(n))
    else setRawWeight(String(n))
  }

  const inputCls = "w-full rounded-lg border border-white/[0.08] bg-[#161b22] px-2 py-1.5 text-xs text-white focus:border-[#a78bfa]/40 focus:outline-none"

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0f] p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold text-[#555555]">{index + 1}</span>
        <button onClick={() => onPick(ex.id)}
          className={cn("flex flex-1 items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs transition-colors hover:border-[#a78bfa]/40",
            ex.name ? "border-white/[0.08] bg-[#161b22] font-medium text-white" : "border-dashed border-white/[0.12] text-[#555555]")}>
          <Dumbbell className="h-3 w-3 shrink-0 text-[#555555]" />
          <span className="flex-1 truncate">{ex.name || "Select exercise…"}</span>
          {ex.isCardio && <span className="shrink-0 rounded px-1 text-[9px] font-bold uppercase" style={{ backgroundColor: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>Cardio</span>}
        </button>
        <button onClick={() => onRemove(ex.id)} className="text-[#555555] hover:text-[#ff4444]"><X className="h-3.5 w-3.5" /></button>
      </div>
      {historyEntries.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#555]">Last</span>
          {historyEntries.map(([setNum, val]) => (
            <span key={setNum} className="rounded px-1.5 py-0.5 text-[9px] font-bold text-[#888]" style={{ backgroundColor: "rgba(167,139,250,0.1)" }}>{val}</span>
          ))}
        </div>
      )}
      <div className={cn("grid gap-2", ex.isCardio ? "grid-cols-2" : "grid-cols-3")}>
        <div>
          <label className="mb-0.5 block text-[9px] text-[#555555]">Sets</label>
          <input type="number" value={rawSets} min={0} max={20}
            onChange={e => setRawSets(e.target.value)}
            onBlur={() => commitNum("sets", rawSets, 20)}
            className={inputCls} />
        </div>
        {ex.isCardio ? (
          <div>
            <label className="mb-0.5 block text-[9px] text-[#555555]">Duration (min)</label>
            <input type="number" value={rawReps} min={0} max={999}
              onChange={e => setRawReps(e.target.value)}
              onBlur={() => commitNum("reps", rawReps, 999)}
              className={inputCls} />
          </div>
        ) : (
          <>
            <div>
              <label className="mb-0.5 block text-[9px] text-[#555555]">Reps</label>
              <input type="number" value={rawReps} min={0} max={999}
                onChange={e => setRawReps(e.target.value)}
                onBlur={() => commitNum("reps", rawReps, 999)}
                className={inputCls} />
            </div>
            <div>
              <label className="mb-0.5 block text-[9px] text-[#555555]">Weight (kg)</label>
              <input type="number" value={rawWeight} min={0} max={1000}
                onChange={e => setRawWeight(e.target.value)}
                onBlur={() => commitNum("weight", rawWeight, 1000)}
                className={inputCls} />
            </div>
          </>
        )}
      </div>
      <input type="text" value={ex.notes} onChange={e => onChange(ex.id, "notes", e.target.value)} placeholder="Notes (optional)"
        className="mt-2 w-full rounded-lg border border-white/[0.06] bg-transparent px-2 py-1.5 text-[10px] text-[#888888] placeholder:text-[#333] focus:outline-none" />
    </div>
  )
}

// ── Workout Builder Sheet ─────────────────────────────────────────────────

function WorkoutBuilderSheet({ open, onOpenChange, programId, programColor, onCreated }: {
  open: boolean; onOpenChange: (v: boolean) => void
  programId: number; programColor: string; onCreated: () => void
}) {
  const user = getUserInfo()
  const [name, setName] = useState(""); const [description, setDescription] = useState("")
  const [exercises, setExercises] = useState<BuilderEx[]>([])
  const [pickerTargetId, setPickerTargetId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false); const [saveError, setSaveError] = useState("")

  useEffect(() => { if (!open) setPickerTargetId(null) }, [open])

  const addEx = () => { const id = `ex-${Date.now()}`; setExercises(p => [...p, { id, name: "", sets: 3, reps: 10, weight: 0, notes: "", isCardio: false }]); setPickerTargetId(id) }
  const updateEx = (id: string, field: keyof BuilderEx, value: string | number) => setExercises(p => p.map(e => e.id === id ? { ...e, [field]: value } : e))
  const removeEx = (id: string) => setExercises(p => p.filter(e => e.id !== id))
  const handlePickEx = ({ name: n, isCardio }: { name: string; isCardio: boolean }) => {
    if (!pickerTargetId) return
    const nid = `ex-${Date.now()}`
    setExercises(p => [...p.map(e => e.id === pickerTargetId ? { ...e, name: n, isCardio } : e), { id: nid, name: "", sets: 3, reps: 10, weight: 0, notes: "", isCardio: false }])
    setPickerTargetId(nid)
  }
  const handlePickerDone = () => { setExercises(p => p.filter(e => e.name.trim())); setPickerTargetId(null) }

  const handleSave = async () => {
    if (!name.trim() || !user?.id) return
    setSaving(true); setSaveError("")
    try {
      await apiFetch("/workout-templates", {
        method: "POST",
        body: JSON.stringify({
          userId: user.id, name: name.trim(), description: description.trim() || undefined, programId,
          exercises: exercises.filter(e => e.name.trim()).map((e, i) => ({
            name: e.name.trim(), sets: e.sets, reps: e.reps, targetWeight: e.weight,
            weightUnit: "kg", restTime: 60, notes: e.notes || "", exerciseOrder: i,
            trackRpe: false, trackRir: false, isCardio: e.isCardio,
          })),
        }),
      })
      setName(""); setDescription(""); setExercises([]); onCreated(); onOpenChange(false)
    } catch (e: unknown) { setSaveError(e instanceof Error ? e.message : "Failed to save workout") }
    finally { setSaving(false) }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
        <SheetContent side="right" className="flex w-full flex-col border-l border-white/[0.08] bg-[#0a0a0f] p-0 sm:max-w-lg"
          style={{ zIndex: 200 }} onInteractOutside={e => { if (pickerTargetId) e.preventDefault() }}>
          <SheetHeader className="flex-row items-center justify-between border-b border-white/[0.08] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${programColor}18` }}>
                <ClipboardList className="h-5 w-5" style={{ color: programColor }} />
              </div>
              <SheetTitle className="text-lg font-bold text-white">New Workout</SheetTitle>
            </div>
            {/* Sheet renders its own close button */}
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {saveError && <div className="flex items-center gap-2 rounded-xl border border-[#ff4444]/20 bg-[#ff4444]/10 px-4 py-3 text-sm text-[#ff4444]"><AlertCircle className="h-4 w-4 shrink-0" />{saveError}</div>}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#888888]">Workout Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Upper Body Strength"
                className="w-full rounded-xl border border-white/[0.08] bg-[#161b22] px-4 py-3 text-white placeholder:text-[#555555] focus:border-[#a78bfa]/50 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#888888]">Description (optional)</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the workout goals…" rows={2}
                className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#161b22] px-4 py-3 text-white placeholder:text-[#555555] focus:border-[#a78bfa]/50 focus:outline-none" />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-[#888888]">Exercises ({exercises.filter(e => e.name).length})</label>
                <button onClick={addEx} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
                  style={{ backgroundColor: `${programColor}18`, color: programColor }}><Plus className="h-3.5 w-3.5" /> Add Exercise</button>
              </div>
              {exercises.length === 0
                ? <button onClick={addEx} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.10] py-8 text-sm text-[#555555] transition-colors hover:border-[#a78bfa]/30 hover:text-[#a78bfa]"><Plus className="h-4 w-4" /> Add your first exercise</button>
                : <div className="space-y-3">
                    {exercises.map((e, i) => <BuilderRow key={e.id} ex={e} index={i} onChange={updateEx} onRemove={removeEx} onPick={id => setPickerTargetId(id)} userId={user?.id} />)}
                    <button onClick={addEx} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.08] py-3 text-sm text-[#555555] hover:border-[#a78bfa]/30 hover:text-[#a78bfa]"><Plus className="h-4 w-4" /> Add Exercise</button>
                  </div>}
            </div>
          </div>
          <div className="flex gap-3 border-t border-white/[0.08] px-6 py-4">
            <button onClick={() => onOpenChange(false)} className="flex-1 rounded-xl border border-white/[0.15] bg-[#161b22] py-3 font-medium text-white hover:bg-[#1c2128]">Cancel</button>
            <button onClick={handleSave} disabled={!name.trim() || saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-bold text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ backgroundColor: programColor }}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? "Saving…" : "Save Workout"}
            </button>
          </div>
        </SheetContent>
      </Sheet>
      <ExPickerPanel open={pickerTargetId !== null} onClose={handlePickerDone} onSelect={handlePickEx} onDone={handlePickerDone} />
    </>
  )
}

// ── Plan Builder Sheet ────────────────────────────────────────────────────

interface AvailableWorkout { id: number; name: string; programId: number; programName: string }

function PlanBuilderSheet({ open, onOpenChange, programFolderId, editPlan, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void
  programFolderId?: number; editPlan?: TrainingPlan | null; onSaved: (plan: TrainingPlan) => void
}) {
  const user = getUserInfo()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [durationWeeks, setDurationWeeks] = useState(4)
  const [isReusable, setIsReusable] = useState(true)
  const [activeDays, setActiveDays] = useState<Set<number>>(new Set())
  const [schedule, setSchedule] = useState<Partial<Record<number, DaySlot>>>({})
  const [available, setAvailable] = useState<AvailableWorkout[]>([])
  const [loadingWk, setLoadingWk] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [pickerForDay, setPickerForDay] = useState<number | null>(null)

  useEffect(() => {
    if (!open) { setPickerForDay(null); return }
    if (editPlan) {
      setName(editPlan.name); setDescription(editPlan.description || "");
      setDurationWeeks(editPlan.durationWeeks); setIsReusable(editPlan.isReusable);
      setSchedule(editPlan.schedule); setActiveDays(new Set(Object.keys(editPlan.schedule).map(Number)));
    } else {
      setName(""); setDescription(""); setDurationWeeks(4); setIsReusable(true)
      setActiveDays(new Set()); setSchedule({});
    }
    setSaveError("")
    if (!user?.id) return
    setLoadingWk(true)
    apiFetch<{ programs: ApiProgram[] }>(`/programs/users/${user.id}`)
      .then(async d => {
        const programs = programFolderId
          ? (d.programs ?? []).filter(p => p.id === programFolderId)
          : (d.programs ?? [])
        const all: AvailableWorkout[] = []
        await Promise.all(programs.map(async prog => {
          try {
            const wd = await apiFetch<{ workouts: ApiProgramWorkout[] }>(`/programs/${prog.id}/workouts`)
            for (const w of wd.workouts ?? []) all.push({ id: w.id, name: w.name, programId: prog.id, programName: prog.name })
          } catch { /* skip */ }
        }))
        setAvailable(all)
      })
      .catch(() => setAvailable([]))
      .finally(() => setLoadingWk(false))
  }, [open, editPlan]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleDay = (day: number) => {
    setActiveDays(prev => {
      const next = new Set(prev)
      if (next.has(day)) { next.delete(day); setSchedule(s => { const n = { ...s }; delete n[day]; return n }) }
      else next.add(day)
      return next
    })
  }

  const setDayWorkout = (day: number, w: AvailableWorkout) => {
    setSchedule(s => ({ ...s, [day]: { workoutId: w.id, workoutName: w.name, programId: w.programId } }))
  }

  const handlePickerSelect = (w: AvailableWorkout) => {
    if (pickerForDay !== null) setDayWorkout(pickerForDay, w)
    setPickerForDay(null)
  }

  const canSave = name.trim() && Object.keys(schedule).length > 0
  const scheduledDays = Object.keys(schedule).length

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true); setSaveError("")
    try {
      const plan: TrainingPlan = {
        id: editPlan ? editPlan.id : `plan-${Date.now()}`,
        name: name.trim(),
        description: description.trim() || undefined,
        durationWeeks,
        isReusable,
        programFolderId: editPlan ? editPlan.programFolderId : programFolderId,
        schedule,
        createdAt: editPlan ? editPlan.createdAt : new Date().toISOString(),
      }
      await upsertPlan(plan, getUserInfo()?.id || 0)
      onSaved(plan)
      onOpenChange(false)
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Failed to save plan")
    } finally { setSaving(false) }
  }

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent side="right" className="flex w-full flex-col border-l border-white/[0.08] bg-[#0a0a0f] p-0 sm:max-w-lg"
        style={{ zIndex: 200 }}
        onInteractOutside={e => { if (pickerForDay !== null) e.preventDefault() }}>
        <SheetHeader className="flex-row items-center justify-between border-b border-white/[0.08] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#a78bfa]/10">
              <CalendarDays className="h-5 w-5 text-[#a78bfa]" />
            </div>
            <SheetTitle className="text-lg font-bold text-white">{editPlan ? "Edit Training Plan" : "New Training Plan"}</SheetTitle>
          </div>
          {/* Sheet renders its own close button */}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {saveError && <div className="flex items-center gap-2 rounded-xl border border-[#ff4444]/20 bg-[#ff4444]/10 px-4 py-3 text-sm text-[#ff4444]"><AlertCircle className="h-4 w-4 shrink-0" />{saveError}</div>}

          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#888888]">Plan Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., 4-Week Hypertrophy Block"
              className="w-full rounded-xl border border-white/[0.08] bg-[#161b22] px-4 py-3 text-white placeholder:text-[#555555] focus:border-[#a78bfa]/50 focus:outline-none" />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#888888]">Description (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Goals, notes…" rows={2}
              className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#161b22] px-4 py-3 text-white placeholder:text-[#555555] focus:border-[#a78bfa]/50 focus:outline-none" />
          </div>

          {/* Duration + Reusable */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#888888]">Duration (weeks)</label>
              <select value={durationWeeks} onChange={e => setDurationWeeks(Number(e.target.value))}
                className="w-full rounded-xl border border-white/[0.08] bg-[#161b22] px-4 py-3 text-white focus:border-[#a78bfa]/50 focus:outline-none">
                {[1,2,3,4,6,8,10,12,16,20,24].map(n => <option key={n} value={n}>{n} week{n !== 1 ? "s" : ""}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#888888]">Type</label>
              <button onClick={() => setIsReusable(r => !r)}
                className={cn("flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors",
                  isReusable ? "border-[#a78bfa]/40 bg-[#a78bfa]/10" : "border-white/[0.08] bg-[#161b22]")}>
                <div>
                  <p className={cn("text-sm font-medium", isReusable ? "text-[#a78bfa]" : "text-[#888888]")}>{isReusable ? "Template" : "One-time"}</p>
                  <p className="text-[10px] text-[#555555]">{isReusable ? "Assign to many" : "Single use"}</p>
                </div>
                <div className={cn("h-4 w-4 rounded-full border-2 transition-colors", isReusable ? "border-[#a78bfa] bg-[#a78bfa]" : "border-[#555555]")} />
              </button>
            </div>
          </div>

          {/* Weekly schedule */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-medium text-[#888888]">Weekly Schedule</label>
              <span className="text-xs text-[#555555]">{scheduledDays} training day{scheduledDays !== 1 ? "s" : ""} / week</span>
            </div>

            {loadingWk && (
              <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-[#555555]" /></div>
            )}

            {!loadingWk && (
              <div className="space-y-2">
                {DAY_ORDER.map(day => {
                  const isActive = activeDays.has(day)
                  const assigned = schedule[day]
                  return (
                    <div key={day}
                      className={cn("flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
                        isActive ? "border-[#a78bfa]/30 bg-[#a78bfa]/5" : "border-white/[0.06] bg-[#161b22]")}>
                      {/* Day toggle */}
                      <button onClick={() => toggleDay(day)}
                        className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors",
                          isActive ? "bg-[#a78bfa] text-black" : "bg-[#0a0a0f] text-[#555555] hover:text-white")}>
                        {DAY_SHORT[day]}
                      </button>

                      {/* Workout picker or Rest label */}
                      {isActive ? (
                        <button
                          onClick={() => setPickerForDay(day)}
                          className={cn(
                            "flex flex-1 items-center justify-between rounded-lg border px-3 py-1.5 text-left text-sm transition-colors hover:border-[#a78bfa]/40",
                            assigned ? "border-white/[0.08] bg-[#0a0a0f] text-white" : "border-dashed border-white/[0.12] text-[#555555]",
                            pickerForDay === day && "border-[#a78bfa]/50"
                          )}
                        >
                          <span className="truncate">{assigned ? assigned.workoutName : "Select workout…"}</span>
                          <ChevronRight className="ml-1 h-3.5 w-3.5 shrink-0 text-[#555555]" />
                        </button>
                      ) : (
                        <span className="flex-1 text-sm text-[#444]">Rest</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 border-t border-white/[0.08] px-6 py-4">
          <button onClick={() => onOpenChange(false)} className="flex-1 rounded-xl border border-white/[0.15] bg-[#161b22] py-3 font-medium text-white hover:bg-[#1c2128]">Cancel</button>
          <button onClick={handleSave} disabled={!canSave || saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#a78bfa] py-3 font-bold text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? "Saving…" : "Save Plan"}
          </button>
        </div>
      </SheetContent>
    </Sheet>

    <WorkoutPickerPanel
      open={pickerForDay !== null}
      onClose={() => setPickerForDay(null)}
      onSelect={handlePickerSelect}
      available={available}
      programFolderId={programFolderId}
      onWorkoutCreated={w => setAvailable(p => [w, ...p])}
    />
    </>
  )
}

// ── Assign Plan Modal ─────────────────────────────────────────────────────

interface AssignTrainee { id: number; name: string; email: string }

function AssignPlanModal({ plan, open, onOpenChange, onAssigned }: {
  plan: TrainingPlan; open: boolean; onOpenChange: (v: boolean) => void; onAssigned: () => void
}) {
  const user = getUserInfo()
  const [trainees, setTrainees] = useState<AssignTrainee[]>([])
  const [traineeSearch, setTraineeSearch] = useState("")
  const [selectedTrainee, setSelectedTrainee] = useState<AssignTrainee | null>(null)
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0])
  const [submitting, setSubmitting] = useState(false)
  const [workoutCache, setWorkoutCache] = useState<Map<number, ApiProgramWorkout>>(new Map())
  
  // Local schedule for drag-and-drop
  const [localSchedule, setLocalSchedule] = useState<Partial<Record<number, DaySlot>>>({})
  const [draggedDay, setDraggedDay] = useState<number | null>(null)
  
  // Per-workout exercise overrides
  const [editedExercises, setEditedExercises] = useState<Map<number, ProgramExercise[]>>(new Map())
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    setSelectedTrainee(null); setTraineeSearch(""); setStartDate(new Date().toISOString().split("T")[0])
    setLocalSchedule({ ...plan.schedule }); setEditedExercises(new Map()); setExpandedWorkoutId(null)
    if (!user?.id) return
    apiFetch<AssignTrainee[] | { trainees: AssignTrainee[] }>(`/coaches/${user.id}/trainees`)
      .then(d => setTrainees(Array.isArray(d) ? d : ((d as { trainees: AssignTrainee[] }).trainees ?? [])))
      .catch(() => {})
      
    const uniqueProgramIds = [...new Set(Object.values(plan.schedule).map(s => s!.programId))]
    if (uniqueProgramIds.length > 0) {
      Promise.all(uniqueProgramIds.map(pid =>
        apiFetch<{ workouts: ApiProgramWorkout[] }>(`/programs/${pid}/workouts`).then(d => d.workouts ?? []).catch(() => [])
      )).then(results => {
        const map = new Map<number, ApiProgramWorkout>()
        for (const workouts of results) for (const w of workouts) map.set(w.id, w)
        setWorkoutCache(map)
      })
    }
  }, [open, plan]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDrop = (targetDay: number) => {
    if (draggedDay === null || draggedDay === targetDay) return
    setLocalSchedule(prev => {
      const next = { ...prev }
      const moving = next[draggedDay]
      const existing = next[targetDay]
      if (existing) { next[draggedDay] = existing; next[targetDay] = moving }
      else { next[targetDay] = moving; delete next[draggedDay] }
      return next
    })
    setDraggedDay(null)
  }

  const handleAssign = async () => {
    if (!selectedTrainee || !user?.id) return
    setSubmitting(true)
    try {
      const dates = getPlanDates(new Date(startDate + "T12:00:00"), plan.durationWeeks, localSchedule)
      for (const { date, slot } of dates) {
        const workout = workoutCache.get(slot.workoutId)
        const exSource = editedExercises.get(slot.workoutId) ?? workout?.exercises ?? []
        await apiFetch("/workout-plans", {
          method: "POST",
          body: JSON.stringify({
            traineeId: selectedTrainee.id, coachId: user.id,
            name: slot.workoutName, description: workout?.description ?? "",
            scheduledDate: date.toISOString().split("T")[0],
            exercises: exSource.map((ex, i) => ({
              name: ex.name, sets: ex.sets, reps: ex.reps, targetWeight: ex.targetWeight ?? ex.target_weight ?? 0,
              weightUnit: ex.weightUnit ?? ex.weight_unit ?? "kg", restTime: 60, notes: ex.notes ?? "", exerciseOrder: i,
              track_rpe: 0, track_rir: 0, is_cardio: (ex.is_cardio || ex.isCardio) ? 1 : 0,
            })),
          }),
        })
      }
      if (!plan.isReusable) await removePlan(plan.id)
      onAssigned(); onOpenChange(false)
    } catch (e) { alert("Failed to assign plan") } finally { setSubmitting(false) }
  }

  const filteredTrainees = trainees.filter(t => t.name.toLowerCase().includes(traineeSearch.toLowerCase()))

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
        <SheetContent side="right" className="flex w-full flex-col border-l border-white/[0.08] bg-[#0a0a0f] p-0 sm:max-w-5xl"
          style={{ zIndex: 200 }} onInteractOutside={e => { if (expandedWorkoutId) e.preventDefault() }}>
          <SheetHeader className="flex-row items-center justify-between border-b border-white/[0.08] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#a78bfa]/10">
                <CalendarDays className="h-5 w-5 text-[#a78bfa]" />
              </div>
              <div>
                <SheetTitle className="text-lg font-bold text-white">Assign & Customize Plan</SheetTitle>
                <p className="text-xs text-[#555555]">Personalize the template for this specific assignment</p>
              </div>
            </div>
          </SheetHeader>

          <div className="flex flex-1 overflow-hidden">
            {/* Left Column: Settings */}
            <div className="w-80 shrink-0 border-r border-white/[0.08] flex flex-col bg-[#161b22]">
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Select Trainee</label>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555555]" />
                    <input value={traineeSearch} onChange={e => setTraineeSearch(e.target.value)} placeholder="Search trainees…"
                      className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] py-2.5 pl-9 pr-4 text-sm text-white focus:border-[#a78bfa]/50 focus:outline-none" />
                  </div>
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {filteredTrainees.map(t => (
                      <button key={t.id} onClick={() => setSelectedTrainee(t)}
                        className={cn("flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-all",
                          selectedTrainee?.id === t.id ? "border-[#a78bfa]/40 bg-[#a78bfa]/10" : "border-white/[0.06] bg-[#0a0a0f] hover:border-white/[0.12]")}>
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#a78bfa]/30 to-[#00ffff]/20 text-[10px] font-bold text-[#a78bfa]">
                          {t.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="truncate text-sm font-medium text-white">{t.name}</span>
                        {selectedTrainee?.id === t.id && <Check className="ml-auto h-4 w-4 text-[#a78bfa]" />}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Start Date</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-4 py-2.5 text-white focus:border-[#a78bfa]/50 focus:outline-none [color-scheme:dark]" />
                  <p className="mt-1.5 text-xs text-[#555555] leading-snug">Plan starts from the week containing this date. Workouts scheduled on days before it will be skipped for the first week.</p>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0f] p-4">
                  <p className="text-sm font-medium text-white">Plan Details</p>
                  <p className="mt-1 text-xs text-[#888888]">Name: {plan.name}</p>
                  <p className="text-xs text-[#888888]">Duration: {plan.durationWeeks} Weeks</p>
                </div>
              </div>
              <div className="border-t border-white/[0.08] p-5">
                <button onClick={handleAssign} disabled={!selectedTrainee || submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#a78bfa] py-3 font-bold text-black hover:opacity-90 disabled:opacity-40">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? "Assigning…" : "Confirm Assignment"}
                </button>
              </div>
            </div>

            {/* Right Column: Weekly Timeline */}
            <div className="flex-1 flex flex-col bg-[#0a0a0f] overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-bold text-white mb-1">Weekly Timeline Template</h3>
                <p className="text-sm text-[#888888] mb-6">Drag workouts between days, or click a card to tweak its exercises specifically for {selectedTrainee?.name || "this assignment"}.</p>
                
                <div className="grid grid-cols-7 gap-3">
                  {DAY_ORDER.map(day => {
                    const slot = localSchedule[day]
                    const isDraggedOver = draggedDay !== null && draggedDay !== day
                    return (
                      <div key={day} className="flex flex-col gap-2"
                        onDragOver={e => { e.preventDefault() }}
                        onDrop={() => handleDrop(day)}>
                        <div className="rounded-t-lg bg-[#161b22] py-2 text-center border-b border-[#a78bfa]/20">
                          <span className="text-xs font-bold text-[#a78bfa]">{DAY_SHORT[day]}</span>
                        </div>
                        <div className={cn("min-h-[120px] rounded-xl border border-white/[0.08] p-2 transition-colors",
                          !slot ? "bg-[#161b22]/50 border-dashed" : "bg-[#161b22]",
                          isDraggedOver && "border-[#a78bfa]/50 bg-[#a78bfa]/5")}>
                          
                          {slot ? (
                            <div draggable onDragStart={() => setDraggedDay(day)} onDragEnd={() => setDraggedDay(null)}
                              onClick={() => setExpandedWorkoutId(slot.workoutId)}
                              className="group relative cursor-pointer rounded-lg border border-white/[0.05] bg-[#1c2128] p-3 shadow-md hover:border-[#a78bfa]/40 hover:bg-[#22272e] transition-all">
                              <div className="mb-2 flex items-center justify-between">
                                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#a78bfa]/10">
                                  <Dumbbell className="h-3 w-3 text-[#a78bfa]" />
                                </div>
                                {editedExercises.has(slot.workoutId) && (
                                  <span className="rounded bg-[#00ff88]/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-[#00ff88]">Edited</span>
                                )}
                              </div>
                              <p className="text-sm font-bold text-white leading-tight">{slot.workoutName}</p>
                              <p className="mt-1 text-[10px] text-[#888888]">Click to edit</p>
                            </div>
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-center opacity-50">
                              <span className="text-[10px] text-[#555555]">Rest Day</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Editor Panel for Selected Workout */}
      {expandedWorkoutId && (() => {
        const workout = workoutCache.get(expandedWorkoutId)
        if (!workout) return null
        const exList = editedExercises.get(expandedWorkoutId) ?? workout.exercises ?? []
        return (
          <Sheet open={true} onOpenChange={() => setExpandedWorkoutId(null)} modal={false}>
            <SheetContent side="right" className="flex w-full flex-col border-l border-white/[0.08] bg-[#161b22] p-0 sm:max-w-md" style={{ zIndex: 210 }}>
              <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4 bg-[#0a0a0f]">
                <div>
                  <h3 className="text-base font-bold text-white">Customize: {workout.name}</h3>
                  <p className="text-xs text-[#a78bfa]">Changes apply only to this assignment</p>
                </div>
                <button onClick={() => setExpandedWorkoutId(null)} className="text-[#888888] hover:text-white"><X className="h-5 w-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {exList.map((ex, i) => (
                  <div key={i} className="rounded-xl border border-white/[0.08] bg-[#0a0a0f] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-bold text-white">{ex.name}</p>
                      <button onClick={() => {
                        const updated = exList.filter((_, xi) => xi !== i)
                        setEditedExercises(m => { const n = new Map(m); n.set(expandedWorkoutId, updated); return n })
                      }} className="text-[#555555] hover:text-[#ff4444]"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Sets", field: "sets" as const, value: ex.sets },
                        { label: "Reps", field: "reps" as const, value: ex.reps },
                        { label: "Weight (kg)", field: "targetWeight" as const, value: ex.targetWeight ?? ex.target_weight ?? 0 },
                      ].map(({ label, field, value }) => (
                        <div key={field}>
                          <label className="mb-1 block text-[10px] uppercase text-[#555555]">{label}</label>
                          <input type="number" defaultValue={value as number} min={0}
                            onChange={e => {
                              const updated = exList.map((x, xi) => xi === i ? { ...x, [field]: parseFloat(e.target.value) || 0 } : x)
                              setEditedExercises(m => { const n = new Map(m); n.set(expandedWorkoutId, updated); return n })
                            }}
                            className="w-full rounded-lg border border-white/[0.08] bg-[#161b22] px-3 py-2 text-sm text-white focus:border-[#a78bfa]/50 focus:outline-none" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/[0.08] p-5 bg-[#0a0a0f]">
                <button onClick={() => setExpandedWorkoutId(null)} className="w-full rounded-xl bg-[#a78bfa] py-3 font-bold text-black hover:opacity-90">Done Editing</button>
              </div>
            </SheetContent>
          </Sheet>
        )
      })()}
    </>
  )
}

// ── Plan Card ─────────────────────────────────────────────────────────────

function PlanCard({ plan, onDelete, onAssign, onEdit }: {
  plan: TrainingPlan; onDelete: (id: string) => void; onAssign: (plan: TrainingPlan) => void; onEdit?: (plan: TrainingPlan) => void
}) {
  const scheduledDays = Object.keys(plan.schedule).map(Number).sort()
  const totalWorkouts = scheduledDays.length * plan.durationWeeks

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-5 transition-all hover:border-white/[0.15]"
      style={{ borderLeftWidth: "4px", borderLeftColor: "#a78bfa" }}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#a78bfa]/10">
            <CalendarDays className="h-5 w-5 text-[#a78bfa]" />
          </div>
          <div>
            <p className="font-bold text-white">{plan.name}</p>
            <p className="text-xs text-[#555555]">{plan.durationWeeks} week{plan.durationWeeks !== 1 ? "s" : ""} · {totalWorkouts} workouts total</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className={cn("rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
            plan.isReusable ? "bg-[#a78bfa]/15 text-[#a78bfa]" : "bg-white/[0.06] text-[#555555]")}>
            {plan.isReusable ? "Template" : "One-time"}
          </span>
        </div>
      </div>

      {plan.description && <p className="mb-3 text-sm text-[#888888]">{plan.description}</p>}

      {/* Day pills */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {DAY_ORDER.map(day => {
          const slot = plan.schedule[day]
          return (
            <div key={day}
              className={cn("rounded-lg px-2.5 py-1 text-xs font-medium",
                slot ? "bg-[#a78bfa]/15 text-[#a78bfa]" : "bg-white/[0.04] text-[#333]")}>
              <span>{DAY_SHORT[day]}</span>
              {slot && <span className="ml-1 font-normal opacity-70 max-w-[6rem] inline-block truncate align-bottom">{slot.workoutName}</span>}
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => onAssign(plan)}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#a78bfa]/30 py-2 text-sm font-medium text-[#a78bfa] transition-colors hover:bg-[#a78bfa]/10">
          <Users className="h-4 w-4" /> Assign to Trainee
        </button>
        {onEdit && (
          <button onClick={() => onEdit(plan)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] text-[#555555] transition-colors hover:border-[#a78bfa]/30 hover:text-[#a78bfa]">
            <Pencil className="h-4 w-4" />
          </button>
        )}
        <button onClick={() => onDelete(plan.id)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] text-[#555555] transition-colors hover:border-[#ff4444]/30 hover:text-[#ff4444]">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// ── Folder Detail View ────────────────────────────────────────────────────

type FolderTab = "workouts" | "plans"

function FolderDetailView({ program, onBack, onWorkoutCountChange }: {
  program: ApiProgram; onBack: () => void; onWorkoutCountChange: (id: number, count: number) => void
}) {
  const color = program.hex_color ?? "#a78bfa"
  const [activeTab, setActiveTab] = useState<FolderTab>("workouts")

  // Workouts tab state
  const [workouts, setWorkouts] = useState<ApiProgramWorkout[]>([])
  const [wLoading, setWLoading] = useState(false)
  const [wError, setWError] = useState("")
  const [builderOpen, setBuilderOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [assigningWorkout, setAssigningWorkout] = useState<ApiProgramWorkout | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // Plans tab state
  const [plans, setPlans] = useState<TrainingPlan[]>([])
  const [planBuilderOpen, setPlanBuilderOpen] = useState(false)
  const [assigningPlan, setAssigningPlan] = useState<TrainingPlan | null>(null)
  const [editingPlan, setEditingPlan] = useState<TrainingPlan | null>(null)

  const fetchWorkouts = useCallback(async () => {
    setWLoading(true); setWError("")
    try {
      const data = await apiFetch<{ workouts: ApiProgramWorkout[] }>(`/programs/${program.id}/workouts`)
      const list = data.workouts ?? []; setWorkouts(list); onWorkoutCountChange(program.id, list.length)
    } catch (e: unknown) { setWError(e instanceof Error ? e.message : "Failed to load workouts") }
    finally { setWLoading(false) }
  }, [program.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadPlans = useCallback(async () => {
    const uid = getUserInfo()?.id
    if (!uid) return
    const all = await loadAllPlans(uid);
    setPlans(all.filter(p => p.programFolderId === program.id))
  }, [program.id])

  useEffect(() => { fetchWorkouts(); loadPlans() }, [fetchWorkouts, loadPlans])

  const handleDeleteWorkout = async (id: number) => {
    setDeletingId(id)
    try {
      await apiFetch(`/programs/${program.id}/workouts/${id}`, { method: "DELETE" })
      const updated = workouts.filter(w => w.id !== id); setWorkouts(updated); onWorkoutCountChange(program.id, updated.length)
    } catch { } finally { setDeletingId(null) }
  }

  const handleDeletePlan = async (id: string) => { await removePlan(id); loadPlans() }

  const toAssignWorkout = (w: ApiProgramWorkout) => ({
    id: w.id, name: w.name, description: w.description,
    exercises: (w.exercises ?? []).map(ex => ({
      id: ex.id ?? 0, name: ex.name, sets: ex.sets, reps: ex.reps,
      targetWeight: ex.targetWeight ?? ex.target_weight,
      weightUnit: ex.weightUnit ?? ex.weight_unit ?? "kg", notes: ex.notes,
      is_cardio: (ex.is_cardio ?? ex.isCardio) ? 1 : 0, track_rpe: ex.track_rpe ? 1 : 0, track_rir: ex.track_rir ? 1 : 0,
    }))
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#161b22] text-[#888888] transition-colors hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}18` }}>
          <FolderOpen className="h-5 w-5" style={{ color }} />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">{program.name}</h2>
          <p className="text-sm text-[#555555]">{workouts.length} workout{workouts.length !== 1 ? "s" : ""} · {plans.length} plan{plans.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-white/[0.08] bg-[#0a0a0f] p-1">
        {([["workouts", "Workouts", LayoutList], ["plans", "Plans", CalendarDays]] as [FolderTab, string, typeof LayoutList][]).map(([tab, label, Icon]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn("flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors",
              activeTab === tab ? "bg-[#161b22] text-white" : "text-[#555555] hover:text-[#888888]")}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {/* ── Workouts tab ── */}
      {activeTab === "workouts" && (
        <>
          <div className="flex justify-end">
            <button onClick={() => setBuilderOpen(true)}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-black transition-colors hover:opacity-90"
              style={{ backgroundColor: color }}>
              <Plus className="h-4 w-4" /> Add Workout
            </button>
          </div>
          {wError && <div className="flex items-center gap-2 rounded-xl border border-[#ff4444]/20 bg-[#ff4444]/10 px-4 py-3 text-sm text-[#ff4444]"><AlertCircle className="h-4 w-4 shrink-0" />{wError}<button onClick={fetchWorkouts} className="ml-auto text-xs underline">Retry</button></div>}
          {wLoading ? <div className="flex flex-col items-center justify-center py-20"><Loader2 className="mb-3 h-8 w-8 animate-spin text-[#555555]" /></div>
            : workouts.length === 0 && !wError ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] py-16">
                <ClipboardList className="mb-3 h-10 w-10 text-[#333]" />
                <p className="text-sm font-medium text-[#888888]">No workouts yet</p>
                <button onClick={() => setBuilderOpen(true)} className="mt-4 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-black hover:opacity-90" style={{ backgroundColor: color }}><Plus className="h-4 w-4" /> Add Workout</button>
              </div>
            ) : (
              <div className="space-y-3">
                {workouts.map(workout => {
                  const isExpanded = expandedId === workout.id
                  return (
                    <div key={workout.id} className="rounded-2xl border border-white/[0.08] bg-[#161b22] overflow-hidden" style={{ borderLeftWidth: "4px", borderLeftColor: color }}>
                      <button onClick={() => setExpandedId(isExpanded ? null : workout.id)}
                        className="flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-white/[0.02]">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}18` }}>
                          <Dumbbell className="h-5 w-5" style={{ color }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-white">{workout.name}</p>
                          <p className="text-xs text-[#555555]">{(workout.exercises ?? []).length} exercise{(workout.exercises ?? []).length !== 1 ? "s" : ""}</p>
                        </div>
                        <ChevronRight className={cn("h-4 w-4 shrink-0 text-[#555555] transition-transform", isExpanded && "rotate-90")} />
                      </button>
                      {isExpanded && (
                        <div className="border-t border-white/[0.06] px-4 py-3">
                          {workout.description && <p className="mb-3 text-sm text-[#888888]">{workout.description}</p>}
                          {(workout.exercises ?? []).length > 0 && (
                            <div className="mb-3 space-y-1.5">
                              {(workout.exercises ?? []).map((ex, idx) => (
                                <div key={idx} className="flex items-center justify-between rounded-lg bg-[#0a0a0f] px-3 py-2">
                                  <span className="text-sm text-white">{idx + 1}. {ex.name}</span>
                                  <span className="text-xs text-[#555555]">{ex.sets}×{ex.reps}{(ex.targetWeight ?? ex.target_weight) ? ` @ ${ex.targetWeight ?? ex.target_weight}kg` : ""}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <button onClick={() => setAssigningWorkout(workout)}
                              className="flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors hover:opacity-80"
                              style={{ borderColor: `${color}40`, color }}>
                              Assign to Trainee
                            </button>
                            <button onClick={() => handleDeleteWorkout(workout.id)} disabled={deletingId === workout.id}
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] text-[#555555] transition-colors hover:border-[#ff4444]/30 hover:text-[#ff4444] disabled:opacity-40">
                              {deletingId === workout.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          <WorkoutBuilderSheet open={builderOpen} onOpenChange={setBuilderOpen} programId={program.id} programColor={color} onCreated={fetchWorkouts} />
          <AssignWorkoutModal open={assigningWorkout !== null} onOpenChange={v => { if (!v) setAssigningWorkout(null) }}
            preselectedWorkout={assigningWorkout ? toAssignWorkout(assigningWorkout) : undefined} onAssigned={() => setAssigningWorkout(null)} />
        </>
      )}

      {/* ── Plans tab ── */}
      {activeTab === "plans" && (
        <>
          <div className="flex justify-end">
            <button onClick={() => setPlanBuilderOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-[#a78bfa] px-4 py-2.5 text-sm font-bold text-black transition-colors hover:opacity-90">
              <Plus className="h-4 w-4" /> New Plan
            </button>
          </div>
          {plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] py-16">
              <CalendarDays className="mb-3 h-10 w-10 text-[#333]" />
              <p className="text-sm font-medium text-[#888888]">No plans yet</p>
              <p className="mt-1 text-xs text-[#555555]">Create a multi-day training plan using workouts from this folder</p>
              <button onClick={() => setPlanBuilderOpen(true)} className="mt-4 flex items-center gap-2 rounded-xl bg-[#a78bfa] px-4 py-2 text-sm font-bold text-black hover:opacity-90"><Plus className="h-4 w-4" /> New Plan</button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {plans.map(plan => <PlanCard key={plan.id} plan={plan} onDelete={handleDeletePlan} onAssign={p => setAssigningPlan(p)} onEdit={p => { setEditingPlan(p); setPlanBuilderOpen(true); }} />)}
            </div>
          )}
          <PlanBuilderSheet open={planBuilderOpen} onOpenChange={setPlanBuilderOpen} programFolderId={program.id} editPlan={editingPlan}
            onSaved={() => { setPlanBuilderOpen(false); loadPlans(); setEditingPlan(null); }} />
          {assigningPlan && <AssignPlanModal plan={assigningPlan} open={assigningPlan !== null} onOpenChange={v => { if (!v) setAssigningPlan(null) }} onAssigned={() => setAssigningPlan(null)} />}
        </>
      )}
    </div>
  )
}

// ── Folder Card ───────────────────────────────────────────────────────────

function FolderCard({ program, onClick, onDelete }: {
  program: ApiProgram; onClick: () => void; onDelete: (id: number) => void
}) {
  const color = program.hex_color ?? "#a78bfa"
  return (
    <button onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-2xl border border-white/[0.08] bg-[#161b22] px-5 py-4 text-left transition-all hover:border-white/[0.15] hover:bg-[#1c222b]"
      style={{ borderLeftWidth: "4px", borderLeftColor: color }}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}18` }}>
        <Folder className="h-5 w-5" style={{ color }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-bold text-white">{program.name}</p>
          <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: `${color}18`, color }}>
            {program.workout_count ?? 0} workout{(program.workout_count ?? 0) !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button onClick={e => { e.stopPropagation(); onDelete(program.id) }}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#555555] opacity-0 transition-all group-hover:opacity-100 hover:bg-[#ff4444]/10 hover:text-[#ff4444]">
          <Trash2 className="h-4 w-4" />
        </button>
        <ChevronRight className="h-4 w-4 text-[#555555] transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  )
}

// ── New Program Dialog ────────────────────────────────────────────────────

function NewProgramDialog({ open, onOpenChange, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void
}) {
  const user = getUserInfo()
  const [name, setName] = useState(""); const [color, setColor] = useState(folderColors[0])
  const [saving, setSaving] = useState(false); const [error, setError] = useState("")

  const handleSave = async () => {
    if (!name.trim() || !user?.id) return
    setSaving(true); setError("")
    try {
      await apiFetch("/programs", { method: "POST", body: JSON.stringify({ userId: user.id, name: name.trim(), hexColor: color }) })
      setName(""); setColor(folderColors[0]); onSaved(); onOpenChange(false)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to create program") }
    finally { setSaving(false) }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => onOpenChange(false)}>
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.12] bg-[#161b22] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">New Program Folder</h3>
          <button onClick={() => onOpenChange(false)} className="text-[#555555] hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        {error && <p className="mb-3 rounded-xl border border-[#ff4444]/20 bg-[#ff4444]/10 px-3 py-2 text-sm text-[#ff4444]">{error}</p>}
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#888888]">Folder Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleSave() }}
              placeholder="e.g., Hypertrophy Block"
              className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-4 py-2.5 text-white placeholder:text-[#555555] focus:border-[#a78bfa]/50 focus:outline-none" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#888888]">Color</label>
            <div className="flex flex-wrap gap-2">
              {folderColors.map(c => <button key={c} onClick={() => setColor(c)} className="h-7 w-7 rounded-full transition-transform hover:scale-110"
                style={{ backgroundColor: c, outline: color === c ? `3px solid ${c}` : "none", outlineOffset: "2px" }} />)}
            </div>
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <button onClick={() => onOpenChange(false)} className="flex-1 rounded-xl border border-white/[0.15] bg-[#0a0a0f] py-2.5 font-medium text-white hover:bg-[#161b22]">Cancel</button>
          <button onClick={handleSave} disabled={!name.trim() || saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 font-bold text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: color }}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? "Creating…" : "Create Folder"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ProgramsView ─────────────────────────────────────────────────────

export function ProgramsView() {
  const user = getUserInfo()
  const [programs, setPrograms] = useState<ApiProgram[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [openProgramId, setOpenProgramId] = useState<number | null>(null)
  const [newProgramOpen, setNewProgramOpen] = useState(false)

  // Standalone plans (no folder)
  const [standalonePlans, setStandalonePlans] = useState<TrainingPlan[]>([])
  const [planBuilderOpen, setPlanBuilderOpen] = useState(false)
  const [assigningPlan, setAssigningPlan] = useState<TrainingPlan | null>(null)
  const [editingStandalonePlan, setEditingStandalonePlan] = useState<TrainingPlan | null>(null)

  const loadStandalonePlans = useCallback(async () => {
    if (!user?.id) return
    const all = await loadAllPlans(user.id);
    setStandalonePlans(all.filter(p => !p.programFolderId))
  }, [user?.id])

  const fetchPrograms = useCallback(async () => {
    if (!user?.id) return
    setLoading(true); setError("")
    try {
      const data = await apiFetch<{ programs: ApiProgram[] }>(`/programs/users/${user.id}`)
      setPrograms(data.programs ?? [])
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to load programs") }
    finally { setLoading(false) }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchPrograms(); loadStandalonePlans() }, [fetchPrograms, loadStandalonePlans])

  const handleDeleteProgram = async (id: number) => {
    try { await apiFetch(`/programs/${id}`, { method: "DELETE" }); setPrograms(p => p.filter(pr => pr.id !== id)); if (openProgramId === id) setOpenProgramId(null) } catch { }
  }
  const handleDeletePlan = async (id: string) => { await removePlan(id); loadStandalonePlans() }
  const updateWorkoutCount = (id: number, count: number) => setPrograms(p => p.map(pr => pr.id === id ? { ...pr, workout_count: count } : pr))

  if (openProgramId !== null) {
    const prog = programs.find(p => p.id === openProgramId)
    if (prog) return <FolderDetailView program={prog} onBack={() => setOpenProgramId(null)} onWorkoutCountChange={updateWorkoutCount} />
  }

  return (
    <div className="space-y-10">
      {/* ── Folders ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Program Folders</h2>
            <p className="mt-0.5 text-sm text-[#555555]">Organize workouts into folders, then build plans from them</p>
          </div>
          <button onClick={() => setNewProgramOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-[#a78bfa]/40 bg-[#a78bfa]/10 px-4 py-2.5 text-sm font-medium text-[#a78bfa] transition-colors hover:bg-[#a78bfa]/20">
            <Plus className="h-4 w-4" /> New Folder
          </button>
        </div>
        {error && <div className="flex items-center justify-between rounded-xl border border-[#ff4444]/20 bg-[#ff4444]/10 px-4 py-3 text-sm text-[#ff4444]"><div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div><button onClick={fetchPrograms} className="text-xs underline">Retry</button></div>}
        {loading ? <div className="flex flex-col items-center justify-center py-16"><Loader2 className="mb-3 h-8 w-8 animate-spin text-[#555555]" /></div>
          : programs.length === 0 && !error ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] py-14">
              <Folder className="mb-3 h-10 w-10 text-[#333]" />
              <p className="text-sm font-medium text-[#888888]">No folders yet</p>
              <button onClick={() => setNewProgramOpen(true)} className="mt-4 flex items-center gap-2 rounded-xl border border-[#a78bfa]/40 bg-[#a78bfa]/10 px-4 py-2 text-sm font-medium text-[#a78bfa] hover:bg-[#a78bfa]/20"><Plus className="h-4 w-4" /> New Folder</button>
            </div>
          ) : (
            <div className="space-y-3">
              {programs.map(p => <FolderCard key={p.id} program={p} onClick={() => setOpenProgramId(p.id)} onDelete={handleDeleteProgram} />)}
            </div>
          )}
      </div>

      {/* ── Divider ── */}
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-white/[0.06]" />
        <span className="text-xs font-bold uppercase tracking-wider text-[#333]">Standalone Plans</span>
        <div className="h-px flex-1 bg-white/[0.06]" />
      </div>

      {/* ── Standalone Plans ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Training Plans</h2>
            <p className="mt-0.5 text-sm text-[#555555]">Multi-day schedules that can be assigned to any trainee</p>
          </div>
          <button onClick={() => { setEditingStandalonePlan(null); setPlanBuilderOpen(true); }}
            className="flex items-center gap-2 rounded-xl bg-[#a78bfa] px-4 py-2.5 text-sm font-bold text-black transition-colors hover:opacity-90">
            <Plus className="h-4 w-4" /> New Plan
          </button>
        </div>
        {standalonePlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] py-14">
            <CalendarDays className="mb-3 h-10 w-10 text-[#333]" />
            <p className="text-sm font-medium text-[#888888]">No standalone plans yet</p>
            <p className="mt-1 text-xs text-[#555555]">Plans inside folders also appear in the folder's Plans tab</p>
            <button onClick={() => { setEditingStandalonePlan(null); setPlanBuilderOpen(true); }} className="mt-4 flex items-center gap-2 rounded-xl bg-[#a78bfa] px-4 py-2 text-sm font-bold text-black hover:opacity-90"><Plus className="h-4 w-4" /> New Plan</button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {standalonePlans.map(plan => <PlanCard key={plan.id} plan={plan} onDelete={handleDeletePlan} onAssign={p => setAssigningPlan(p)} onEdit={p => { setEditingStandalonePlan(p); setPlanBuilderOpen(true); }} />)}
          </div>
        )}
      </div>

      <NewProgramDialog open={newProgramOpen} onOpenChange={setNewProgramOpen} onSaved={fetchPrograms} />
      <PlanBuilderSheet open={planBuilderOpen} onOpenChange={(v) => { setPlanBuilderOpen(v); if (!v) setEditingStandalonePlan(null); }} editPlan={editingStandalonePlan} onSaved={() => { setPlanBuilderOpen(false); loadStandalonePlans(); setEditingStandalonePlan(null); }} />
      {assigningPlan && <AssignPlanModal plan={assigningPlan} open={assigningPlan !== null} onOpenChange={v => { if (!v) setAssigningPlan(null) }} onAssigned={() => setAssigningPlan(null)} />}
    </div>
  )
}
