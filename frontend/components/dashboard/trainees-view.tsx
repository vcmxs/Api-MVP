"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, UserPlus, Users, Loader2, AlertCircle, RefreshCw, Copy, Check, Share2, Link2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { apiFetch, getUserInfo } from "@/lib/api"
import type { CoachInvite } from "@/lib/coach-invite"
import { useT } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const TIER_LIMITS: Record<string, number> = {
  starter: 1,
  bronze: 4,
  silver: 10,
  gold: 25,
  olympian: 999
}

export interface ApiTrainee {
  id: number
  name: string
  email: string
  gym?: string
  phone?: string
  age?: number
  subscriptionTier?: string
  subscriptionStatus?: string
  subscriptionExpiry?: string
  status?: string
  coach_subscription_status?: string
  coach_subscription_end_date?: string
  isOverLimit?: boolean
}

function TraineeCard({ trainee, onClick, isOverLimit }: { trainee: ApiTrainee; onClick: () => void; isOverLimit?: boolean }) {
  const { t } = useT()
  const isBlocked = trainee.status === "blocked"
  
  // Calculate if subscription is expired
  let isExpired = false
  const expiry = trainee.coach_subscription_end_date ?? trainee.subscriptionExpiry
  if (expiry) {
    // Treat as expired if the expiry date has passed
    const diff = new Date(expiry).getTime() - new Date().getTime()
    isExpired = Math.ceil(diff / (1000 * 60 * 60 * 24)) < 0
  }
  
  const subStatus = trainee.coach_subscription_status ?? trainee.subscriptionStatus ?? trainee.status
  const isInactive = subStatus === "inactive" || subStatus === "cancelled" || subStatus === "free"

  return (
    <button
      onClick={() => { if (!isOverLimit) onClick() }}
      className={cn("group flex w-full items-center justify-between rounded-2xl border border-white/[0.08] bg-[#161b22] p-4 text-left transition-all", isOverLimit ? "opacity-60 cursor-not-allowed" : "hover:border-white/[0.15] hover:bg-[#1c222b]")}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#00ffff]/20 to-[#00ff88]/20 text-sm font-bold text-[#00ffff]">
          {trainee.name.split(" ").map((n) => n[0]).join("")}
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">{trainee.name} {isOverLimit && "(Locked 🔒)"}</h3>
          <p className="text-sm text-[#888888]">{trainee.email}</p>
          {trainee.gym && <p className="mt-0.5 text-xs text-[#555555]">{trainee.gym}</p>}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5">
        <div
          className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
            isOverLimit ? "bg-[#ff4444]/15 text-[#ff4444]" :
            isBlocked || isExpired || isInactive
              ? "bg-[#ff4444]/15 text-[#ff4444]"
              : "bg-[#00ff88]/15 text-[#00ff88]"
          }`}
        >
          {isOverLimit ? "Locked" : isBlocked ? t.trainees.blocked : isExpired ? "Expired" : isInactive ? "Inactive" : t.trainees.active}
        </div>
        {trainee.subscriptionTier && (
          <span className="text-xs text-[#555555] uppercase tracking-wider">
            {trainee.subscriptionTier}
          </span>
        )}
      </div>
    </button>
  )
}

interface TraineesViewProps {
  onSelectTrainee?: (trainee: ApiTrainee) => void
}

export function TraineesView({ onSelectTrainee }: TraineesViewProps) {
  const { t } = useT()
  const user = getUserInfo()
  const [trainees, setTrainees] = useState<ApiTrainee[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newTraineeEmail, setNewTraineeEmail] = useState("")
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState("")
  const [invite, setInvite] = useState<CoachInvite | null>(null)
  const [inviteError, setInviteError] = useState("")
  const [copied, setCopied] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [rotating, setRotating] = useState(false)

  const fetchTrainees = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError("")
    try {
      const data = await apiFetch<{ trainees: ApiTrainee[] }>(`/coaches/${user.id}/trainees`)
      setTrainees(data.trainees ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load trainees")
    } finally {
      setLoading(false)
    }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchTrainees()
  }, [fetchTrainees])

  // Shareable invite link (coach → trainee). Separate from the Win-Win code.
  const fetchInvite = useCallback(async () => {
    if (!user?.id) return
    try {
      const data = await apiFetch<CoachInvite>(`/coaches/${user.id}/invite`)
      setInvite(data)
      setInviteError("")
    } catch (e: unknown) {
      setInviteError(e instanceof Error ? e.message : "Failed to load invite link")
    }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchInvite()
  }, [fetchInvite])

  const handleCopyInvite = async () => {
    if (!invite?.url) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(invite.url)
      } else {
        // Older browsers / non-secure contexts
        const area = document.createElement("textarea")
        area.value = invite.url
        area.style.position = "fixed"
        area.style.opacity = "0"
        document.body.appendChild(area)
        area.select()
        document.execCommand("copy")
        document.body.removeChild(area)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setInviteError(t.trainees.shareError)
    }
  }

  const handleShareInvite = async () => {
    if (!invite?.url) return
    setSharing(true)
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: t.trainees.shareTitle, text: t.trainees.shareHint, url: invite.url })
      } else {
        window.open(
          `https://wa.me/?text=${encodeURIComponent(`${t.trainees.shareHint} ${invite.url}`)}`,
          "_blank",
          "noopener,noreferrer"
        )
      }
    } catch {
      // The user dismissed the native share sheet — nothing to do.
    } finally {
      setSharing(false)
    }
  }

  const handleRotateInvite = async () => {
    if (!user?.id) return
    if (typeof window !== "undefined" && !window.confirm(t.trainees.shareRotateConfirm)) return
    setRotating(true)
    try {
      const data = await apiFetch<CoachInvite>(`/coaches/${user.id}/invite/rotate`, { method: "POST" })
      setInvite(data)
      setCopied(false)
      setInviteError("")
    } catch (e: unknown) {
      setInviteError(e instanceof Error ? e.message : "Failed to generate a new invite link")
    } finally {
      setRotating(false)
    }
  }

  const endDate = user?.subscription_end_date ?? user?.subscriptionEndDate ?? user?.subscriptionExpiry ?? user?.coachSubscriptionEndDate ?? user?.coach_subscription_end_date
  const isSubExpired = endDate ? new Date(endDate).getTime() < Date.now() : false
  const rawTier = user?.subscriptionTier ?? user?.subscription_tier ?? "starter"
  const userTier = isSubExpired ? "starter" : rawTier
  const currentLimit = TIER_LIMITS[userTier.toLowerCase()] ?? 1
  
  const tierColors: Record<string, string> = {
    starter: "#888888", bronze: "#cd7f32", silver: "#c0c0c0",
    gold: "#ffd700", olympian: "#85a9f7", platinum: "#e5e4e2",
  }
  const tierColor = tierColors[userTier.toLowerCase()] ?? "#888888"

  const traineesWithLimit = trainees.map((trainee, index) => ({
    ...trainee,
    isOverLimit: index >= currentLimit
  }))

  const filteredTrainees = traineesWithLimit.filter(
    (tr) =>
      tr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tr.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddTrainee = async () => {
    if (!newTraineeEmail.trim() || !user?.id) return
    setAdding(true)
    setAddError("")
    try {
      await apiFetch(`/coaches/${user.id}/trainees`, {
        method: "POST",
        body: JSON.stringify({ email: newTraineeEmail.trim() }),
      })
      setNewTraineeEmail("")
      setIsAddDialogOpen(false)
      fetchTrainees()
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : "Failed to add trainee")
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-bold text-white">{t.trainees.title}</h2>
          {!loading && (
            <span 
              className="rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider"
              style={{
                backgroundColor: `${tierColor}22`,
                color: tierColor,
                border: `1px solid ${tierColor}44`
              }}
            >
              Plan: {userTier} {trainees.length}/{currentLimit}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="relative flex-1 min-w-[140px] sm:flex-initial">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555555]" />
            <input
              type="text"
              placeholder={t.trainees.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full sm:w-64 rounded-xl border border-white/[0.08] bg-[#161b22] pl-10 pr-4 text-sm text-white placeholder:text-[#555555] focus:border-[#00ffff]/50 focus:outline-none focus:ring-1 focus:ring-[#00ffff]/50"
            />
          </div>

          <button
            onClick={fetchTrainees}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#161b22] text-[#888888] transition-colors hover:text-white"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setIsAddDialogOpen(true)}
            className="flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl bg-[#00ffff] px-4 py-2.5 text-sm font-semibold text-black transition-all hover:bg-[#00ffff]/90"
          >
            <UserPlus className="h-4 w-4" />
            <span className="whitespace-nowrap">{t.trainees.addTrainee}</span>
          </button>
        </div>
      </div>

      {/* Shareable invite link */}
      <div className="rounded-2xl border border-[#00ffff]/20 bg-[#161b22] p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 shrink-0 text-[#00ffff]" />
          <h3 className="text-sm font-semibold text-white">{t.trainees.shareTitle}</h3>
        </div>
        <p className="mt-1 text-xs text-[#888888]">{t.trainees.shareHint}</p>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 truncate rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-3 py-2.5 text-xs text-[#00ffff]">
            {invite?.url ?? "…"}
          </code>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyInvite}
              disabled={!invite}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#00ffff] px-3 py-2.5 text-xs font-semibold text-black transition-all hover:bg-[#00ffff]/90 disabled:opacity-50 sm:flex-initial"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span className="whitespace-nowrap">{copied ? t.trainees.shareCopied : t.trainees.shareCopy}</span>
            </button>
            <button
              onClick={handleShareInvite}
              disabled={!invite || sharing}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-3 py-2.5 text-xs font-medium text-white transition-colors hover:bg-[#1c222b] disabled:opacity-50 sm:flex-initial"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span className="whitespace-nowrap">{t.trainees.shareShare}</span>
            </button>
            <button
              onClick={handleRotateInvite}
              disabled={!invite || rotating}
              title={t.trainees.shareRegenerate}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#0a0a0f] text-[#888888] transition-colors hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", rotating && "animate-spin")} />
            </button>
          </div>
        </div>

        {invite && (
          <p className="mt-2 text-[11px] text-[#555555]">
            <span className="text-[#888888]">{invite.code}</span>
            {" · "}
            {invite.uses} {t.trainees.shareUses}
            {" · "}
            {invite.slotsAvailable === 0 ? (
              <span className="text-[#ffb020]">{t.trainees.shareFull}</span>
            ) : (
              <span>
                {invite.slotsAvailable ?? 0} {t.trainees.shareSlots}
              </span>
            )}
          </p>
        )}

        {inviteError && <p className="mt-2 text-[11px] text-[#ff4444]">{inviteError}</p>}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-[#ff4444]/20 bg-[#ff4444]/10 px-4 py-3 text-sm text-[#ff4444]">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
          <button onClick={fetchTrainees} className="text-xs underline">Retry</button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#555555]" />
          <p className="text-sm text-[#555555]">{t.trainees.loadingTrainees}</p>
        </div>
      ) : filteredTrainees.length === 0 && searchQuery === "" && trainees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#161b22]">
            <Users className="h-10 w-10 text-[#555555]" />
          </div>
          <h3 className="mt-6 text-lg font-medium text-white">{t.trainees.noTrainees}</h3>
          <p className="mt-2 text-sm text-[#888888]">{t.trainees.noTraineesHint}</p>
          <button
            onClick={() => setIsAddDialogOpen(true)}
            className="mt-6 flex items-center gap-2 rounded-xl bg-[#00ffff] px-4 py-2.5 text-sm font-semibold text-black transition-all hover:bg-[#00ffff]/90"
          >
            <UserPlus className="h-4 w-4" />
            {t.trainees.addTrainee}
          </button>
        </div>
      ) : filteredTrainees.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-[#888888]">{t.trainees.noResults} &quot;{searchQuery}&quot;</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTrainees.map((trainee) => (
            <TraineeCard
              key={trainee.id}
              trainee={trainee}
              isOverLimit={trainee.isOverLimit}
              onClick={() => onSelectTrainee?.(trainee)}
            />
          ))}
        </div>
      )}

      {/* Add Trainee Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="border-[#00ffff]/30 bg-[#0a0a0f] sm:max-w-md" style={{ borderWidth: "1px" }}>
          <DialogHeader>
            <DialogTitle className="text-white">{t.trainees.addDialog.title}</DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-3">
            {addError && (
              <div className="rounded-xl border border-[#ff4444]/20 bg-[#ff4444]/10 px-4 py-3 text-sm text-[#ff4444]">
                {addError}
              </div>
            )}
            <div>
              <label className="mb-2 block text-sm font-medium text-[#888888]">{t.trainees.addDialog.emailLabel}</label>
              <input
                type="email"
                placeholder={t.trainees.addDialog.emailPlaceholder}
                value={newTraineeEmail}
                onChange={(e) => setNewTraineeEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTrainee()}
                className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#161b22] px-4 text-sm text-white placeholder:text-[#555555] focus:border-[#00ffff]/50 focus:outline-none focus:ring-1 focus:ring-[#00ffff]/50"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <button
              onClick={() => { setIsAddDialogOpen(false); setAddError(""); setNewTraineeEmail("") }}
              className="rounded-xl border border-white/[0.08] bg-[#161b22] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1c222b]"
            >
              {t.common.cancel}
            </button>
            <button
              onClick={handleAddTrainee}
              disabled={!newTraineeEmail.trim() || adding}
              className="flex items-center gap-2 rounded-xl bg-[#00ffff] px-4 py-2.5 text-sm font-semibold text-black transition-all hover:bg-[#00ffff]/90 disabled:opacity-50"
            >
              {adding && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {adding ? t.trainees.addDialog.adding : t.trainees.addDialog.add}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
