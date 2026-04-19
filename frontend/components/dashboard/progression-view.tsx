"use client"

import { useState, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Dumbbell, X, ChevronDown, Loader2, Weight, User, Users } from "lucide-react"
import { apiFetch, getUserInfo } from "@/lib/api"
import { cn } from "@/lib/utils"

interface ProgressionPoint {
  date?: string
  completed_at?: string
  weight?: number
  reps?: number
  oneRepMax?: number
  one_rep_max?: number
}

interface WeightLog {
  logged_at?: string
  date?: string
  weight: number | string
}

interface Trainee {
  id: number
  name: string
}

// Epley formula tooltip
function InfoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#00ffff]/30 bg-[#161b22] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">How is 1RM Calculated?</h3>
          <button onClick={onClose} className="text-[#888888] hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-3 text-sm text-[#aaaaaa] leading-relaxed">
          The <span className="font-bold text-[#00ffff]">Epley Formula</span> is used to estimate your one-rep max.
        </p>
        <p className="mb-2 text-sm text-[#888888] leading-relaxed">
          <span className="font-bold text-[#00ffff]">Step 1: Best set</span> — the heaviest set logged for that exercise on each session date is selected.
        </p>
        <p className="mb-2 text-sm text-[#888888] leading-relaxed">
          <span className="font-bold text-[#00ffff]">Step 2: Apply Epley</span> — the formula calculates how much you could lift for a single rep.
        </p>
        <div className="my-3 rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-4 py-3 text-center font-mono text-sm text-white">
          1RM = weight × (1 + reps / 30)
        </div>
        <p className="text-sm text-[#888888] leading-relaxed">
          <span className="font-bold text-[#00ffff]">Step 3: Track progress</span> — the 1RM for each date is plotted to show your strength progression over time.
        </p>
      </div>
    </div>
  )
}

