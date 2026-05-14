"use client"

import { useState, useEffect } from "react"
import { Copy, Check, Loader2, Gift, Users, DollarSign, Wallet } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

interface ReferralStats {
  referralCode?: string
  referralCount?: number
  totalEarnings?: number
  currentBalance?: number
  recentReferrals?: { name: string; created_at: string; subscription_status?: string }[]
  referrer?: { name: string }
}

export function WinWinView() {
  const { t } = useT()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [enterCode, setEnterCode] = useState("")
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState("")
  const [applySuccess, setApplySuccess] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => { loadStats() }, [])

  const loadStats = async () => {
    setLoading(true)
    try {
      const data = await apiFetch<ReferralStats>("/referrals/stats")
      setStats(data)
    } catch {
      setStats({ referralCode: "—", referralCount: 0, totalEarnings: 0, currentBalance: 0, recentReferrals: [] })
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    if (!enterCode || enterCode.length < 4) {
      setApplyError(t("winWinView.applyErrorMin"))
      return
    }
    setApplying(true)
    setApplyError("")
    setApplySuccess("")
    try {
      const data = await apiFetch<{ referrerName?: string }>("/referrals/apply", {
        method: "POST",
        body: JSON.stringify({ referralCode: enterCode }),
      })
      const refName = data.referrerName ?? t("winWinView.fallbackCoach")
      setApplySuccess(t("winWinView.applySuccess").replace("{name}", refName))
      setEnterCode("")
      loadStats()
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : t("winWinView.applyErrorGeneric"))
    } finally {
      setApplying(false)
    }
  }

  const copyCode = () => {
    if (!stats?.referralCode || stats.referralCode === "—") return
    navigator.clipboard.writeText(stats.referralCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-[#00ffff]" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Referrer info or enter code */}
      {stats?.referrer ? (
        <div className="rounded-2xl border border-[#00ff88]/30 bg-[#00ff88]/5 p-5">
          <p className="mb-1 text-sm font-bold text-[#00ff88]">{t("winWinView.referredBy")}</p>
          <p className="text-lg font-bold text-white">{stats.referrer.name}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-5">
          <p className="mb-1 text-sm font-bold text-[#00ffff]">{t("winWinView.haveCode")}</p>
          <p className="mb-4 text-sm text-[#888888]">{t("winWinView.enterCodeDesc")}</p>
          <div className="flex gap-3">
            <input
              type="text"
              value={enterCode}
              onChange={e => setEnterCode(e.target.value.toUpperCase())}
              placeholder={t("winWinView.placeholder")}
              maxLength={20}
              className="flex-1 rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white placeholder:normal-case placeholder:font-normal placeholder:tracking-normal placeholder:text-[#444] focus:border-[#00ffff]/40 focus:outline-none"
            />
            <button
              onClick={handleApply}
              disabled={applying}
              className="rounded-xl bg-[#00ffff] px-5 py-2.5 text-sm font-bold text-black transition-opacity disabled:opacity-60"
            >
              {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : t("winWinView.apply")}
            </button>
          </div>
          {applyError && <p className="mt-2 text-xs text-[#ff4444]">{applyError}</p>}
          {applySuccess && <p className="mt-2 text-xs text-[#00ff88]">{applySuccess}</p>}
        </div>
      )}

      {/* Intro */}
      <div className="rounded-2xl border border-[#00ffff]/20 bg-[#161b22] p-5">
        <p className="mb-2 text-sm font-bold text-[#00ffff]">{t("winWinView.programTitle")}</p>
        <p className="text-sm leading-relaxed text-[#aaaaaa]">{t("winWinView.programDesc")}</p>
      </div>

      {/* Referral code */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-xs font-bold uppercase tracking-widest text-[#888888]">{t("winWinView.yourCode")}</p>
        <button
          onClick={copyCode}
          className={cn(
            "flex items-center gap-4 rounded-full px-8 py-4 text-2xl font-bold tracking-widest text-black shadow-lg transition-all",
            copied
              ? "bg-[#00ff88] shadow-[#00ff88]/30"
              : "bg-[#00ffff] shadow-[#00ffff]/30 hover:scale-105"
          )}
          style={{ boxShadow: `0 0 20px ${copied ? "rgba(0,255,136,0.3)" : "rgba(0,255,255,0.3)"}` }}
        >
          {stats?.referralCode ?? "—"}
          {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
        </button>
        <p className="text-xs text-[#555555]">{copied ? t("winWinView.copied") : t("winWinView.clickToCopy")}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col items-center rounded-2xl border border-white/[0.08] bg-[#161b22] py-5">
          <Users className="mb-2 h-5 w-5 text-[#555555]" />
          <p className="text-2xl font-bold text-white">{stats?.referralCount ?? 0}</p>
          <p className="text-xs text-[#888888]">{t("winWinView.referralsCount")}</p>
        </div>
        <div className="flex flex-col items-center rounded-2xl border border-white/[0.08] bg-[#161b22] py-5">
          <DollarSign className="mb-2 h-5 w-5 text-[#555555]" />
          <p className="text-2xl font-bold text-[#00ff88]">${stats?.totalEarnings ?? 0}</p>
          <p className="text-xs text-[#888888]">{t("winWinView.totalEarned")}</p>
        </div>
      </div>

      {/* Balance */}
      <div className="rounded-2xl border border-[#ffd700]/30 bg-[#161b22] p-5">
        <div className="mb-2 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-[#ffd700]" />
          <p className="text-sm font-bold text-[#ffd700]">{t("winWinView.currentBalance")}</p>
        </div>
        <p className="mb-2 text-4xl font-bold text-white">${stats?.currentBalance ?? 0}</p>
        <p className="text-sm text-[#888888]">{t("winWinView.balanceDesc")}</p>
      </div>

      {/* Recent referrals */}
      {stats?.recentReferrals && stats.recentReferrals.length > 0 && (
        <div>
          <p className="mb-3 text-sm font-bold text-white">{t("winWinView.recentReferrals")}</p>
          <div className="space-y-2">
            {stats.recentReferrals.map((ref, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-[#161b22] border border-white/[0.05] px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-white">{ref.name}</p>
                  <p className="text-xs text-[#555555]">{new Date(ref.created_at).toLocaleDateString()}</p>
                </div>
                <span
                  className="text-xs font-bold"
                  style={{ color: ref.subscription_status === "active" ? "#00ff88" : "#555555" }}
                >
                  {ref.subscription_status === "active" ? t("winWinView.statusActive") : t("winWinView.statusInactive")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

