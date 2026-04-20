"use client"

import { useState, useEffect, useCallback } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2, X, Search, Info } from "lucide-react"
import { apiFetch, getUserInfo } from "@/lib/api"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────

interface DailySummary {
  total_calories: number
  total_proteins: number
  total_carbs: number
  total_fats: number
  calorie_goal: number
  protein_goal: number
  carb_goal: number
  fat_goal: number
}

interface MealLog {
  id: number
  food_id: number
  food_name: string
  meal_type: string
  serving_quantity: number
  serving_unit: string
  calories: number
  proteins: number
  carbs: number
  fats: number
  logged_at: string
}

interface Food {
  id: number
  name: string
  calories: number
  proteins: number
  carbs: number
  fats: number
  serving_size: number
  serving_unit: string
}

interface StatDay {
  summary_date: string
  total_calories: number
  total_proteins: number
  total_carbs: number
  total_fats: number
  calorie_goal: number
}

// ── Helpers ───────────────────────────────────────────────────────────────

function toLocalISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function MacroBar({ label, current, goal, color }: { label: string; current: number; goal: number; color: string }) {
  const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-bold text-white">{label}</span>
        <span style={{ color }}>{Math.round(current)}g / {Math.round(goal)}g</span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.06]">
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"]
const ACTIVITY_LEVELS = [
  { val: 1.2,   label: "Sedentary" },
  { val: 1.375, label: "Light" },
  { val: 1.55,  label: "Moderate" },
  { val: 1.725, label: "Active" },
  { val: 1.9,   label: "Very Active" },
]

// ── Add Food Modal ─────────────────────────────────────────────────────────