export function ProgressionView({ defaultSubject }: { defaultSubject?: Trainee | null }) {
  const user = getUserInfo()

  // Subject selection (null = viewing own progression)
  const [trainees, setTrainees] = useState<Trainee[]>([])
  const [loadingTrainees, setLoadingTrainees] = useState(true)
  const [selectedSubject, setSelectedSubject] = useState<Trainee | null>(defaultSubject ?? null)
  const [showSubjectPicker, setShowSubjectPicker] = useState(false)
  const [subjectSearch, setSubjectSearch] = useState("")

  const targetUserId = selectedSubject?.id ?? user?.id

  const [activeTab, setActiveTab] = useState<"1RM" | "weight">("1RM")

  // 1RM tab
  const [loadingExercises, setLoadingExercises] = useState(false)
  const [exercises, setExercises] = useState<string[]>([])
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null)
  const [progressionData, setProgressionData] = useState<ProgressionPoint[]>([])
  const [loadingProgression, setLoadingProgression] = useState(false)
  const [showExercisePicker, setShowExercisePicker] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [exerciseSearch, setExerciseSearch] = useState("")

  // Body weight tab
  const [weightHistory, setWeightHistory] = useState<WeightLog[]>([])
  const [loadingWeight, setLoadingWeight] = useState(false)

  // Load trainees list for subject picker
  useEffect(() => {
    if (!user?.id) return
    apiFetch<{ trainees: Trainee[] }>(`/coaches/${user.id}/trainees`)
      .then(d => setTrainees(d.trainees ?? []))
      .catch(() => setTrainees([]))
      .finally(() => setLoadingTrainees(false))
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // When subject changes, reset all data and reload exercises
  useEffect(() => {
    if (!targetUserId) return
    setExercises([])
    setSelectedExercise(null)
    setProgressionData([])
    setWeightHistory([])
    setLoadingExercises(true)
    apiFetch<{ exercises: string[] }>(`/workout-plans/users/${targetUserId}/exercises`)
      .then(d => {
        const list = d.exercises ?? []
        setExercises(list)
        if (list.length > 0) setSelectedExercise(list[0])
        else setLoadingExercises(false)
      })
      .catch(() => setLoadingExercises(false))
  }, [targetUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedExercise || !targetUserId) return
    setLoadingProgression(true)
    apiFetch<{ progression: ProgressionPoint[] }>(
      `/workout-plans/users/${targetUserId}/progression?exercise=${encodeURIComponent(selectedExercise)}`
    )
      .then(d => {
        const sorted = (d.progression ?? []).sort(
          (a, b) => new Date(a.date || a.completed_at || "").getTime() - new Date(b.date || b.completed_at || "").getTime()
        )
        setProgressionData(sorted)
      })
      .catch(() => setProgressionData([]))
      .finally(() => { setLoadingProgression(false); setLoadingExercises(false) })
  }, [selectedExercise, targetUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab !== "weight" || !targetUserId || weightHistory.length > 0) return
    setLoadingWeight(true)
    apiFetch<{ history?: WeightLog[]; data?: WeightLog[] }>(`/users/${targetUserId}/weight-history`)
      .then(d => setWeightHistory(d.history ?? d.data ?? []))
      .catch(() => setWeightHistory([]))
      .finally(() => setLoadingWeight(false))
  }, [activeTab, targetUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Chart data
  const chartPoints = progressionData.slice(-10).map(p => ({
    date: (() => {
      const d = new Date(p.date || p.completed_at || "")
      return `${d.getDate()}/${d.getMonth() + 1}`
    })(),
    "1RM": p.oneRepMax ?? p.one_rep_max ?? 0,
  }))

  const weightChartPoints = weightHistory.slice(-10).map(w => ({
    date: (() => {
      const d = new Date(w.logged_at || w.date || "")
      return `${d.getDate()}/${d.getMonth() + 1}`
    })(),
    kg: parseFloat(String(w.weight)),
  }))

  const filteredExercises = exercises.filter(e =>
    e.toLowerCase().includes(exerciseSearch.toLowerCase())
  )

  const filteredSubjects = trainees.filter(t =>
    t.name.toLowerCase().includes(subjectSearch.toLowerCase())
  )

  const subjectLabel = selectedSubject ? selectedSubject.name : "My Progression"

  return (
    <div className="space-y-6">
      {/* Subject picker */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#555555]">Viewing</p>
        <button
          onClick={() => setShowSubjectPicker(true)}
          className="flex w-full items-center justify-between rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-4 py-3 text-left transition-colors hover:border-[#00ffff]/40"
        >
          <span className="flex items-center gap-2.5">
            {selectedSubject ? (
              <Users className="h-4 w-4 text-[#00ffff]" />
            ) : (
              <User className="h-4 w-4 text-[#00ffff]" />
            )}
            <span className="text-sm font-semibold text-white">{subjectLabel}</span>
          </span>
          <ChevronDown className="h-4 w-4 text-[#555555]" />
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1">
        {(["1RM", "weight"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all",
              activeTab === tab
                ? "bg-[#00ffff]/15 text-[#00ffff]"
                : "text-[#888888] hover:text-white"
            )}
          >
            {tab === "1RM" ? "1RM History" : "Body Weight"}
          </button>
        ))}
      </div>

      {/* ── 1RM Tab ── */}
      {activeTab === "1RM" && (
        <div className="space-y-4">
          {/* Exercise selector */}
          <div>
            <p className="mb-2 text-sm text-[#888888]">Select exercise</p>
            <button
              onClick={() => setShowExercisePicker(true)}
              className="flex w-full items-center justify-between rounded-xl border border-white/[0.08] bg-[#161b22] px-4 py-3 text-left text-sm font-semibold text-white transition-colors hover:border-[#00ffff]/40"
            >
              <span className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-[#555555]" />
                {loadingExercises ? "Loading exercises..." : (selectedExercise ?? "No exercises found")}
              </span>
              <ChevronDown className="h-4 w-4 text-[#555555]" />
            </button>
          </div>

          {/* Chart */}
          {loadingProgression ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-[#00ffff]" />
            </div>
          ) : chartPoints.length > 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-5">
              <div className="mb-4 flex items-center gap-2">
                <p className="font-semibold text-white">{selectedExercise} — 1RM History</p>
                <button
                  onClick={() => setShowInfo(true)}
                  className="flex h-5 w-5 items-center justify-center rounded-full border border-[#00ffff]/40 text-[10px] font-bold italic text-[#00ffff]"
                >
                  i
                </button>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartPoints}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} unit="kg" width={45} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0a0a0f", border: "1px solid rgba(0,255,255,0.2)", borderRadius: 8, color: "#fff" }}
                    formatter={(v: number) => [`${v}kg`, "Est. 1RM"]}
                  />
                  <Line type="monotone" dataKey="1RM" stroke="#00ffff" strokeWidth={2} dot={{ r: 4, fill: "#00ffff", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            !loadingExercises && (
              <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] py-16 text-center">
                <Dumbbell className="mx-auto mb-3 h-8 w-8 text-[#333]" />
                <p className="text-sm italic text-[#555555]">No progression data yet for this exercise.</p>
              </div>
            )
          )}

          {/* Recent logs */}
          {progressionData.length > 0 && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-5">
              <p className="mb-4 text-xs font-bold uppercase tracking-wider text-[#555555]">Recent Logs</p>
              <div className="space-y-2">
                {progressionData.slice().reverse().slice(0, 5).map((log, i) => {
                  const date = new Date(log.date || log.completed_at || "")
                  const orm = log.oneRepMax ?? log.one_rep_max
                  return (
                    <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                      <span className="text-sm text-[#888888]">{date.toLocaleDateString()}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-white">{log.weight}kg × {log.reps}</span>
                        {orm != null && (
                          <span className="text-sm font-bold text-[#00ffff]">1RM: {orm}kg</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Body Weight Tab ── */}
      {activeTab === "weight" && (
        <div className="space-y-4">
          {loadingWeight ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-[#00ffff]" />
            </div>
          ) : weightChartPoints.length > 0 ? (
            <>
              <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-5">
                <p className="mb-4 font-semibold text-white">Body Weight History</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={weightChartPoints}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} unit="kg" width={45} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0a0a0f", border: "1px solid rgba(0,255,255,0.2)", borderRadius: 8, color: "#fff" }}
                      formatter={(v: number) => [`${v}kg`, "Weight"]}
                    />
                    <Line type="monotone" dataKey="kg" stroke="#00ffff" strokeWidth={2} dot={{ r: 4, fill: "#00ffff", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-5">
                <p className="mb-4 text-xs font-bold uppercase tracking-wider text-[#555555]">Recent Logs</p>
                <div className="space-y-2">
                  {weightHistory.slice().reverse().slice(0, 10).map((w, i) => {
                    const date = new Date(w.logged_at || w.date || "")
                    return (
                      <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                        <span className="text-sm text-[#888888]">{date.toLocaleDateString()}</span>
                        <span className="text-sm font-bold text-white">{w.weight} kg</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] py-16 text-center">
              <Weight className="mx-auto mb-3 h-8 w-8 text-[#333]" />
              <p className="text-sm italic text-[#555555]">No body weight entries logged yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Subject picker modal */}
      {showSubjectPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-[#00ffff]/30 bg-[#161b22]">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
              <h3 className="text-lg font-bold text-white">View Progression</h3>
              <button onClick={() => { setShowSubjectPicker(false); setSubjectSearch("") }} className="text-[#ff4444] hover:text-[#ff6666]">
                Close
              </button>
            </div>
            <div className="p-3">
              <input
                type="text"
                value={subjectSearch}
                onChange={e => setSubjectSearch(e.target.value)}
                placeholder="Search trainees..."
                className="w-full rounded-lg border border-white/[0.08] bg-[#0a0a0f] px-3 py-2 text-sm text-white placeholder:text-[#555] focus:border-[#00ffff]/40 focus:outline-none"
              />
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-white/[0.05]">
              {/* Myself option */}
              <button
                onClick={() => { setSelectedSubject(null); setShowSubjectPicker(false); setSubjectSearch("") }}
                className="flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-white/[0.04]"
              >
                <span className={cn("flex items-center gap-2.5 text-sm", selectedSubject === null ? "font-bold text-[#00ffff]" : "text-[#cccccc]")}>
                  <User className="h-4 w-4" />
                  My Progression
                </span>
                {selectedSubject === null && <span className="text-[#00ffff]">✓</span>}
              </button>

              {loadingTrainees ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-[#555555]" />
                </div>
              ) : filteredSubjects.length === 0 && subjectSearch ? (
                <p className="px-5 py-6 text-center text-sm text-[#555555]">No trainees found.</p>
              ) : (
                filteredSubjects.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedSubject(t); setShowSubjectPicker(false); setSubjectSearch("") }}
                    className="flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-white/[0.04]"
                  >
                    <span className={cn("flex items-center gap-2.5 text-sm", selectedSubject?.id === t.id ? "font-bold text-[#00ffff]" : "text-[#cccccc]")}>
                      <Users className="h-4 w-4" />
                      {t.name}
                    </span>
                    {selectedSubject?.id === t.id && <span className="text-[#00ffff]">✓</span>}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Exercise picker modal */}
      {showExercisePicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-[#00ffff]/30 bg-[#161b22]">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
              <h3 className="text-lg font-bold text-white">Choose Exercise</h3>
              <button onClick={() => setShowExercisePicker(false)} className="text-[#ff4444] hover:text-[#ff6666]">
                Close
              </button>
            </div>
            <div className="p-3">
              <input
                type="text"
                value={exerciseSearch}
                onChange={e => setExerciseSearch(e.target.value)}
                placeholder="Search..."
                className="w-full rounded-lg border border-white/[0.08] bg-[#0a0a0f] px-3 py-2 text-sm text-white placeholder:text-[#555] focus:border-[#00ffff]/40 focus:outline-none"
              />
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-white/[0.05]">
              {filteredExercises.map(ex => (
                <button
                  key={ex}
                  onClick={() => { setSelectedExercise(ex); setShowExercisePicker(false); setExerciseSearch("") }}
                  className="flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-white/[0.04]"
                >
                  <span className={cn("text-sm", selectedExercise === ex ? "font-bold text-[#00ffff]" : "text-[#cccccc]")}>{ex}</span>
                  {selectedExercise === ex && <span className="text-[#00ffff]">✓</span>}
                </button>
              ))}
              {filteredExercises.length === 0 && (
                <p className="px-5 py-6 text-center text-sm text-[#555555]">No exercises found.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <InfoModal open={showInfo} onClose={() => setShowInfo(false)} />
    </div>
  )
}
