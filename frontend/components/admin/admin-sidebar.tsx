"use client"

import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Gift,
  Activity,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { getUserInfo, clearAuth } from "@/lib/api"
import { useRouter } from "next/navigation"

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
        active ? "text-[#00ff88]" : "text-[#888888] hover:text-white"
      )}
      style={active ? { backgroundColor: "rgba(0,255,136,0.07)" } : undefined}
    >
      {active && (
        <div className="absolute left-0 top-0 h-full bg-[#00ff88]" style={{ width: "4px" }} />
      )}
      <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center", active ? "text-[#00ff88]" : "")}>
        {icon}
      </span>
      {!collapsed && <span>{label}</span>}
    </button>
  )
}

interface AdminSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  collapsed: boolean
  onToggleCollapse: () => void
}

export function AdminSidebar({ activeTab, onTabChange, collapsed, onToggleCollapse }: AdminSidebarProps) {
  const router = useRouter()
  const user = getUserInfo()
  const userInitials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "A"

  const handleLogout = () => {
    clearAuth()
    router.replace("/login")
  }

  const navItems = [
    { id: "overview", icon: <LayoutDashboard className="h-5 w-5" />, label: "Overview" },
    { id: "users", icon: <Users className="h-5 w-5" />, label: "User Management" },
    { id: "finance", icon: <DollarSign className="h-5 w-5" />, label: "Financials" },
    { id: "referrals", icon: <Gift className="h-5 w-5" />, label: "Referrals" },
    { id: "audit", icon: <Activity className="h-5 w-5" />, label: "Audit Logs" },
  ]

  const layoutClasses = collapsed
    ? "w-64 -translate-x-full lg:w-16 lg:translate-x-0"
    : "w-64 translate-x-0"

  return (
    <aside className={cn("fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-white/[0.08] bg-[#0a0a0f] transition-all duration-300", layoutClasses, collapsed ? "" : "max-lg:shadow-2xl")}>
      <div className={cn("flex h-20 items-center border-b border-white/[0.08]", collapsed ? "justify-center px-2" : "justify-between px-4")}>
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden">
              <img src="/logo192.png" alt="Dupla Logo" className="h-full w-full object-contain" />
            </div>
            <span className="text-xl font-bold text-white">Admin Panel</span>
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
            collapsed && "absolute -right-3.5 top-8 z-50 border border-white/[0.08] bg-[#161b22]"
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

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

      {!collapsed && (
        <div className="border-t border-white/[0.08] p-4">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-[#00ff88] to-[#00ffff]">
              <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-black">
                {userInitials}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-medium text-white">{user?.name ?? "Admin"}</p>
              </div>
              <p className="truncate text-xs text-[#555555] capitalize">{user?.role ?? "Admin"}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#161b22] px-3 py-2 text-sm font-medium text-[#888888] transition-colors hover:border-[#ff4444]/30 hover:text-[#ff4444]"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
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
