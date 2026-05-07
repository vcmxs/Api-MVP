"use client"

import { useEffect, useState } from "react"
import { ActivityCard } from "./activity-card"
import { Dumbbell, ClipboardCheck, AlertTriangle, XCircle, Megaphone, Bell, Loader2 } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { formatNotification } from "@/lib/notifications"
import type { RawNotification } from "@/lib/notifications"
import { useT } from "@/lib/i18n"

function notifToActivity(n: RawNotification) {
  const fmt = formatNotification(n)
  const dateStr = n.createdAt ?? n.created_at

  let accentColor = "#888888"
  let icon = <Bell className="h-5 w-5" />

  if (n.type?.includes("completed")) { accentColor = "#00ff88"; icon = <ClipboardCheck className="h-5 w-5" /> }
  else if (n.type?.includes("assigned") || n.type?.includes("workout")) { accentColor = "#00ffff"; icon = <Dumbbell className="h-5 w-5" /> }
  else if (n.type?.includes("expiring")) { accentColor = "#ffd700"; icon = <AlertTriangle className="h-5 w-5" /> }
  else if (n.type?.includes("expired") || n.type?.includes("cancel")) { accentColor = "#ff4444"; icon = <XCircle className="h-5 w-5" /> }
  else if (n.type?.includes("blast") || n.type?.includes("message")) { accentColor = "#a78bfa"; icon = <Megaphone className="h-5 w-5" /> }

  let time = ""
  if (dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) time = "Just now"
    else if (m < 60) time = `${m}m ago`
    else if (m < 1440) time = `${Math.floor(m / 60)}h ago`
    else time = `${Math.floor(m / 1440)}d ago`
  }

  return { id: n.id, title: fmt.title, description: fmt.body, time, accentColor, icon }
}

interface RecentActivityProps {
  onViewAll?: () => void
}

export function RecentActivity({ onViewAll }: RecentActivityProps) {
  const { t } = useT()
  const [activities, setActivities] = useState<ReturnType<typeof notifToActivity>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<{ notifications: RawNotification[] }>("/notifications")
      .then((data) => {
        const unread = (data.notifications ?? []).filter(n => !n.is_read)
        const sorted = unread.sort(
          (a, b) => new Date(b.createdAt ?? b.created_at ?? 0).getTime() - new Date(a.createdAt ?? a.created_at ?? 0).getTime()
        )
        setActivities(sorted.slice(0, 3).map(notifToActivity))
      })
      .catch(() => setActivities([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#888888]">{t.recentActivity.title}</h3>
        <button onClick={onViewAll} className="text-sm font-medium text-[#00ffff] hover:underline">
          {t.recentActivity.viewAll}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[#555555]" />
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-[#161b22] py-10">
          <Bell className="mb-2 h-8 w-8 text-[#333]" />
          <p className="text-sm text-[#555555]">{t.recentActivity.noActivity}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((a) => (
            <ActivityCard
              key={a.id}
              title={a.title}
              description={a.description}
              time={a.time}
              accentColor={a.accentColor}
              icon={a.icon}
            />
          ))}
        </div>
      )}
    </div>
  )
}
