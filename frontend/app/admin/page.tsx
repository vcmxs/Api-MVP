"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminOverview } from "@/components/admin/admin-overview"
import { AdminUsersView } from "@/components/admin/admin-users-view"
import { AdminFinanceView } from "@/components/admin/admin-finance-view"
import { AdminReferralsView } from "@/components/admin/admin-referrals-view"
import { AdminAuditView } from "@/components/admin/admin-audit-view"
import { Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { getToken, getUserInfo } from "@/lib/api"

export default function AdminDashboard() {
  const router = useRouter()
  const user = getUserInfo()
  const [activeTab, setActiveTab] = useState("overview")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Client-side auth and role guard
  useEffect(() => {
    if (!isMounted) return
    if (!getToken()) {
      router.replace("/login")
      return
    }
    if (user?.role?.toLowerCase() !== "admin") {
      router.replace("/dashboard")
      return
    }
  }, [isMounted, router, user?.role])

  if (!isMounted || !getToken() || user?.role?.toLowerCase() !== "admin") {
    return null
  }

  const changeTab = (tab: string) => {
    setActiveTab(tab)
  }

  const titles: Record<string, { title: string; subtitle: string }> = {
    overview: { title: "Admin Overview", subtitle: "High-level metrics and platform health" },
    users: { title: "User Management", subtitle: "Manage users, coaches, trainees, and subscriptions" },
    finance: { title: "Financials", subtitle: "Revenue metrics and growth" },
    referrals: { title: "Referrals & Payouts", subtitle: "Manage referral commissions" },
    audit: { title: "Audit Logs", subtitle: "System activity and modifications" },
  }

  const header = titles[activeTab] ?? titles.overview
  const mainMargin = sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={changeTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <main className={cn("min-h-screen bg-[#0a0a0f] transition-all duration-300", mainMargin)}>
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
        </header>

        <div className="p-8">
          <div className="mx-auto max-w-7xl space-y-8">
            {activeTab === "overview" && (
              <AdminOverview />
            )}
            {activeTab === "users" && (
              <AdminUsersView />
            )}
            {activeTab === "finance" && (
              <AdminFinanceView />
            )}
            {activeTab === "referrals" && (
              <div className="text-white">Referrals Component (WIP)</div>
            )}
            {activeTab === "audit" && (
              <AdminAuditView />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
