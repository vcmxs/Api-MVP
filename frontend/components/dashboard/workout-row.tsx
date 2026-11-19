"use client"

import { CheckCircle2, ChevronRight, Dumbbell, Users } from "lucide-react"
import { useT } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { getWorkoutStatusStyle, normalizeWorkoutStatus } from "@/lib/workout-status"

/** One row of `GET /agenda/today` (see controllers/agenda.controller.js). */
export interface AgendaWorkout {
  id: string
  traineeId: string
  traineeName: string
  traineeEmail?: string
  name: string
  status: string
  scheduledDate: string
  exerciseCount: number
  isCoachAssigned?: boolean
  isShared?: boolean
  /** True when the signed-in user is the trainee of this plan. */
  isMine?: boolean
}

interface WorkoutRowProps {
  workout: AgendaWorkout
  /** Omit to render a non-interactive row. */
  onOpen?: () => void
}

export function WorkoutRow({ workout, onOpen }: WorkoutRowProps) {
  const { t } = useT()
  const status = normalizeWorkoutStatus(workout.status)
  const style = getWorkoutStatusStyle(workout.status)
  const isDone = status === "completed"
  const exerciseLabel = workout.exerciseCount === 1 ? t.workouts.exercise : t.workouts.exercises

  // The caller's own routine leads with the routine name (their own name would
  // just repeat the cyan icon); every other row leads with the trainee it
  // belongs to, which is the piece of information you scan for.
  const isMine = workout.isMine === true
  const showOwnerFirst = !isMine

  // Same convention as the workout cards: gold edge while a coach prescription
  // is still pending, green once finished, neutral otherwise.
  const edgeColor = isDone
    ? "rgba(0,255,136,0.45)"
    : workout.isCoachAssigned
      ? "#ffd700"
      : "rgba(255,255,255,0.06)"

  // Own routines are always cyan so "that one is mine" reads before the status.
  const iconColor = isMine ? "#00ffff" : style.text
  const iconBg = isMine ? "rgba(0,255,255,0.10)" : `${style.text}18`

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!onOpen}
      aria-label={`${workout.name} · ${workout.traineeName}`}
      className={cn(
        "group flex min-h-[64px] w-full items-center gap-3 rounded-xl border border-l-2 border-white/[0.06] bg-[#0f141a] p-3 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ffff]/50",
        onOpen ? "hover:border-white/[0.14] hover:bg-[#161b22]" : "cursor-default"
      )}
      style={{ borderLeftColor: edgeColor }}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: iconBg, color: iconColor }}
      >
        {isDone ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : workout.isCoachAssigned ? (
          <Users className="h-4 w-4" />
        ) : (
          <Dumbbell className="h-5 w-5" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-bold text-white">
            {showOwnerFirst ? workout.traineeName : workout.name}
          </span>
          {workout.isShared && (
            <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: "rgba(255,68,68,0.15)", color: "#ff4444" }}>
              {t.workouts.coOp}
            </span>
          )}
        </span>
        <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-[#888888]">
          {showOwnerFirst && (
            <>
              <span className="truncate">{workout.name}</span>
              <span aria-hidden="true" className="text-[#444444]">·</span>
            </>
          )}
          <span className="shrink-0">{workout.exerciseCount} {exerciseLabel}</span>
        </span>
      </span>

      <span
        className="shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
        style={{ backgroundColor: style.bg, color: style.text }}
      >
        {t.workouts[style.labelKey]}
      </span>

      {onOpen && (
        <ChevronRight className="h-4 w-4 shrink-0 text-[#555555] transition-colors group-hover:text-white" />
      )}
    </button>
  )
}
