"use client"

import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import { Loader2, Search, CheckCircle, DollarSign, Clock } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface ReferralEarning {
  id: number
  coachId: number
  coachName: string
  coachEmail: string
  amount: number
  status: string // "pending", "paid"
  createdAt: string
  traineeName?: string
}

export function AdminReferralsView() {
  const [earnings, setEarnings] = useState<ReferralEarning[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const fetchEarnings = async () => {
    try {
      const res = await apiFetch<{ earnings: ReferralEarning[] }>("/admin/referrals")
      setEarnings(res?.earnings ?? [])
    } catch (err) {
      console.warn("Failed to load referrals from API", err)
      // True fallback only if endpoint fails completely
      setEarnings([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEarnings()
  }, [])

  const handleMarkAsPaid = async (earningId: number) => {
    if (!window.confirm("Mark this commission as Paid? This will update the ledger.")) return

    setActionLoading(earningId)
    try {
      await apiFetch(`/admin/referrals/${earningId}/pay`, { method: "PATCH" })
      setEarnings((prev) =>
        prev.map((e) => (e.id === earningId ? { ...e, status: "paid" } : e))
      )
    } catch (err: any) {
      alert(err.message || "Failed to mark as paid")
    } finally {
      setActionLoading(null)
    }
  }

  const filteredEarnings = earnings.filter(
    (e) =>
      e.coachName.toLowerCase().includes(search.toLowerCase()) ||
      e.coachEmail.toLowerCase().includes(search.toLowerCase())
  )

  const pendingTotal = earnings.filter((e) => e.status === "pending").reduce((sum, e) => sum + e.amount, 0)
  const paidTotal = earnings.filter((e) => e.status === "paid").reduce((sum, e) => sum + e.amount, 0)

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#00ff88]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Referrals & Commissions</h2>
          <p className="text-sm text-[#888888]">Manage coach payouts from the referral_earnings table</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex items-center justify-between rounded-2xl border border-[#ffd700]/20 bg-[#ffd700]/5 p-6">
          <div>
            <p className="text-sm font-medium text-[#888888] uppercase tracking-wider">Total Pending Payouts</p>
            <p className="mt-2 text-3xl font-bold text-[#ffd700]">${pendingTotal.toFixed(2)}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ffd700]/10 text-[#ffd700]">
            <Clock className="h-6 w-6" />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-[#00ff88]/20 bg-[#00ff88]/5 p-6">
          <div>
            <p className="text-sm font-medium text-[#888888] uppercase tracking-wider">Total Paid Out (All Time)</p>
            <p className="mt-2 text-3xl font-bold text-[#00ff88]">${paidTotal.toFixed(2)}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00ff88]/10 text-[#00ff88]">
            <CheckCircle className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Earnings Ledger</h3>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555555]" />
          <input
            type="text"
            placeholder="Search coach..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/[0.08] bg-[#161b22] py-2 pl-9 pr-4 text-sm text-white placeholder:text-[#555555] focus:border-[#00ffff]/50 focus:outline-none"
          />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#161b22]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#0a0a0f]">
                <th className="px-6 py-4 font-bold text-[#888888] uppercase tracking-wider text-xs">Date</th>
                <th className="px-6 py-4 font-bold text-[#888888] uppercase tracking-wider text-xs">Coach</th>
                <th className="px-6 py-4 font-bold text-[#888888] uppercase tracking-wider text-xs">Referred Trainee</th>
                <th className="px-6 py-4 font-bold text-[#888888] uppercase tracking-wider text-xs">Amount</th>
                <th className="px-6 py-4 font-bold text-[#888888] uppercase tracking-wider text-xs">Status</th>
                <th className="px-6 py-4 font-bold text-[#888888] uppercase tracking-wider text-xs text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filteredEarnings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#555555]">
                    No earnings found.
                  </td>
                </tr>
              ) : (
                filteredEarnings.map((earning) => (
                  <tr key={earning.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-6 py-4 text-[#888888]">
                      {format(new Date(earning.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{earning.coachName}</div>
                      <div className="text-xs text-[#555555]">{earning.coachEmail}</div>
                    </td>
                    <td className="px-6 py-4 text-[#888888]">{earning.traineeName || "—"}</td>
                    <td className="px-6 py-4 font-bold text-white">
                      ${earning.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-bold uppercase",
                          earning.status === "paid" ? "bg-[#00ff88]/10 text-[#00ff88]" : "bg-[#ffd700]/10 text-[#ffd700]"
                        )}
                      >
                        {earning.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {earning.status === "pending" ? (
                        <button
                          onClick={() => handleMarkAsPaid(earning.id)}
                          disabled={actionLoading === earning.id}
                          className="flex h-8 items-center justify-center gap-2 rounded-lg bg-[#00ff88] px-3 text-xs font-bold text-black transition-colors hover:bg-[#00e57a] disabled:opacity-50 ml-auto"
                        >
                          {actionLoading === earning.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <DollarSign className="h-3 w-3" /> Mark Paid
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-xs font-medium text-[#555555]">Settled</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
