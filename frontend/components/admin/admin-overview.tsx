"use client"

import { useState, useEffect } from "react"
import { Users, UserPlus, Crown, Activity, ShieldAlert, Loader2 } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { KPICard } from "@/components/dashboard/kpi-card"

interface AdminStats {
  total_users: number
  total_coaches: number
  total_trainees: number
  total_admins: number
  active_subscriptions: number
  free_users: number
}

export function AdminOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiFetch<{ stats: AdminStats }>("/admin/stats")
        setStats(data.stats)
      } catch (err) {
        console.error("Failed to load admin stats", err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#00ff88]" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-[#555555]">
        <ShieldAlert className="mb-4 h-12 w-12" />
        <p>Failed to load dashboard metrics</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <KPICard
          title="Total Users"
          value={String(stats.total_users)}
          change={{ value: "", trend: "up" }}
          accentColor="#00ff88"
          icon={<Users className="h-6 w-6" />}
        />
        <KPICard
          title="Active Subscriptions"
          value={String(stats.active_subscriptions)}
          change={{ value: "", trend: "up" }}
          accentColor="#00ffff"
          icon={<Crown className="h-6 w-6" />}
        />
        <KPICard
          title="Free Users"
          value={String(stats.free_users)}
          change={{ value: "", trend: "down" }}
          accentColor="#888888"
          icon={<UserPlus className="h-6 w-6" />}
        />
        <KPICard
          title="Total Coaches"
          value={String(stats.total_coaches)}
          change={{ value: "", trend: "up" }}
          accentColor="#ff4444"
          icon={<Activity className="h-6 w-6" />}
        />
        <KPICard
          title="Total Trainees"
          value={String(stats.total_trainees)}
          change={{ value: "", trend: "up" }}
          accentColor="#ffd700"
          icon={<Users className="h-6 w-6" />}
        />
        <KPICard
          title="Admin Accounts"
          value={String(stats.total_admins)}
          change={{ value: "", trend: "up" }}
          accentColor="#ff00ff"
          icon={<ShieldAlert className="h-6 w-6" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-6">
          <h3 className="mb-4 text-lg font-bold text-white">System Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-[#00ff88]/20 bg-[#00ff88]/5 p-4">
              <span className="text-sm font-medium text-[#888888]">API Status</span>
              <span className="flex items-center gap-2 text-sm font-bold text-[#00ff88]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00ff88] opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00ff88]"></span>
                </span>
                Operational
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#0a0a0f] p-4">
              <span className="text-sm font-medium text-[#888888]">Database Latency</span>
              <span className="text-sm font-bold text-white">~45ms</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#0a0a0f] p-4">
              <span className="text-sm font-medium text-[#888888]">Server Uptime</span>
              <span className="text-sm font-bold text-white">99.9%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
