interface ActivityCardProps {
  title: string
  description: string
  time: string
  accentColor: string
  icon: React.ReactNode
}

export function ActivityCard({ title, description, time, accentColor, icon }: ActivityCardProps) {
  return (
    <div
      className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-[#161b22] p-4"
      style={{ borderLeftWidth: "4px", borderLeftColor: accentColor }}
    >
      {/* Colored icon circle with transparent tinted background */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${accentColor}26` }}
      >
        <div style={{ color: accentColor }}>{icon}</div>
      </div>
      
      {/* Content - title colored by type */}
      <div className="min-w-0 flex-1">
        <p className="font-medium" style={{ color: accentColor }}>{title}</p>
        <p className="mt-0.5 truncate text-sm text-[#888888]">{description}</p>
      </div>
      
      {/* Timestamp on right */}
      <span className="shrink-0 text-xs font-medium text-[#555555]">{time}</span>
    </div>
  )
}
