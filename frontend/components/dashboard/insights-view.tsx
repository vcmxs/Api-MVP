"use client"

import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, Trophy, Loader2 } from "lucide-react"
import { apiFetch, getUserInfo } from "@/lib/api"

// ── Week helpers ──────────────────────────────────────────────────────────

function getWeekRange() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const start = new Date(now)
  start.setDate(diff)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function getLastWeekRange() {
  const { start: thisStart } = getWeekRange()
  const end = new Date(thisStart)
  end.setMilliseconds(-1)
  const start = new Date(end)
  start.setDate(start.getDate() - 6)
  start.setHours(0, 0, 0, 0)
  return { start, end }
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k"
  return String(Math.round(n))
}

// ── Sub-components ────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#555555]">
      {children}
    </h3>
  )
}

function StatCard({
  value,
  label,
  accentColor,
  change,
  borderPosition = "left",
  loading,
}: {
  value: string
  label: string
  accentColor: string
  change?: { value: string; trend: "up" | "down" }
  borderPosition?: "left" | "top"
  loading?: boolean
}) {
  return (
    <div
      className="relative rounded-2xl border border-white/[0.08] bg-[#161b22] p-5"
      style={{
        borderLeftWidth: borderPosition === "left" ? "4px" : undefined,
        borderLeftColor: borderPosition === "left" ? accentColor : undefined,
        borderTopWidth: borderPosition === "top" ? "4px" : undefined,
        borderTopColor: borderPosition === "top" ? accentColor : undefined,
      }}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-[#555555]" />
      ) : (
        <>
          <p className="text-3xl font-light text-white">{value}</p>
          <p className="mt-1 text-sm text-[#888888]">{label}</p>
          {change && (
            <div className="mt-2 flex items-center gap-1">
              {change.trend === "up" ? (
                <TrendingUp className="h-4 w-4 text-[#00ff88]" />
              ) : (
                <TrendingDown className="h-4 w-4 text-[#ff4444]" />
              )}
              <span className="text-sm font-medium" style={{ color: change.trend === "up" ? "#00ff88" : "#ff4444" }}>
                {change.value}
              </span>
              <span className="text-sm text-[#555555]">vs last week</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ClientRankRow({ rank, name, initials, workoutCount }: {
  rank: number
  name: string
  initials: string
  workoutCount: number
}) {
  return (
    <div className="flex items-center gap-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#13131a] text-sm font-bold text-[#888888]">
        {rank}
      </div>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#00ffff] to-[#00ff88]">
        <span className="text-sm font-bold text-black">{initials}</span>
      </div>
      <span className="flex-1 font-medium text-white">{name}</span>
      <span className="rounded-full px-3 py-1 text-sm font-medium" style={{ backgroundColor: "rgba(0,255,136,0.15)", color: "#00ff88" }}>
        {workoutCount} done
      </span>
    </div>
  )
}

// ── Main View ─────────────────────────────────────────────────────────────

interface ActiveClient { id: number; name: string; initials: string; workoutCount: number }

export function InsightsView() {
  // Revenue
  const [weekRevenue, setWeekRevenue] = useState<number | null>(null)
  const [revGrowth, setRevGrowth] = useState<{ value: string; trend: "up" | "down" } | null>(null)
  const [loadingRevenue, setLoadingRevenue] = useState(true)

  // Coach personal performance
  const [coachReps, setCoachReps] = useState<number | null>(null)
  const [coachVolume, setCoachVolume] = useState<number | null>(null)
  const [coachWorkouts, setCoachWorkouts] = useState<number | null>(null)
  const [loadingCoach, setLoadingCoach] = useState(true)

  // Client performance
  const [activeClientsThisWeek, setActiveClientsThisWeek] = useState<number | null>(null)
  const [totalTrainees, setTotalTrainees] = useState<number | null>(null)
  const [clientWorkouts, setClientWorkouts] = useState<number | null>(null)
  const [loadingClients, setLoadingClients] = useState(true)

  // Top trainees
  const [topTrainees, setTopTrainees] = useState<ActiveClient[]>([])

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    const user = getUserInfo()
    if (!user?.id) {
      setLoadingRevenue(false); setLoadingCoach(false); setLoadingClients(false)
      return
    }
    const { start, end } = getWeekRange()
    const { start: lastStart, end: lastEnd } = getLastWeekRange()

    // ── 1. Trainees list ────────────────────────────────────────────────
    let trainees: { id: number; name: string }[] = []
    try {
      const d = await apiFetch<{ trainees: { id: number; name: string }[] }>(`/coaches/${user.id}/trainees`)
      trainees = d.trainees ?? []
      setTotalTrainees(trainees.length)
    } catch { setTotalTrainees(0) }

    // ── 2. Revenue (parallel per trainee) ──────────────────────────────
    let thisWeekRev = 0
    let lastWeekRev = 0
    await Promise.allSettled(
      trainees.map(t =>
        apiFetch<{ id: number; amount: string; payment_date: string }[]>(
          `/users/coaches/${user.id}/trainees/${t.id}/history`
        ).then(payments => {
          if (!Array.isArray(payments)) return
          for (const p of payments) {
            const d = new Date(p.payment_date)
            if (d >= start && d <= end) thisWeekRev += parseFloat(p.amount || "0")
            if (d >= lastStart && d <= lastEnd) lastWeekRev += parseFloat(p.amount || "0")
          }
        }).catch(() => {})
      )
    )
    setWeekRevenue(thisWeekRev)
    const growth = lastWeekRev > 0
      ? ((thisWeekRev - lastWeekRev) / lastWeekRev) * 100
      : thisWeekRev > 0 ? 100 : 0
    setRevGrowth({ value: `${growth >= 0 ? "+" : ""}${growth.toFixed(0)}%`, trend: growth >= 0 ? "up" : "down" })
    setLoadingRevenue(false)

    // ── 3. Coach personal stats ─────────────────────────────────────────
    try {
      const plansData = await apiFetch<{ workoutPlans: { id: number; status: string; completedAt?: string; updated_at?: string; createdAt?: string }[] }>(
        `/trainees/${user.id}/workout-plans`
      )
      const plans = plansData.workoutPlans ?? []
      const completedThisWeek = plans.filter(p => {
        if ((p.status ?? "").toLowerCase() !== "completed") return false
        const d = new Date(p.completedAt || p.updated_at || p.createdAt || "")
        return d >= start && d <= end
      })
      setCoachWorkouts(completedThisWeek.length)

      let totalReps = 0, totalVolume = 0
      await Promise.allSettled(
        completedThisWeek.slice(0, 8).map(plan =>
          apiFetch<{ exercises?: { logs?: { reps_completed?: number; repsCompleted?: number; weight_used?: number; weightUsed?: number; completed?: boolean; is_completed?: boolean }[] }[] }>(
            `/workout-plans/${plan.id}`
          ).then(d => {
            for (const ex of d.exercises ?? []) {
              for (const l of ex.logs ?? []) {
                if (!(l.completed || l.is_completed)) continue
                const r = l.reps_completed ?? l.repsCompleted ?? 0
                const w = l.weight_used ?? l.weightUsed ?? 0
                totalReps += r
                totalVolume += r * w
              }
            }
          }).catch(() => {})
        )
      )
      setCoachReps(totalReps)
      setCoachVolume(totalVolume)
    } catch { setCoachWorkouts(0); setCoachReps(0); setCoachVolume(0) }
    setLoadingCoach(false)

    // ── 4. Client stats + top trainees ─────────────────────────────────
    let clientCompletedCount = 0
    const traineeStatsList: ActiveClient[] = []
    await Promise.allSettled(
      trainees.slice(0, 25).map(t =>
        apiFetch<{ workoutPlans: { status: string; completedAt?: string; updated_at?: string; createdAt?: string }[] }>(
          `/trainees/${t.id}/workout-plans`
        ).then(d => {
          const count = (d.workoutPlans ?? []).filter(p => {
            if ((p.status ?? "").toLowerCase() !== "completed") return false
            const pd = new Date(p.completedAt || p.updated_at || p.createdAt || "")
            return pd >= start && pd <= end
          }).length
          clientCompletedCount += count
          if (count > 0) {
            traineeStatsList.push({
              id: t.id,
              name: t.name,
              initials: t.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
              workoutCount: count,
            })
          }
        }).catch(() => {})
      )
    )
    setClientWorkouts(clientCompletedCount)
    setActiveClientsThisWeek(traineeStatsList.length)
    setTopTrainees(traineeStatsList.sort((a, b) => b.workoutCount - a.workoutCount).slice(0, 5))
    setLoadingClients(false)
  }

  const isLoading = loadingRevenue || loadingCoach || loadingClients

  return (
    <div className="space-y-8">
      {/* Financial Growth */}
      <section>
        <SectionLabel>Financial Growth (This Week)</SectionLabel>
        <div className="grid gap-4 md:grid-cols-2">
          <StatCard
            value={weekRevenue != null ? `$${fmtNum(weekRevenue)}` : "$0"}
            label="Revenue this week"
            accentColor="#00ff88"
            change={revGrowth ?? undefined}
            borderPosition="top"
            loading={loadingRevenue}
          />
          <StatCard
            value={totalTrainees != null ? String(totalTrainees) : "—"}
            label="Total active trainees"
            accentColor="#00ff88"
            borderPosition="top"
            loading={loadingClients}
          />
        </div>
      </section>

      {/* Your Performance */}
      <section>
        <SectionLabel>Your Performance (This Week)</SectionLabel>
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            value={coachReps != null ? fmtNum(coachReps) : "0"}
            label="Total Reps"
            accentColor="#00ffff"
            borderPosition="left"
            loading={loadingCoach}
          />
          <StatCard
            value={coachVolume != null ? `${fmtNum(coachVolume)} kg` : "0 kg"}
            label="Weight Lifted"
            accentColor="#a78bfa"
            borderPosition="left"
            loading={loadingCoach}
          />
          <StatCard
            value={coachWorkouts != null ? String(coachWorkouts) : "0"}
            label="Personal Workouts"
            accentColor="#00ff88"
            borderPosition="left"
            loading={loadingCoach}
          />
        </div>
      </section>

      {/* Client Performance */}
      <section>
        <SectionLabel>Client Performance (This Week)</SectionLabel>
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            value={activeClientsThisWeek != null && totalTrainees != null
              ? `${activeClientsThisWeek}/${totalTrainees}`
              : "—"}
            label="Active Clients"
            accentColor="#00ffff"
            borderPosition="left"
            loading={loadingClients}
          />
          <StatCard
            value={clientWorkouts != null ? `~${clientWorkouts}` : "0"}
            label="Workouts Completed"
            accentColor="#00ff88"
            borderPosition="left"
            loading={loadingClients}
          />
          <StatCard
            value={totalTrainees != null ? String(totalTrainees) : "0"}
            label="Total Clients"
            accentColor="#ffd700"
            borderPosition="left"
            loading={loadingClients}
          />
        </div>
      </section>

      {/* Most Active Clients */}
      <section>
        <SectionLabel>Most Active Clients (This Week)</SectionLabel>
        <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-4">
          {loadingClients ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#555555]" />
            </div>
          ) : topTrainees.length > 0 ? (
            <div className="divide-y divide-white/[0.08]">
              {topTrainees.map((client, index) => (
                <ClientRankRow
                  key={client.id}
                  rank={index + 1}
                  name={client.name}
                  initials={client.initials}
                  workoutCount={client.workoutCount}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(0,255,255,0.1)" }}>
                <Trophy className="h-8 w-8 text-[#00ffff]" />
              </div>
              <p className="text-[#888888]">No completed workouts this week.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
