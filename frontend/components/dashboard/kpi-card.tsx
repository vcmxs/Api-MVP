"use client"

import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"

interface KPICardProps {
  title: string
  value: string
  change: {
    value: string
    trend: "up" | "down"
  }
  accentColor: string
  icon: React.ReactNode
  clickable?: boolean
  onClick?: () => void
}

export function KPICard({ title, value, change, accentColor, icon, clickable, onClick }: KPICardProps) {
  const Component = clickable ? "button" : "div"
  
  return (
    <Component
      onClick={clickable ? onClick : undefined}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#161b22] p-6 text-left w-full",
        clickable && "cursor-pointer transition-all hover:border-[#00ffff]/30 hover:shadow-[0_0_30px_rgba(0,255,255,0.15)]"
      )}
      style={{ 
        borderLeftWidth: "4px", 
        borderLeftColor: accentColor,
        boxShadow: `0 0 40px ${accentColor}10, inset 0 1px 0 rgba(255,255,255,0.05)`
      }}
    >
      {/* Subtle glow effect */}
      <div 
        className="pointer-events-none absolute -left-20 -top-20 h-40 w-40 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: accentColor }}
      />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-wider text-[#888888]">{title}</p>
          <p 
            className="text-5xl tracking-tight text-white"
            style={{ fontWeight: 300 }}
          >
            {value}
          </p>
          {change.value && (
            <div className="flex items-center gap-1.5">
              {change.trend === "up" ? (
                <TrendingUp className="h-4 w-4 text-[#00ff88]" />
              ) : (
                <TrendingDown className="h-4 w-4 text-[#ff4444]" />
              )}
              <span
                className={cn(
                  "text-sm font-medium",
                  change.trend === "up" ? "text-[#00ff88]" : "text-[#ff4444]"
                )}
              >
                {change.value}
              </span>
              <span className="text-sm text-[#555555]">vs last month</span>
            </div>
          )}
        </div>
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${accentColor}15` }}
        >
          <div style={{ color: accentColor }}>{icon}</div>
        </div>
      </div>
    </Component>
  )
}
