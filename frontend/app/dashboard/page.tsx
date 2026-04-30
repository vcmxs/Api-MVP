"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/dashboard/sidebar"
import { KPICard } from "@/components/dashboard/kpi-card"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { TraineesView } from "@/components/dashboard/trainees-view"
import type { ApiTrainee } from "@/components/dashboard/trainees-view"
import { TraineeDetail } from "@/components/dashboard/trainee-detail"
import { TraineeOverview } from "@/components/dashboard/trainee-overview"
import { WorkoutsView } from "@/components/dashboard/workouts-view"
import { MessagesView } from "@/components/dashboard/messages-view"
import { InsightsView } from "@/components/dashboard/insights-view"
import { ProgressionView } from "@/components/dashboard/progression-view"
import { RevenueView } from "@/components/dashboard/revenue-view"
import { WinWinView } from "@/components/dashboard/winwin-view"
import { NotificationsView } from "@/components/dashboard/notifications-view"
import { ProgramsView } from "@/components/dashboard/programs-view"
import { SettingsView } from "@/components/dashboard/settings-view"
import { NutritionView } from "@/components/dashboard/nutrition-view"
import { BlastMessageModal } from "@/components/dashboard/blast-message-modal"
import { Users, DollarSign, Bell, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { getToken, getUserInfo, apiFetch } from "@/lib/api"
import { formatNotification } from "@/lib/notifications"
import { useT } from "@/lib/i18n"


// ── Notification bell helpers ─────────────────────────────────────────────

interface BellNotif {
  id: number
  type: string
  title: string
  body?: string
  message?: string
  createdAt?: string
  created_at?: string
  is_read: boolean
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return ""
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "Just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Dashboard ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { t } = useT()

  const [activeTab, setActiveTab] = useState("overview")
  const [selectedTrainee, setSelectedTrainee] = useState<ApiTrainee | null>(null)
  const [progressionSubject, setProgressionSubject] = useState<{ id: number; name: string } | null>(null)
  const [messageTargetId, setMessageTargetId] = useState<number | null>(null)
  const [nutritionSubject, setNutritionSubject] = useState<{ id: number; name: string } | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [blastOpen, setBlastOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // KPI state
  const [traineeCount, setTraineeCount] = useState<number | null>(null)
  const [revenue, setRevenue] = useState<{ amount: string; growth: string; direction: string } | null>(null)

  // Bell notifications state
  const [bellNotifs, setBellNotifs] = useState<BellNotif[]>([])
  const unreadCount = bellNotifs.filter((n) => !n.is_read).length

  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarCollapsed(true)
    }
  }, [])

  // Resolve user ONLY on client — never during SSR
  const user = isMounted ? getUserInfo() : null
  const userInitials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "??"

  // Auth guard
  useEffect(() => {
    if (!isMounted) return
    if (!getToken()) {
      router.replace("/login")
      return
    }
    const userInfo = getUserInfo()
    if (userInfo?.role?.toLowerCase() === "admin") {
      router.replace("/admin")
      return
    }
  }, [isMounted, router])

  // Fetch KPI data — hooks MUST be declared before any conditional returns
  const fetchKPIs = useCallback(async () => {
    const u = getUserInfo()
    if (!u?.id) return
    try {
      const data = await apiFetch<{ trainees: ApiTrainee[] }>(`/coaches/${u.id}/trainees`)
      setTraineeCount((data.trainees ?? []).length)
    } catch { /* non-critical */ }
    try {
      const rev = await apiFetch<{ revenue: string; revenueGrowth: string; revenueDirection: string }>(
        `/coaches/${u.id}/monthly-revenue`
      )
      setRevenue({ amount: rev.revenue ?? "0", growth: rev.revenueGrowth ?? "0%", direction: rev.revenueDirection ?? "neutral" })
    } catch { /* non-critical */ }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch bell notifications
  const fetchBellNotifs = useCallback(async () => {
    try {
      const data = await apiFetch<{ notifications: BellNotif[] }>("/notifications")
      setBellNotifs(
        (data.notifications ?? [])
          .sort((a, b) => new Date(b.createdAt ?? b.created_at ?? 0).getTime() - new Date(a.createdAt ?? a.created_at ?? 0).getTime())
          .slice(0, 5)
      )
    } catch { /* non-critical */ }
  }, [])

  useEffect(() => {
    if (!isMounted) return
    fetchKPIs()
    fetchBellNotifs()
  }, [isMounted, fetchKPIs, fetchBellNotifs])

  // Close bell on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
    }
    if (bellOpen) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [bellOpen])

  // ── All hooks above this line — conditional returns are safe now ──
  if (!isMounted) return null
  if (!getToken() || user?.role?.toLowerCase() === "admin") return null

  const changeTab = (tab: string, opts?: { keep?: boolean }) => {
    setActiveTab(tab)
    setSelectedTrainee(null)
    setBellOpen(false)
    if (!opts?.keep) {
      setNutritionSubject(null)
      setProgressionSubject(null)
      setMessageTargetId(null)
    }
  }

  const header = selectedTrainee && activeTab === "trainees"
    ? t.header.traineeProfile
    : (t.header as Record<string, { title: string; subtitle: string }>)[activeTab] ?? t.header.overview

  const mainMargin = sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Mobile Sidebar Overlay */}
      {!sidebarCollapsed && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
      <Sidebar
        activeTab={activeTab}
        onTabChange={changeTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <main className={cn("min-h-screen bg-[#0a0a0f] transition-all duration-300", mainMargin)}>
        {/* Header */}
        <header className="flex h-20 items-center justify-between bg-[#0a0a0f] px-8" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-[#161b22] text-[#888888] transition-colors hover:text-white lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">{header.title}</h1>
              <p className="text-sm text-[#888888]">{header.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div ref={bellRef} className="relative">
              <button
                onClick={() => { setBellOpen(!bellOpen); if (!bellOpen) fetchBellNotifs() }}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#161b22] text-[#888888] transition-colors hover:text-white"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#ff4444] text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-white/[0.08] bg-[#161b22] shadow-2xl">
                  <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
                    <span className="text-sm font-bold text-white">{t.notifications.title}</span>
                    <button
                      onClick={() => { changeTab("notifications"); setBellOpen(false) }}
                      className="text-xs font-medium text-[#00ffff] hover:underline"
                    >
                      {t.common.viewAll}
                    </button>
                  </div>
                  {bellNotifs.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-[#555555]">{t.notifications.noNotifications}</p>
                  ) : (
                    <div className="divide-y divide-white/[0.05]">
                      {bellNotifs.map((n) => {
                        const fmt = formatNotification(n)
                        return (
                          <div key={n.id} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]">
                            <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.is_read ? "bg-[#333]" : "bg-[#00ffff]"}`} />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-white">{fmt.title}</p>
                              {fmt.body && (
                                <p className="truncate text-xs text-[#888888]">{fmt.body}</p>
                              )}
                            </div>
                            <span className="shrink-0 text-xs text-[#555555]">
                              {timeAgo(n.createdAt ?? n.created_at)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div className="border-t border-white/[0.08] px-4 py-2">
                    <button
                      onClick={() => { changeTab("notifications"); setBellOpen(false) }}
                      className="w-full rounded-xl py-2 text-sm font-medium text-[#888888] transition-colors hover:bg-white/[0.05] hover:text-white"
                    >
                      {t.notifications.seeAll}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar */}
            <div
              title={user?.name ?? ""}
              className="relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-full bg-gradient-to-br from-[#00ffff] to-[#00ff88]"
            >
              <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-black">
                {userInitials}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8">
          <div className="mx-auto max-w-6xl space-y-8">

            {activeTab === "overview" && (
              user?.role === "trainee" ? (
                <TraineeOverview onChangeTab={changeTab} />
              ) : (
                <>
                  <div className="grid gap-6 md:grid-cols-2">
                    <KPICard
                      title={t.kpi.activeTrainees}
                      value={traineeCount !== null ? String(traineeCount) : "—"}
                      change={{ value: "", trend: "up" }}
                      accentColor="#00ffff"
                      icon={<Users className="h-6 w-6" />}
                      clickable
                      onClick={() => changeTab("trainees")}
                    />
                    <KPICard
                      title={t.kpi.monthlyRevenue}
                      value={revenue ? `$${Number(revenue.amount).toLocaleString()}` : "—"}
                      change={revenue ? { value: revenue.growth, trend: revenue.direction === "up" ? "up" : "down" } : { value: "", trend: "up" }}
                      accentColor="#00ff88"
                      icon={<DollarSign className="h-6 w-6" />}
                      clickable
                      onClick={() => changeTab("insights")}
                    />
                  </div>

                  <QuickActions
                    onAddTrainee={() => changeTab("trainees")}
                    onNewWorkout={() => changeTab("workouts")}
                    onCreateProgram={() => changeTab("programs")}
                    onBlastMessage={() => setBlastOpen(true)}
                  />

                  <RecentActivity onViewAll={() => changeTab("notifications")} />
                </>
              )
            )}

            {activeTab === "trainees" && !selectedTrainee && (
              <TraineesView onSelectTrainee={(tr) => setSelectedTrainee(tr)} />
            )}

            {activeTab === "trainees" && selectedTrainee && (
              <TraineeDetail
                trainee={selectedTrainee}
                onBack={() => setSelectedTrainee(null)}
                onOpenProgression={(tr) => { setProgressionSubject(tr); changeTab("progression", { keep: true }) }}
                onOpenMessages={(id) => { setMessageTargetId(id); changeTab("messages", { keep: true }) }}
                onOpenNutrition={(tr) => { setNutritionSubject(tr); changeTab("nutrition", { keep: true }) }}
              />
            )}

            {activeTab === "workouts" && <WorkoutsView />}
            {activeTab === "messages" && <MessagesView defaultTraineeId={messageTargetId} />}
            {activeTab === "insights" && <InsightsView />}
            {activeTab === "progression" && <ProgressionView defaultSubject={progressionSubject} />}
            {activeTab === "revenue" && <RevenueView />}
            {activeTab === "winwin" && <WinWinView />}
            {activeTab === "notifications" && <NotificationsView />}
            {activeTab === "nutrition" && <NutritionView targetUser={nutritionSubject} />}
            {activeTab === "programs" && <ProgramsView />}
            {activeTab === "settings" && <SettingsView />}
          </div>
        </div>
      </main>

      <BlastMessageModal open={blastOpen} onOpenChange={setBlastOpen} />
    </div>
  )
}
