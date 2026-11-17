"use client"

import { ArrowLeftRight } from "lucide-react"
import { isPlatesUnit, type LoadUnit } from "@/lib/format"
import { useT } from "@/lib/i18n"
import { cn } from "@/lib/utils"

/** Accents of the builders that host the control. */
type LoadUnitAccent = "cyan" | "violet"

/** Highlight used while the row is set to `plates`. */
const ACCENT_ACTIVE: Record<LoadUnitAccent, string> = {
  cyan: "border-[#00ffff]/45 bg-[#00ffff]/10 text-[#00ffff]",
  violet: "border-[#a78bfa]/45 bg-[#a78bfa]/10 text-[#a78bfa]",
}

/**
 * Compact `Kg / Plates` flip switch.
 *
 * It used to get a row of its own under the numeric fields, which pushed the
 * coach note and the rest of the builder down on every exercise. Rendering it
 * where the weight label used to be keeps the load type next to the number it
 * applies to; the sibling label slots are stretched to the same height (`h-5`)
 * so the three inputs stay aligned.
 *
 * A single button instead of a two-segment control: the row is only ~56px wide,
 * so aiming at one half of a switch is busywork — tapping anywhere flips the
 * unit. The label always shows the unit the row is in *now* (a switch reports
 * state, not the next action); the arrows are what signal it can be tapped.
 * Legacy `lb` rows have no equivalent here, so they render as `kg` and the tap
 * moves them to `plates`.
 */
export function LoadUnitToggle({ value, onChange, accent = "cyan", className }: {
  /** Raw `weightUnit` of the row (camelCase key returned by the API). */
  value: string | null | undefined
  onChange: (unit: LoadUnit) => void
  accent?: LoadUnitAccent
  className?: string
}) {
  const { t } = useT()
  const isPlates = isPlatesUnit(value)
  const label = isPlates ? t.workouts.loadPlates : t.workouts.loadKg

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isPlates}
      aria-label={`${t.workouts.loadType}: ${label}`}
      title={`${t.workouts.loadType}: ${label}`}
      onClick={() => onChange(isPlates ? "kg" : "plates")}
      className={cn(
        "inline-flex h-5 min-w-14 max-w-full items-center justify-center gap-1 rounded-md border px-1 text-[9px] font-bold leading-4 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
        isPlates
          ? ACCENT_ACTIVE[accent]
          : "border-white/[0.12] bg-[#0a0a0f] text-[#888888] hover:border-white/25 hover:text-white",
        className,
      )}
    >
      <span className="truncate">{label}</span>
      <ArrowLeftRight aria-hidden className="h-2 w-2 shrink-0 opacity-70" />
    </button>
  )
}
