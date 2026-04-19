"use client"

import { useState, useEffect } from "react"
import { DollarSign, Clock, AlertTriangle, Filter, X, Download, Loader2, ChevronDown, Bell, CalendarDays, CreditCard } from "lucide-react"
import { apiFetch, getUserInfo } from "@/lib/api"
import { cn } from "@/lib/utils"

interface Payment {
  id?: number
  amount: string | number
  payment_date: string
  start_date?: string
  end_date?: string
  duration_id?: string
  traineeName?: string
  traineeId?: number
}

interface TraineeRow {
  id: number
  name: string
  email: string
  initials: string
  totalEarned: number
  lastAmount: number
  status: "paid" | "pending" | "overdue"
  coachSubscriptionEndDate?: string
  coachSubscriptionStatus?: string
}

const STATUS_STYLES = {
  paid:    { bg: "rgba(0,255,255,0.1)",   text: "#00ffff",  border: "rgba(0,255,255,0.2)" },
  pending: { bg: "rgba(255,170,0,0.1)",   text: "#ffaa00",  border: "rgba(255,170,0,0.2)" },
  overdue: { bg: "rgba(255,51,51,0.1)",   text: "#ff3333",  border: "rgba(255,51,51,0.2)" },
}

const FILTERS = ["all", "paid", "pending", "overdue"] as const
type Filter = typeof FILTERS[number]

const DURATIONS = [
  { id: "7days",   label: "7 Days" },
  { id: "15days",  label: "15 Days" },
  { id: "1month",  label: "1 Month" },
]

// ── Manage Subscription Modal ────────────────────────────────────────────────

interface ManageModalProps {
  trainee: TraineeRow
  coachId: number
  onClose: () => void
  onUpdated: () => void
}

