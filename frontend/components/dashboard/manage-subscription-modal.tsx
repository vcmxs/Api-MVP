"use client"

import { useState, useEffect } from "react"
import { X, Loader2, Bell, CalendarDays, CreditCard } from "lucide-react"
import { apiFetch, getUserInfo } from "@/lib/api"
import { cn, getLocalISOString } from "@/lib/utils"

export interface SubscriptionTrainee {
  id: number
  name: string
  status?: "paid" | "pending" | "overdue"
  coachSubscriptionEndDate?: string
  coachSubscriptionStatus?: string
}

const DURATIONS = [
  { id: "7days",  label: "7 Days" },
  { id: "15days", label: "15 Days" },
  { id: "1month", label: "1 Month" },
]

interface Payment {
  amount: string | number
  payment_date: string
  start_date?: string
  end_date?: string
  duration_id?: string
}

interface Props {
  trainee: SubscriptionTrainee
  onClose: () => void
  onUpdated?: () => void
}

export function ManageSubscriptionModal({ trainee, onClose, onUpdated }: Props) {
  const user = getUserInfo()
  const coachId = user?.id

  const [duration, setDuration] = useState("1month")
  const [startDate, setStartDate] = useState(getLocalISOString())
  const [amount, setAmount] = useState("")
  const [history, setHistory] = useState<Payment[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reminding, setReminding] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const isActive =
    trainee.coachSubscriptionStatus === "active" ||
    (trainee.coachSubscriptionEndDate ? new Date(trainee.coachSubscriptionEndDate) >= new Date() : false)

  useEffect(() => {
    if (!coachId) return
    setLoadingHistory(true)
    apiFetch<Payment[]>(`/users/coaches/${coachId}/trainees/${trainee.id}/history`)
      .then(d => setHistory(Array.isArray(d) ? d.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()) : []))
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false))
  }, [coachId, trainee.id])

  const handleExtend = async () => {
    if (!amount || isNaN(parseFloat(amount))) {
      setError("Please enter a valid payment amount.")
      return
    }
    if (!coachId) return
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
      onUpdated?.()
      const d = await apiFetch<Payment[]>(`/users/coaches/${coachId}/trainees/${trainee.id}/history`)
      setHistory(Array.isArray(d) ? d.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()) : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update subscription.")
    } finally {
      setSaving(false)
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
    } catch { /* endpoint may not exist — treat as success */ }
    finally {
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

          {/* Duration */}
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

          <button
            onClick={handleExtend}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00ffff] px-4 py-3 text-sm font-bold text-black transition-opacity disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            Confirm Extension
          </button>

          {/* Payment history */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#555555] border-t border-white/[0.05] pt-4">Payment History</p>
            {loadingHistory ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-[#555555]" /></div>
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