function AddFoodModal({ date, onClose, onAdded }: { date: string; onClose: () => void; onAdded: () => void }) {
  const [search, setSearch] = useState("")
  const [foods, setFoods] = useState<Food[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<Food | null>(null)
  const [qty, setQty] = useState("1")
  const [mealType, setMealType] = useState("breakfast")
  const [logging, setLogging] = useState(false)
  const [error, setError] = useState("")

  const doSearch = useCallback(async () => {
    if (!search.trim()) return
    setSearching(true)
    try {
      const res = await apiFetch<Food[]>(`/nutrition/foods?search=${encodeURIComponent(search)}`)
      const fetched = Array.isArray(res) ? res : []
      const term = search.toLowerCase()
      setFoods(fetched.filter(f => f.name.toLowerCase().includes(term)))
    } catch { setFoods([]) }
    finally { setSearching(false) }
  }, [search])

  useEffect(() => {
    if (!search.trim()) { setFoods([]); return }
    const t = setTimeout(doSearch, 400)
    return () => clearTimeout(t)
  }, [search, doSearch])

  const handleLog = async () => {
    if (!selected) return
    const quantity = parseFloat(qty)
    if (!quantity || quantity <= 0) { setError("Enter a valid quantity."); return }
    setLogging(true)
    setError("")
    try {
      await apiFetch("/nutrition/meals", {
        method: "POST",
        body: JSON.stringify({ food_id: selected.id, meal_type: mealType, serving_quantity: quantity, date }),
      })
      onAdded()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to log meal.")
    } finally { setLogging(false) }
  }

  const ratio = parseFloat(qty) || 1
  const preview = selected ? {
    cal: (selected.calories * ratio).toFixed(0),
    p: (selected.proteins * ratio).toFixed(1),
    c: (selected.carbs * ratio).toFixed(1),
    f: (selected.fats * ratio).toFixed(1),
  } : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl border border-[#00ffff]/30 bg-[#161b22]">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <h3 className="text-lg font-bold text-white">Log Food</h3>
          <button onClick={onClose} className="text-[#555555] hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          {/* Search */}
          {!selected && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555555]" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search foods..."
                  className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#444] focus:border-[#00ffff]/40 focus:outline-none"
                />
              </div>
              {searching && <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-[#555555]" /></div>}
              {!searching && foods.length > 0 && (
                <div className="space-y-1 max-h-56 overflow-y-auto">
                  {foods.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setSelected(f)}
                      className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-colors hover:bg-white/[0.05]"
                    >
                      <div>
                        <p className="text-sm font-bold text-white">{f.name}</p>
                        <p className="text-xs text-[#555555]">{f.calories} kcal · {f.serving_size}{f.serving_unit}</p>
                      </div>
                      <Plus className="h-4 w-4 text-[#00ffff]" />
                    </button>
                  ))}
                </div>
              )}
              {!searching && search.length > 1 && foods.length === 0 && (
                <p className="text-center text-sm text-[#555555] py-4">No foods found.</p>
              )}
            </>
          )}

          {/* Selected food */}
          {selected && (
            <>
              <div className="rounded-xl border border-[#00ffff]/20 bg-[#0a0a0f] px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">{selected.name}</p>
                  <p className="text-xs text-[#555555]">{selected.calories} kcal per {selected.serving_size}{selected.serving_unit}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-[#555555] hover:text-white"><X className="h-4 w-4" /></button>
              </div>

              {/* Meal type */}
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#555555]">Meal</p>
                <div className="flex gap-2 flex-wrap">
                  {MEAL_TYPES.map(m => (
                    <button
                      key={m}
                      onClick={() => setMealType(m)}
                      className={cn("rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-colors",
                        mealType === m ? "bg-[#00ffff]/15 text-[#00ffff]" : "bg-white/[0.05] text-[#888888] hover:text-white"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#555555]">Servings</p>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-4 py-2.5 text-sm text-white focus:border-[#00ffff]/40 focus:outline-none"
                />
              </div>

              {/* Preview */}
              {preview && (
                <div className="grid grid-cols-4 gap-2 rounded-xl bg-white/[0.03] p-3 text-center">
                  {[["Kcal", preview.cal, "#00ffff"], ["Protein", `${preview.p}g`, "#00ff88"], ["Carbs", `${preview.c}g`, "#ffd700"], ["Fats", `${preview.f}g`, "#ff9944"]].map(([l, v, c]) => (
                    <div key={l as string}>
                      <p className="text-xs text-[#555555]">{l}</p>
                      <p className="text-sm font-bold" style={{ color: c as string }}>{v}</p>
                    </div>
                  ))}
                </div>
              )}

              {error && <p className="text-xs text-[#ff4444]">{error}</p>}

              <button
                onClick={handleLog}
                disabled={logging}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00ffff] py-3 text-sm font-bold text-black disabled:opacity-60"
              >
                {logging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Log Food
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Daily Tab ─────────────────────────────────────────────────────────────

function DailyTab({ targetUserId, readonly }: { targetUserId?: number; readonly?: boolean }) {
  const today = toLocalISO(new Date())
  const [date, setDate] = useState(today)
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [meals, setMeals] = useState<MealLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddFood, setShowAddFood] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = targetUserId ? `?userId=${targetUserId}` : ""
      const res = await apiFetch<{ summary: DailySummary; meals: MealLog[] }>(`/nutrition/summary/${date}${qs}`)
      
      const fetchedMeals = res.meals ?? []
      let newSummary = res.summary ? { ...res.summary } : { 
        total_calories: 0, total_proteins: 0, total_carbs: 0, total_fats: 0, 
        calorie_goal: 2000, protein_goal: 150, carb_goal: 250, fat_goal: 70 
      } as DailySummary
      
      // Dynamically calculate the totals from the meal list to ensure perfect sync
      newSummary.total_calories = fetchedMeals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0)
      newSummary.total_proteins = fetchedMeals.reduce((sum, m) => sum + (Number(m.proteins) || 0), 0)
      newSummary.total_carbs = fetchedMeals.reduce((sum, m) => sum + (Number(m.carbs) || 0), 0)
      newSummary.total_fats = fetchedMeals.reduce((sum, m) => sum + (Number(m.fats) || 0), 0)

      setSummary(newSummary)
      setMeals(fetchedMeals)
    } catch {
      setSummary(null); setMeals([])
    } finally { setLoading(false) }
  }, [date, targetUserId])

  useEffect(() => { load() }, [load])

  const shiftDate = (days: number) => {
    const d = new Date(date + "T12:00:00")
    d.setDate(d.getDate() + days)
    setDate(toLocalISO(d))
  }

  const handleDelete = async (id: number) => {
    setDeleting(id)
    try {
      await apiFetch(`/nutrition/meals/${id}`, { method: "DELETE" })
      load()
    } catch { } finally { setDeleting(null) }
  }

  const calPct = summary && summary.calorie_goal > 0
    ? Math.min((summary.total_calories / summary.calorie_goal) * 100, 100)
    : 0

  const grouped = MEAL_TYPES.reduce<Record<string, MealLog[]>>((acc, t) => {
    acc[t] = meals.filter(m => m.meal_type === t)
    return acc
  }, {})

  const isToday = date === today

  return (
    <div className="space-y-5">
      {/* Date nav */}
      <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#161b22] px-4 py-2.5">
        <button onClick={() => shiftDate(-1)} className="text-[#555555] hover:text-white transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="text-sm font-bold text-white">
          {isToday ? "Today" : new Date(date + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
        </p>
        <button onClick={() => shiftDate(1)} disabled={isToday} className="text-[#555555] hover:text-white disabled:opacity-30 transition-colors">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#00ffff]" /></div>
      ) : (
        <>
          {/* Calorie ring + macros */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-white">{Math.round(summary?.total_calories ?? 0)}</p>
                <p className="text-xs text-[#555555]">of {Math.round(summary?.calorie_goal ?? 2000)} kcal goal</p>
              </div>
              {/* Circular progress */}
              <div className="relative h-16 w-16">
                <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke={calPct >= 100 ? "#ff4444" : "#00ffff"}
                    strokeWidth="3"
                    strokeDasharray={`${calPct} 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{Math.round(calPct)}%</span>
              </div>
            </div>
            <div className="space-y-3">
              <MacroBar label="Protein" current={summary?.total_proteins ?? 0} goal={summary?.protein_goal ?? 150} color="#00ff88" />
              <MacroBar label="Carbs"   current={summary?.total_carbs ?? 0}    goal={summary?.carb_goal ?? 250}    color="#ffd700" />
              <MacroBar label="Fats"    current={summary?.total_fats ?? 0}      goal={summary?.fat_goal ?? 70}      color="#ff9944" />
            </div>
          </div>

          {/* Meal groups */}
          {MEAL_TYPES.map(type => {
            const group = grouped[type]
            return (
              <div key={type} className="rounded-2xl border border-white/[0.08] bg-[#161b22] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#888888] capitalize">{type}</p>
                  <p className="text-xs text-[#555555]">
                    {Math.round(group.reduce((s, m) => s + m.calories, 0))} kcal
                  </p>
                </div>
                {group.length === 0 ? (
                  <p className="px-4 py-3 text-xs italic text-[#444444]">Nothing logged yet.</p>
                ) : (
                  group.map(m => (
                    <div key={m.id} className="flex items-center justify-between border-b border-white/[0.04] px-4 py-3 last:border-b-0">
                      <div>
                        <p className="text-sm font-bold text-white">{m.food_name}</p>
                        <p className="text-xs text-[#555555]">{m.serving_quantity} serving · {Math.round(m.calories)} kcal · P:{Math.round(m.proteins)}g C:{Math.round(m.carbs)}g F:{Math.round(m.fats)}g</p>
                      </div>
                      {!readonly && (
                        <button
                          onClick={() => handleDelete(m.id)}
                          disabled={deleting === m.id}
                          className="ml-3 shrink-0 text-[#444444] hover:text-[#ff4444] transition-colors"
                        >
                          {deleting === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )
          })}

          {!readonly && (
            <button
              onClick={() => setShowAddFood(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#00ffff]/20 bg-[#00ffff]/5 py-3 text-sm font-bold text-[#00ffff] transition-colors hover:bg-[#00ffff]/10"
            >
              <Plus className="h-4 w-4" /> Log Food
            </button>
          )}
        </>
      )}

      {showAddFood && (
        <AddFoodModal date={date} onClose={() => setShowAddFood(false)} onAdded={load} />
      )}
    </div>
  )
}

// ── Goals Tab ─────────────────────────────────────────────────────────────

function GoalsTab({ targetUserId, readonly }: { targetUserId?: number; readonly?: boolean }) {
  const user = getUserInfo() as (ReturnType<typeof getUserInfo> & { weight?: number; height?: number; age?: number; sex?: string }) | null
  const today = toLocalISO(new Date())

  const [calories, setCalories] = useState("2000")
  const [protein, setProtein] = useState("150")
  const [carbs, setCarbs] = useState("250")
  const [fats, setFats] = useState("70")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  // Calculator
  const [activityLevel, setActivityLevel] = useState(1.55)
  const [goalType, setGoalType] = useState<"cut" | "maintain" | "bulk">("maintain")
  const [results, setResults] = useState<{ bmr: number; tdee: number; target: number; adjustment: number; macros: { protein: number; carbs: number; fats: number } } | null>(null)
  const [showInfo, setShowInfo] = useState(false)

  useEffect(() => {
    const qs = targetUserId ? `?userId=${targetUserId}` : ""
    apiFetch<{ summary: DailySummary }>(`/nutrition/summary/${today}${qs}`)
      .then(d => {
        if (d.summary) {
          if (d.summary.calorie_goal) setCalories(String(d.summary.calorie_goal))
          if (d.summary.protein_goal) setProtein(String(d.summary.protein_goal))
          if (d.summary.carb_goal) setCarbs(String(d.summary.carb_goal))
          if (d.summary.fat_goal) setFats(String(d.summary.fat_goal))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [today, targetUserId])

  const calculate = () => {
    const weight = parseFloat(String(user?.weight ?? ""))
    const height = parseFloat(String(user?.height ?? ""))
    const age = parseInt(String(user?.age ?? ""))
    const sex = String(user?.sex ?? "")
    if (!weight || !height || !age || !sex) {
      setError("Complete your profile (weight, height, age, sex) to use the calculator.")
      return
    }
    setError("")
    let bmr = 10 * weight + 6.25 * height - 5 * age
    bmr += sex.toLowerCase() === "male" || sex === "M" ? 5 : -161
    const tdee = bmr * activityLevel
    let target = tdee
    if (goalType === "cut") target -= 500
    if (goalType === "bulk") target += 500
    const adjustment = target - tdee
    setResults({
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      target: Math.round(target),
      adjustment: Math.round(adjustment),
      macros: {
        protein: Math.round((target * 0.3) / 4),
        carbs: Math.round((target * 0.4) / 4),
        fats: Math.round((target * 0.3) / 9),
      },
    })
  }

  const applyResults = () => {
    if (!results) return
    setCalories(String(results.target))
    setProtein(String(results.macros.protein))
    setCarbs(String(results.macros.carbs))
    setFats(String(results.macros.fats))
    setResults(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setSuccess("")
    setError("")
    try {
      await apiFetch("/nutrition/goals", {
        method: "PUT",
        body: JSON.stringify({
          date: today,
          calorie_goal: parseFloat(calories),
          protein_goal: parseFloat(protein),
          carb_goal: parseFloat(carbs),
          fat_goal: parseFloat(fats),
        }),
      })
      setSuccess("Goals saved successfully.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save goals.")
    } finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#00ffff]" /></div>

  return (
    <div className="space-y-5">
      {/* Calculator — only for own nutrition */}
      {!readonly && <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-bold text-white">BMR / TDEE Calculator</p>
          <button onClick={() => setShowInfo(!showInfo)} className="text-[#555555] hover:text-[#00ffff]"><Info className="h-4 w-4" /></button>
        </div>

        {showInfo && (
          <div className="rounded-xl bg-[#0a0a0f] p-3 text-xs text-[#888888] space-y-1 leading-relaxed">
            <p><span className="text-[#00ffff] font-bold">BMR</span> — Basal Metabolic Rate using Mifflin-St Jeor equation.</p>
            <p><span className="text-[#00ffff] font-bold">TDEE</span> — Total Daily Energy Expenditure = BMR × activity factor.</p>
            <p><span className="text-[#00ffff] font-bold">Cut</span> −500 kcal · <span className="text-[#00ffff] font-bold">Maintain</span> = TDEE · <span className="text-[#00ffff] font-bold">Bulk</span> +500 kcal</p>
          </div>
        )}

        {/* Activity level */}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#555555]">Activity Level</p>
          <div className="flex gap-1 flex-wrap">
            {ACTIVITY_LEVELS.map(a => (
              <button
                key={a.val}
                onClick={() => setActivityLevel(a.val)}
                className={cn("flex-1 min-w-0 rounded-lg px-2 py-1.5 text-[10px] font-bold transition-colors whitespace-nowrap",
                  activityLevel === a.val ? "bg-[#00ffff]/15 text-[#00ffff]" : "bg-white/[0.04] text-[#555555] hover:text-white"
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Goal type */}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#555555]">Goal</p>
          <div className="flex gap-2">
            {(["cut", "maintain", "bulk"] as const).map(g => (
              <button
                key={g}
                onClick={() => setGoalType(g)}
                className={cn("flex-1 rounded-xl border py-2.5 text-sm font-bold capitalize transition-all",
                  goalType === g ? "border-[#00ffff]/40 bg-[#00ffff]/10 text-[#00ffff]" : "border-white/[0.08] text-[#555555] hover:text-white"
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={calculate}
          className="w-full rounded-xl bg-[#00ffff]/10 border border-[#00ffff]/20 py-2.5 text-sm font-bold text-[#00ffff] hover:bg-[#00ffff]/15 transition-colors"
        >
          Calculate
        </button>

        {results && (
          <div className="rounded-xl bg-[#0a0a0f] p-4 space-y-2">
            {[["BMR", results.bmr, "kcal"], ["TDEE", results.tdee, "kcal"], ["Target", results.target, "kcal"]].map(([l, v, u]) => (
              <div key={l as string} className="flex justify-between text-sm">
                <span className="text-[#888888]">{l}</span>
                <span className="font-bold text-white">{v} <span className="text-[#555555] font-normal text-xs">{u}</span></span>
              </div>
            ))}
            <div className="flex justify-between text-sm border-t border-white/[0.06] pt-2">
              <span className="text-[#888888]">Adjustment</span>
              <span className="font-bold" style={{ color: (results.adjustment as number) >= 0 ? "#00ff88" : "#ff4444" }}>
                {(results.adjustment as number) > 0 ? "+" : ""}{results.adjustment} kcal
              </span>
            </div>
            <div className="flex justify-between text-xs pt-1 text-[#555555]">
              <span>P: {results.macros.protein}g</span>
              <span>C: {results.macros.carbs}g</span>
              <span>F: {results.macros.fats}g</span>
            </div>
            <button
              onClick={applyResults}
              className="w-full rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/20 py-2 text-sm font-bold text-[#00ff88] hover:bg-[#00ff88]/15 transition-colors"
            >
              ✓ Apply to Goals
            </button>
          </div>
        )}
      </div>}

      {/* Goals display / edit */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-5 space-y-4">
        <p className="font-bold text-white">Daily Goals</p>
        {[
          { label: "Calories (kcal)", val: calories, set: setCalories, color: "#00ffff" },
          { label: "Protein (g)",     val: protein,  set: setProtein,  color: "#00ff88" },
          { label: "Carbs (g)",       val: carbs,    set: setCarbs,    color: "#ffd700" },
          { label: "Fats (g)",        val: fats,     set: setFats,     color: "#ff9944" },
        ].map(({ label, val, set, color }) => (
          <div key={label}>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wider" style={{ color }}>{label}</p>
            {readonly ? (
              <p className="rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-4 py-2.5 text-sm text-white">{val || "—"}</p>
            ) : (
              <input
                type="number"
                value={val}
                onChange={e => set(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00ffff]/40"
              />
            )}
          </div>
        ))}

        {!readonly && (
          <>
            {error && <p className="text-xs text-[#ff4444]">{error}</p>}
            {success && <p className="text-xs text-[#00ff88]">{success}</p>}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00ffff] py-3 text-sm font-bold text-black disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Goals
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Stats Tab ─────────────────────────────────────────────────────────────

function StatsTab({ targetUserId }: { targetUserId?: number }) {
  const [range, setRange] = useState<"week" | "month">("week")
  const [offset, setOffset] = useState(0)
  const [data, setData] = useState<StatDay[]>([])
  const [loading, setLoading] = useState(false)
  const [chartType, setChartType] = useState<"calories" | "macros">("calories")

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      let startDate: Date, endDate: Date
      if (range === "week") {
        const now = new Date()
        now.setDate(now.getDate() + offset * 7)
        const dow = now.getDay()
        const toMon = dow === 0 ? 6 : dow - 1
        startDate = new Date(now)
        startDate.setDate(now.getDate() - toMon)
        endDate = new Date(startDate)
        endDate.setDate(startDate.getDate() + 6)
      } else {
        const now = new Date()
        now.setMonth(now.getMonth() + offset)
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      }
      const userParam = targetUserId ? `&userId=${targetUserId}` : ""
      const res = await apiFetch<StatDay[]>(`/nutrition/stats?startDate=${toLocalISO(startDate)}&endDate=${toLocalISO(endDate)}${userParam}`)
      setData(Array.isArray(res) ? res : [])
    } catch { setData([]) }
    finally { setLoading(false) }
  }, [range, offset, targetUserId])

  useEffect(() => { fetchStats() }, [fetchStats])

  // Build filled chart data
  const chartData = (() => {
    let startDate: Date, days: number
    if (range === "week") {
      const now = new Date()
      now.setDate(now.getDate() + offset * 7)
      const dow = now.getDay()
      const toMon = dow === 0 ? 6 : dow - 1
      startDate = new Date(now)
      startDate.setDate(now.getDate() - toMon)
      days = 7
    } else {
      const now = new Date()
      now.setMonth(now.getMonth() + offset)
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      days = endDate.getDate()
    }
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(startDate)
      d.setDate(startDate.getDate() + i)
      const ds = toLocalISO(d)
      const found = data.find(r => r.summary_date?.split("T")[0] === ds)
      const label = range === "week"
        ? d.toLocaleDateString(undefined, { weekday: "short" })
        : i % 5 === 0 || i === days - 1 ? String(i + 1) : ""
      return {
        label,
        calories: Number(found?.total_calories ?? 0),
        protein: Number(found?.total_proteins ?? 0),
        carbs: Number(found?.total_carbs ?? 0),
        fats: Number(found?.total_fats ?? 0),
        goal: Number(found?.calorie_goal ?? 0),
      }
    })
  })()

  const periodLabel = (() => {
    if (range === "week") {
      const now = new Date()
      now.setDate(now.getDate() + offset * 7)
      const dow = now.getDay()
      const toMon = dow === 0 ? 6 : dow - 1
      const mon = new Date(now); mon.setDate(now.getDate() - toMon)
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
      return `${mon.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${sun.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
    }
    const now = new Date(); now.setMonth(now.getMonth() + offset)
    return now.toLocaleDateString(undefined, { month: "long", year: "numeric" })
  })()

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1 rounded-xl bg-white/[0.04] p-1">
          {(["week", "month"] as const).map(r => (
            <button key={r} onClick={() => { setRange(r); setOffset(0) }}
              className={cn("flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition-all",
                range === r ? "bg-[#00ffff]/15 text-[#00ffff]" : "text-[#888888] hover:text-white"
              )}>
              {r}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setOffset(o => o - 1)} className="rounded-lg p-1.5 text-[#555555] hover:text-white transition-colors"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => setOffset(o => Math.min(o + 1, 0))} disabled={offset === 0} className="rounded-lg p-1.5 text-[#555555] hover:text-white disabled:opacity-30 transition-colors"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      <p className="text-center text-xs font-bold text-[#555555]">{periodLabel}</p>

      {/* Chart type toggle */}
      <div className="flex gap-2">
        {(["calories", "macros"] as const).map(t => (
          <button key={t} onClick={() => setChartType(t)}
            className={cn("rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-colors",
              chartType === t ? "bg-[#00ffff]/15 text-[#00ffff]" : "bg-white/[0.04] text-[#555555] hover:text-white"
            )}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#00ffff]" /></div>
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-5">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barSize={range === "week" ? 20 : 8}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="label" tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: "#0a0a0f", border: "1px solid rgba(0,255,255,0.2)", borderRadius: 8, color: "#fff" }} />
              {chartType === "calories" ? (
                <Bar dataKey="calories" fill="#00ffff" radius={[3, 3, 0, 0]} name="Calories" />
              ) : (
                <>
                  <Bar dataKey="protein" fill="#00ff88" radius={[3, 3, 0, 0]} name="Protein (g)" />
                  <Bar dataKey="carbs"   fill="#ffd700" radius={[3, 3, 0, 0]} name="Carbs (g)" />
                  <Bar dataKey="fats"    fill="#ff9944" radius={[3, 3, 0, 0]} name="Fats (g)" />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// ── Main View ─────────────────────────────────────────────────────────────

export function NutritionView({ targetUser }: { targetUser?: { id: number; name: string } | null }) {
  const isTrainee = !!targetUser
  const [activeTab, setActiveTab] = useState<"daily" | "goals" | "stats">(isTrainee ? "stats" : "daily")

  // Reset to stats when switching between subjects
  useEffect(() => {
    setActiveTab(isTrainee ? "stats" : "daily")
  }, [targetUser?.id, isTrainee])

  const tabs = ["daily", "goals", "stats"] as const

  return (
    <div className="space-y-6">
      {/* Trainee banner */}
      {targetUser && (
        <div className="flex items-center gap-3 rounded-xl border border-[#00ffff]/20 bg-[#00ffff]/5 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#00ffff]/30 to-[#00ff88]/30 text-sm font-bold text-[#00ffff]">
            {targetUser.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-white">Viewing {targetUser.name}&apos;s Nutrition</p>
            <p className="text-xs text-[#555555]">Read-only — trainee manages their own food log</p>
          </div>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 rounded-lg py-2.5 text-sm font-semibold capitalize transition-all",
              activeTab === tab ? "bg-[#00ffff]/15 text-[#00ffff]" : "text-[#888888] hover:text-white"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "daily" && <DailyTab targetUserId={targetUser?.id} readonly={isTrainee} />}
      {activeTab === "goals" && <GoalsTab targetUserId={targetUser?.id} readonly={isTrainee} />}
      {activeTab === "stats" && <StatsTab targetUserId={targetUser?.id} />}
    </div>
  )
}