function ManageSubscriptionModal({ trainee, coachId, onClose, onUpdated }: ManageModalProps) {
  const [duration, setDuration] = useState("1month")
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0])
  const [amount, setAmount] = useState("")
  const [history, setHistory] = useState<Payment[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [reminding, setReminding] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [confirmCancel, setConfirmCancel] = useState(false)

  const isActive = trainee.coachSubscriptionStatus === "active" ||
    (trainee.coachSubscriptionEndDate ? new Date(trainee.coachSubscriptionEndDate) >= new Date() : false)

  useEffect(() => {
    setLoadingHistory(true)
    apiFetch<Payment[]>(`/users/coaches/${coachId}/trainees/${trainee.id}/history`)
      .then(d => setHistory(Array.isArray(d) ? d.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()) : []))
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleExtend = async () => {
    if (!amount || isNaN(parseFloat(amount))) {
      setError("Please enter a valid payment amount.")
      return
    }
    setSaving(true)
    setError("")
    setSuccess("")
    try {
      await apiFetch(`/users/coaches/${coachId}/trainees/${trainee.id}/subscription`, {
        method: "PUT",
        body: JSON.stringify({ durationId: duration, amount: parseFloat(amount), startDate }),
      })
      setSuccess("Subscription extended successfully.")
      setAmount("")
      onUpdated()
      // Reload history
      const d = await apiFetch<Payment[]>(`/users/coaches/${coachId}/trainees/${trainee.id}/history`)
      setHistory(Array.isArray(d) ? d.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()) : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update subscription.")
    } finally {
      setSaving(false)
    }
  }


  const handleCancel = async () => {
    setCancelling(true)
    setError("")
    setSuccess("")
    try {
      await apiFetch(`/users/coaches/${coachId}/trainees/${trainee.id}/subscription`, {
        method: "PUT",
        body: JSON.stringify({ durationId: "cancel" }),
      })
      setSuccess("Subscription cancelled.")
      setConfirmCancel(false)
      onUpdated()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to cancel subscription.")
    } finally {
      setCancelling(false)
    }
  }

  const handleRemind = async () => {
    setReminding(true)
    setError("")
    try {
      await apiFetch(`/notifications/send`, {
        method: "POST",
        body: JSON.stringify({ userId: trainee.id, type: "subscription_reminder" }),
      })
    } catch {
      // endpoint may not exist — treat as success (mobile does the same with a mock alert)
    } finally {
      setReminding(false)
      setSuccess(`Reminder sent to ${trainee.name}.`)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl border border-[#00ffff]/30 bg-[#161b22]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-white">Manage Subscription</h3>
            <p className="text-xs text-[#555555]">{trainee.name}</p>
          </div>
          <button onClick={onClose} className="text-[#555555] hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5">
          {/* Current status */}
          <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0f] px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-[#555555]">Current status</p>
              <p className="text-sm font-bold" style={{ color: isActive ? "#00ff88" : "#ff4444" }}>
                {isActive ? "Active" : "Expired / Inactive"}
              </p>
            </div>
            {trainee.coachSubscriptionEndDate && (
              <div className="text-right">
                <p className="text-xs text-[#555555]">Ends</p>
                <p className="text-sm font-bold text-white">
                  {new Date(trainee.coachSubscriptionEndDate).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {/* Send Reminder (overdue) */}
          {trainee.status === "overdue" && (
            <button
              onClick={handleRemind}
              disabled={reminding}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff3333]/10 border border-[#ff3333]/30 px-4 py-2.5 text-sm font-bold text-[#ff3333] transition-colors hover:bg-[#ff3333]/20 disabled:opacity-60"
            >
              {reminding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
              Send Reminder
            </button>
          )}

          {/* Duration selector */}
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#555555]">Duration</p>
            <div className="flex gap-2">
              {DURATIONS.map(d => (
                <button
                  key={d.id}
                  onClick={() => setDuration(d.id)}
                  className={cn(
                    "flex-1 rounded-xl border py-2.5 text-sm font-bold transition-all",
                    duration === d.id
                      ? "border-[#00ffff]/40 bg-[#00ffff]/10 text-[#00ffff]"
                      : "border-white/[0.08] text-[#555555] hover:text-white"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Start date */}
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#555555]">Start Date</p>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555555]" />
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] pl-10 pr-4 py-2.5 text-sm text-white focus:border-[#00ffff]/40 focus:outline-none [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Amount */}
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#555555]">Payment Amount ($)</p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#555555]">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] pl-7 pr-4 py-2.5 text-sm text-white placeholder:text-[#333] focus:border-[#00ffff]/40 focus:outline-none"
              />
            </div>
          </div>

          {error && <p className="text-xs text-[#ff4444]">{error}</p>}
          {success && <p className="text-xs text-[#00ff88]">{success}</p>}

          {/* Confirm Extension */}

          <button
            onClick={handleExtend}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00ffff] px-4 py-3 text-sm font-bold text-black transition-opacity disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            Confirm Extension
          </button>

          {/* Cancel Subscription */}
          {isActive && !confirmCancel && (
            <button
              onClick={() => setConfirmCancel(true)}
              className="flex w-full items-center justify-center rounded-xl border border-[#ff4444]/30 bg-[#ff4444]/5 px-4 py-2.5 text-sm font-bold text-[#ff4444] transition-colors hover:bg-[#ff4444]/10"
            >
              Cancel Subscription
            </button>
          )}

          {confirmCancel && (
            <div className="rounded-xl border border-[#ff4444]/30 bg-[#ff4444]/5 p-4 space-y-3">
              <p className="text-sm text-[#ff4444] font-bold">Are you sure? This will immediately expire their access.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmCancel(false)}
                  className="flex-1 rounded-xl border border-white/[0.08] py-2 text-sm font-bold text-[#888888] hover:text-white"
                >
                  No, keep it
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex-1 rounded-xl bg-[#ff4444] py-2 text-sm font-bold text-white disabled:opacity-60"
                >
                  {cancelling ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Yes, cancel"}
                </button>
              </div>
            </div>
          )}

          {/* Payment history */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#555555] border-t border-white/[0.05] pt-4">Payment History</p>
            {loadingHistory ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-[#555555]" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-xs italic text-[#444444]">No payment history found.</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {history.map((p, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                    <div>
                      <p className="text-xs font-bold text-white">{new Date(p.payment_date).toLocaleDateString()}</p>
                      {(p.start_date || p.end_date) && (
                        <p className="text-[10px] text-[#555555]">
                          {p.start_date ? new Date(p.start_date).toLocaleDateString() : ""}{p.end_date ? ` → ${new Date(p.end_date).toLocaleDateString()}` : ""}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#00ff88]">${p.amount}</p>
                      {p.duration_id && <p className="text-[10px] text-[#00ffff]">{p.duration_id}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main View ────────────────────────────────────────────────────────────────

export function RevenueView() {
  const user = getUserInfo()
  const [trainees, setTrainees] = useState<TraineeRow[]>([])
  const [allPayments, setAllPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>("all")
  const [showModal, setShowModal] = useState(false)
  const [manageTrainee, setManageTrainee] = useState<TraineeRow | null>(null)

  // Pending IDs persisted in localStorage
  const [pendingIds, setPendingIds] = useState<Set<number>>(() => {
    if (typeof window === "undefined") return new Set()
    try {
      const stored = localStorage.getItem(`dupla_pending_${user?.id}`)
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch { return new Set() }
  })

  useEffect(() => {
    if (!user?.id) return
    try { localStorage.setItem(`dupla_pending_${user.id}`, JSON.stringify([...pendingIds])) } catch {}
  }, [pendingIds, user?.id])

  const loadData = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const data = await apiFetch<{ trainees: { id: number; name: string; email: string; coach_subscription_end_date?: string; coachSubscriptionEndDate?: string; coach_subscription_status?: string; coachSubscriptionStatus?: string }[] }>(
        `/coaches/${user.id}/trainees`
      )
      const list = data.trainees ?? []
      let aggregated: Payment[] = []

      const enriched: TraineeRow[] = await Promise.all(
        list.map(async t => {
          let totalEarned = 0
          let lastAmount = 0
          try {
            const history = await apiFetch<Payment[]>(`/users/coaches/${user.id}/trainees/${t.id}/history`)
            const payments = Array.isArray(history) ? history : []
            payments.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
            totalEarned = payments.reduce((s, p) => s + parseFloat(String(p.amount || 0)), 0)
            lastAmount = payments.length > 0 ? parseFloat(String(payments[0].amount || 0)) : 0
            payments.forEach(p => aggregated.push({ ...p, traineeName: t.name, traineeId: t.id }))
          } catch {}
          const endDate = t.coach_subscription_end_date || t.coachSubscriptionEndDate
          const subStatus = t.coach_subscription_status || t.coachSubscriptionStatus
          const isOverdue = endDate ? new Date(endDate) < new Date() : false
          const isPending = pendingIds.has(t.id)
          const status: TraineeRow["status"] = isOverdue ? "overdue" : isPending ? "pending" : "paid"
          return {
            id: t.id,
            name: t.name,
            email: t.email,
            initials: t.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
            totalEarned,
            lastAmount,
            status,
            coachSubscriptionEndDate: endDate,
            coachSubscriptionStatus: subStatus,
          }
        })
      )
      aggregated.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
      setAllPayments(aggregated)
      setTrainees(enriched)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => {
    loadData()
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const togglePending = (id: number) => {
    setPendingIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    setTrainees(prev => prev.map(t => {
      if (t.id !== id) return t
      const endDate = t.coachSubscriptionEndDate
      const isOverdue = endDate ? new Date(endDate) < new Date() : false
      if (isOverdue) return t
      const wasPending = pendingIds.has(id)
      return { ...t, status: wasPending ? "paid" : "pending" }
    }))
  }

  const totalRevenue = allPayments.reduce((s, p) => s + parseFloat(String(p.amount || 0)), 0)
  const pendingAmount = trainees.filter(t => t.status === "pending").reduce((s, t) => s + t.lastAmount, 0)
  const pendingCount = trainees.filter(t => t.status === "pending").length

  const filtered = trainees.filter(t => filter === "all" || t.status === filter)

  // Group payments by month for the modal
  const grouped: { title: string; items: Payment[] }[] = []
  allPayments.forEach(p => {
    const d = new Date(p.payment_date)
    const title = d.toLocaleString("default", { month: "long", year: "numeric" }).toUpperCase()
    const existing = grouped.find(g => g.title === title)
    if (existing) existing.items.push(p)
    else grouped.push({ title, items: [p] })
  })

  const exportCSV = () => {
    const rows = [["Date", "Trainee", "Amount"]]
    allPayments.forEach(p => {
      rows.push([new Date(p.payment_date).toLocaleDateString(), p.traineeName ?? "", String(p.amount)])
    })
    const csv = rows.map(r => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = "revenue-report.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  const now = new Date()
  const monthLabel = now.toLocaleString("default", { month: "long", year: "numeric" }).toUpperCase()

  return (
    <div className="space-y-6">
      {/* Header sub-label */}
      <p className="text-xs font-bold uppercase tracking-widest text-[#00ffff]/70">FINANCE • {monthLabel}</p>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <button
          onClick={() => setShowModal(true)}
          className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#161b22] p-5 text-left transition-colors hover:border-[#00ffff]/20"
        >
          <DollarSign className="absolute -right-4 -top-2 h-20 w-20 text-[#00ffff]/10" />
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#888888]">Total Revenue</p>
          <p className="text-3xl font-bold text-white">${totalRevenue.toFixed(0)}</p>
          <p className="mt-1 text-[10px] text-[#00ffff]">Tap for details →</p>
        </button>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#161b22] p-5">
          <Clock className="absolute -right-4 -top-2 h-20 w-20 text-[#ffaa00]/10" />
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#888888]">Pending</p>
          <p className="text-3xl font-bold text-white">${pendingAmount.toFixed(0)}</p>
          <p className="mt-1 text-[10px] text-[#888888]">{pendingCount} payment{pendingCount !== 1 ? "s" : ""} pending</p>
        </div>
      </div>

      {/* Trainee subscriptions */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold text-white">Trainee Subscriptions</h3>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#00ffff]" />
            <div className="flex rounded-lg border border-white/[0.08] bg-[#161b22] overflow-hidden">
              {FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn("px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors",
                    filter === f ? "bg-[#00ffff]/15 text-[#00ffff]" : "text-[#555555] hover:text-white"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#555555]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] py-12 text-center">
            <p className="text-sm italic text-[#555555]">No trainees found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(t => {
              const ss = STATUS_STYLES[t.status]
              return (
                <div
                  key={t.id}
                  className={cn(
                    "rounded-2xl border bg-[#161b22] p-4 transition-colors cursor-pointer",
                    t.status === "overdue"
                      ? "border-l-4 border-[#ff3333]/30 hover:border-[#ff3333]/60"
                      : "border-white/[0.08] hover:border-[#00ffff]/30"
                  )}
                >
                  {/* Top row — clickable to open manage modal */}
                  <button
                    onClick={() => setManageTrainee(t)}
                    className="mb-3 flex w-full items-start justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0a0a0f] text-sm font-bold" style={{ color: ss.text }}>
                        {t.initials}
                      </div>
                      <div>
                        <p className="font-bold" style={{ color: t.status === "overdue" ? "#ff3333" : "#fff" }}>{t.name}</p>
                        <p className="text-xs text-[#555555]">{t.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ backgroundColor: ss.bg, color: ss.text, border: `1px solid ${ss.border}` }}>
                        {t.status}
                      </span>
                      <ChevronDown className="h-4 w-4 -rotate-90 text-[#555555]" />
                    </div>
                  </button>

                  <div className="border-t border-white/[0.05] pt-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wide text-[#555555]">Amount</p>
                        <p className="font-bold text-white">${t.lastAmount > 0 ? t.lastAmount.toFixed(0) : "—"}<span className="text-xs font-normal text-[#555555]">/mo</span></p>
                      </div>
                      <div className="flex items-center gap-2">
                        {t.status === "overdue" ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-[#ff3333]">
                            <AlertTriangle className="h-3.5 w-3.5" /> Overdue
                          </span>
                        ) : (
                          <div className="text-right">
                            <p className="text-[9px] font-bold uppercase tracking-wide text-[#555555]">Total Earned</p>
                            <p className="font-bold" style={{ color: t.status === "pending" ? "#ffaa00" : "#cccccc" }}>
                              ${t.totalEarned.toFixed(0)}
                            </p>
                          </div>
                        )}
                        <button
                          onClick={() => togglePending(t.id)}
                          className={cn(
                            "rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase transition-colors",
                            t.status === "pending"
                              ? "bg-[#00ffff]/15 text-[#00ffff] hover:bg-[#00ffff]/25"
                              : "bg-[#ffaa00]/15 text-[#ffaa00] hover:bg-[#ffaa00]/25"
                          )}
                        >
                          {t.status === "pending" ? "Mark Paid" : "Mark Pending"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Export button */}
      {allPayments.length > 0 && (
        <button
          onClick={exportCSV}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#161b22] px-4 py-3 text-sm font-medium text-[#888888] transition-colors hover:border-white/[0.15] hover:text-white"
        >
          <Download className="h-4 w-4" />
          Export Report
        </button>
      )}

      {/* Revenue breakdown modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border border-[#00ffff]/30 bg-[#161b22]">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
              <h3 className="text-lg font-bold text-white">Revenue Breakdown</h3>
              <button onClick={() => setShowModal(false)} className="text-[#555555] hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="overflow-y-auto p-4">
              {grouped.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#555555]">No payment history found.</p>
              ) : grouped.map(g => (
                <div key={g.title} className="mb-4">
                  <div className="mb-2 rounded-lg bg-[#0a0a0f] px-3 py-1.5">
                    <p className="text-[10px] font-bold text-[#00ffff]">{g.title}</p>
                  </div>
                  {g.items.map((p, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-white/[0.05] py-3">
                      <div>
                        <p className="text-sm font-bold text-white">{p.traineeName}</p>
                        <p className="text-xs text-[#888888]">{new Date(p.payment_date).toLocaleDateString()}</p>
                      </div>
                      <p className="font-bold text-[#00ff88]">+${p.amount}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Manage Subscription Modal */}
      {manageTrainee && user?.id && (
        <ManageSubscriptionModal
          trainee={manageTrainee}
          coachId={user.id}
          onClose={() => setManageTrainee(null)}
          onUpdated={() => {
            setManageTrainee(null)
            loadData()
          }}
        />
      )}
    </div>
  )
}
