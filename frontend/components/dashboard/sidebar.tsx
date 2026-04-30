"use client"

import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  ClipboardList,
  MessageSquare,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Gift,
  Apple,
} from "lucide-react"
import { getUserInfo, clearAuth, apiFetch } from "@/lib/api"
import { useT } from "@/lib/i18n"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

const tierColors: Record<string, string> = {
  starter: "#888888",
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  gold: "#ffd700",
  olympian: "#85a9f7",
  STARTER: "#888888",
  BRONZE: "#cd7f32",
  SILVER: "#c0c0c0",
  GOLD: "#ffd700",
  OLYMPIAN: "#85a9f7",
  PLATINUM: "#e5e4e2",
}

interface NavItemProps {
  icon: React.ReactNode
  label: string
  active?: boolean
  collapsed?: boolean
  onClick?: () => void
}

function NavItem({ icon, label, active, collapsed, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        "relative flex w-full items-center gap-3 py-3 text-sm font-medium transition-all",
        collapsed ? "justify-center px-2" : "px-4",
        active ? "text-[#00ffff]" : "text-[#888888] hover:text-white"
      )}
      style={active ? { backgroundColor: "rgba(0,255,255,0.07)" } : undefined}
    >
      {active && (
        <div className="absolute left-0 top-0 h-full bg-[#00ffff]" style={{ width: "4px" }} />
      )}
      <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center", active ? "text-[#00ffff]" : "")}>
        {icon}
      </span>
      {!collapsed && <span>{label}</span>}
    </button>
  )
}

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  collapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({ activeTab, onTabChange, collapsed, onToggleCollapse }: SidebarProps) {
  const router = useRouter()
  const { t } = useT()
  const user = getUserInfo()
  const userInitials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?"

  const [tier, setTier] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    apiFetch<{ subscriptionTier?: string; status?: string }>(`/users/${user.id}/profile`)
      .then((data) => setTier(data.subscriptionTier ?? null))
      .catch(() => {})
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const tierColor = tier ? (tierColors[tier] ?? tierColors[tier.toLowerCase()] ?? "#888888") : null

  const handleLogout = () => {
    clearAuth()
    router.replace("/login")
  }

  const isTrainee = user?.role === "trainee"

  const navItems = isTrainee
    ? [
        { id: "overview",      icon: <LayoutDashboard className="h-5 w-5" />, label: t.nav.overview },
        { id: "workouts",      icon: <Dumbbell className="h-5 w-5" />,        label: t.nav.workouts },
        { id: "messages",      icon: <MessageSquare className="h-5 w-5" />,   label: t.nav.messages },
        { id: "nutrition",     icon: <Apple className="h-5 w-5" />,           label: t.nav.nutrition },
        { id: "progression",   icon: <TrendingUp className="h-5 w-5" />,      label: t.nav.progression },
        { id: "notifications", icon: <Bell className="h-5 w-5" />,            label: t.nav.notifications },
      ]
    : [
        { id: "overview",      icon: <LayoutDashboard className="h-5 w-5" />, label: t.nav.overview },
        { id: "trainees",      icon: <Users className="h-5 w-5" />,           label: t.nav.trainees },
        { id: "workouts",      icon: <Dumbbell className="h-5 w-5" />,        label: t.nav.workouts },
        { id: "programs",      icon: <ClipboardList className="h-5 w-5" />,   label: t.nav.programs },
        { id: "messages",      icon: <MessageSquare className="h-5 w-5" />,   label: t.nav.messages },
        { id: "insights",      icon: <BarChart3 className="h-5 w-5" />,       label: t.nav.insights },
        { id: "nutrition",     icon: <Apple className="h-5 w-5" />,           label: t.nav.nutrition },
        { id: "progression",   icon: <TrendingUp className="h-5 w-5" />,      label: t.nav.progression },
        { id: "revenue",       icon: <DollarSign className="h-5 w-5" />,      label: t.nav.revenue },
        { id: "winwin",        icon: <Gift className="h-5 w-5" />,            label: t.nav.winwin },
        { id: "notifications", icon: <Bell className="h-5 w-5" />,            label: t.nav.notifications },
      ]


  const layoutClasses = collapsed
    ? "w-64 -translate-x-full lg:w-16 lg:translate-x-0"
    : "w-64 translate-x-0"

  return (
    <aside className={cn("fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-white/[0.08] bg-[#0a0a0f] transition-all duration-300", layoutClasses, collapsed ? "" : "max-lg:shadow-2xl")}>
      {/* Logo + collapse toggle */}
      <div className={cn("flex h-20 items-center border-b border-white/[0.08]", collapsed ? "justify-center px-2" : "justify-between px-4")}>
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden">
              <img src="/logo192.png" alt="Dupla Logo" className="h-full w-full object-contain" />
            </div>
            <span className="text-xl font-bold text-white">Dupla</span>
          </div>
        )}
        {collapsed && (
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden">
            <img src="/logo192.png" alt="Dupla Logo" className="h-full w-full object-contain" />
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-[#161b22] text-[#888888] transition-colors hover:text-white",
            collapsed && "absolute -right-3.5 top-8 z-50 border border-white/[0.08] bg-[#161b22]",
            "max-lg:hidden"
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {navItems.map((item) => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={activeTab === item.id}
            collapsed={collapsed}
            onClick={() => {
              onTabChange(item.id)
              if (typeof window !== "undefined" && window.innerWidth < 1024 && !collapsed) {
                onToggleCollapse()
              }
            }}
          />
        ))}
      </nav>

      {/* Settings */}
      <div className="border-t border-white/[0.08] py-2">
        <NavItem
          icon={<Settings className="h-5 w-5" />}
          label={t.nav.settings}
          active={activeTab === "settings"}
          collapsed={collapsed}
          onClick={() => {
            onTabChange("settings")
            if (typeof window !== "undefined" && window.innerWidth < 1024 && !collapsed) {
              onToggleCollapse()
            }
          }}
        />
      </div>

      {/* User Profile Section */}
      {!collapsed && (
        <div className="border-t border-white/[0.08] p-4">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-[#00ffff] to-[#00ff88]">
              <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-black">
                {userInitials}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-medium text-white">{user?.name ?? "—"}</p>
                {tier && tierColor && (
                  <span
                    className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                    style={{ backgroundColor: `${tierColor}22`, color: tierColor }}
                  >
                    {tier}
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-[#555555] capitalize">{user?.role ?? "Coach"}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#161b22] px-3 py-2 text-sm font-medium text-[#888888] transition-colors hover:border-[#ff4444]/30 hover:text-[#ff4444]"
          >
            <LogOut className="h-4 w-4" />
            <span>{t.nav.logout}</span>
          </button>
        </div>
      )}

      {collapsed && (
        <div className="flex justify-center border-t border-white/[0.08] p-2">
          <button
            onClick={handleLogout}
            title="Log out"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[#888888] transition-colors hover:text-[#ff4444]"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      )}
    </aside>
  )
}
