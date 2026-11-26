"use client"

import { useState } from "react"
import { Check, Dumbbell, Loader2, Plus, Trash2 } from "lucide-react"
import { NumberField } from "@/components/ui/number-field"
import { apiFetch, getUserInfo } from "@/lib/api"
import { useT } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import {
  buildPrescriptionPayload,
  countLoggedSets,
  findDroppedLogSets,
  newDraftExercise,
  toDraftExercise,
  type DraftExercise,
  type PrescriptionPlan,
  type PrescriptionSaveResult,
} from "@/lib/workout-prescription"
import { ExercisePickerSheet, type PickedExercise } from "./exercise-picker-sheet"
import { LoadUnitToggle } from "./load-unit-toggle"
import {
  DragHandle, ReorderArrows, SupersetToggle, linkedGroupSize, linkRingClass, moveItem, useExerciseReorder,
} from "./exercise-reorder"

/**
 * In-place prescription editor.
 *
 * It replaces the read-only exercise list of a session while the routine is being
 * retuned: drag & drop to reorder, a bin per exercise, an "add exercise" button and
 * the sets/reps/load fields right on the card. The whole list is a local draft, so
 * cancelling never touches the database and saving is a single
 * `PUT /workout-plans/:id` — the route applies it as a diff by row id, which is what
 * keeps every logged set of the exercises that stay in the list.
 *
 * Both hosts (the session sheet and the coach's trainee detail) mount this same
 * component; nothing here knows which one it is in.
 */
export function WorkoutPrescriptionEditor({ plan, targetUserId, subjectName, onCancel, onSaved }: {
  /** The plan being retuned, with `exercises` and their `logs` as the detail route returns them. */
  plan: PrescriptionPlan
  /** Whose history the exercise picker shows. Defaults to the signed-in user. */
  targetUserId?: number
  subjectName?: string | null
  onCancel: () => void
  /** Called with the number of logged sets the save had to drop (0 when none). */
  onSaved: (deletedLogs: number) => void
}) {
  const { t } = useT()
  const user = getUserInfo()
  const [draft, setDraft] = useState<DraftExercise[]>(() =>
    (plan.exercises ?? [])
      .slice()
      .sort((a, b) => (a.exerciseOrder ?? 0) - (b.exerciseOrder ?? 0))
      .map((ex) => toDraftExercise(ex, user?.id))
  )
  const [picker, setPicker] = useState<{ mode: "add" } | { mode: "change"; rowId: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // The grip, the long-press on the card and the up/down arrows all funnel into
  // this one move, exactly like the create builder does.
  const reorder = useExerciseReorder((from, to) => setDraft((prev) => moveItem(prev, from, to)))

  const patchRow = (rowId: string, patch: Partial<DraftExercise>) =>
    setDraft((prev) => prev.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)))

  const removeRow = (rowId: string) => setDraft((prev) => prev.filter((row) => row.rowId !== rowId))

  const toggleSuperset = (index: number) =>
    setDraft((prev) => prev.map((row, i) => (i === index ? { ...row, isSuperset: !row.isSuperset } : row)))

  const handlePicked = (picked: PickedExercise) => {
    if (picker?.mode === "change") {
      // Swapping the movement unlinks the row from its plan row: keeping the id
      // would leave the old exercise's logs hanging from a different exercise.
      patchRow(picker.rowId, {
        name: picked.name,
        isCardio: picked.isCardio,
        exerciseId: undefined,
        logs: [],
      })
    } else {
      setDraft((prev) => [...prev, newDraftExercise(picked.name, picked.isCardio)])
    }
    setPicker(null)
  }

  const handleSave = async () => {
    if (saving) return
    if (!draft.some((row) => row.name.trim())) {
      setError(t.workouts.prescriptionEmpty)
      return
    }

    // Adding or reordering exercises keeps every logged set, so the warning is
    // raised only when this save would actually drop some.
    const losing = findDroppedLogSets(draft, plan.exercises)
    if (losing.length > 0) {
      const names = losing.length > 3
        ? `${losing.slice(0, 3).join(", ")} +${losing.length - 3}`
        : losing.join(", ")
      if (!window.confirm(t.workouts.editLogsWarning.replace("{exercises}", names))) return
    }

    setSaving(true)
    setError("")
    try {
      const saved = await apiFetch<PrescriptionSaveResult>(`/workout-plans/${plan.id}`, {
        method: "PUT",
        body: JSON.stringify({
          // The update route requires the name whenever the exercise list travels
          // with it; the sheet decides what the plan is called, not this editor.
          name: plan.name,
          description: plan.description ?? "",
          scheduledDate: plan.scheduledDate ? plan.scheduledDate.split("T")[0] : undefined,
          exercises: buildPrescriptionPayload(draft, plan.exercises, user ?? undefined),
        }),
      })
      onSaved(saved?.deletedLogs ?? 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : t.workouts.updateError)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-[#00ffff]">{t.workouts.editModeTitle}</p>
      <p className="rounded-xl border border-white/[0.08] bg-[#161b22] px-3 py-2 text-[11px] leading-relaxed text-[#888888]">
        {t.workouts.prescriptionHint}
      </p>

      {draft.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/[0.12] py-8 text-[#555555]">
          <Dumbbell className="h-7 w-7" />
          <p className="text-xs">{t.workouts.prescriptionEmpty}</p>
        </div>
      )}

      {draft.map((row, index) => {
        const groupSize = linkedGroupSize(draft, index)
        const logged = countLoggedSets(row.logs)
        const trimsLogs = logged.maxSet > row.sets
        return (
          <div key={row.rowId}>
            {/* Pill between two rows: links this exercise to the one above. */}
            {index > 0 && (
              <SupersetToggle
                active={row.isSuperset}
                groupSize={groupSize}
                onToggle={() => toggleSuperset(index)}
                className="py-1.5"
              />
            )}
            <div
              {...reorder.rowProps(index)}
              className={cn(
                "rounded-2xl border border-white/[0.08] bg-[#161b22] p-3",
                linkRingClass(groupSize),
                reorder.isDropTarget(index) && "border-[#00ffff]/60 bg-[#00ffff]/[0.06]",
              )}
            >
              <div className="flex items-center gap-1.5">
                <DragHandle index={index} reorder={reorder} />
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#0a0a0f] text-[10px] font-bold text-[#555555]">
                  {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => setPicker({ mode: "change", rowId: row.rowId })}
                  title={t.programs.selectExercise}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/[0.08] bg-[#0a0a0f] px-2 py-1.5 text-left text-xs font-medium text-white transition-colors hover:border-[#00ffff]/40"
                >
                  <Dumbbell className="h-3 w-3 shrink-0 text-[#555555]" />
                  <span className="truncate">{row.name || t.programs.selectExercise}</span>
                  {row.isCardio && (
                    <span
                      className="shrink-0 rounded px-1 text-[9px] font-bold uppercase"
                      style={{ backgroundColor: "rgba(0,255,255,0.12)", color: "#00ffff" }}
                    >
                      {t.programs.cardio}
                    </span>
                  )}
                </button>
                <ReorderArrows index={index} total={draft.length} reorder={reorder} className="md:hidden" />
                <button
                  type="button"
                  onClick={() => removeRow(row.rowId)}
                  title={t.workouts.removeExercise}
                  aria-label={`${t.workouts.removeExercise}: ${row.name}`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#555555] transition-colors hover:bg-[#ff4444]/10 hover:text-[#ff4444]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {logged.total > 0 && (
                <p
                  className={cn(
                    "mt-2 rounded-lg px-2 py-1 text-[10px] font-semibold",
                    trimsLogs ? "bg-[#ffd700]/10 text-[#ffd700]" : "bg-[#00ff88]/10 text-[#00ff88]",
                  )}
                >
                  {t.workouts.loggedSets.replace("{count}", String(logged.total))}
                  {trimsLogs ? ` — ${t.workouts.loggedSetsTrim}` : ""}
                </p>
              )}

              <div className={cn("mt-2 grid gap-2", row.isCardio ? "grid-cols-2" : "grid-cols-3")}>
                <div>
                  <label className="mb-0.5 flex h-5 items-center text-[9px] text-[#555555]">
                    {t.workouts.setsLabel}
                  </label>
                  <NumberField
                    value={row.sets}
                    decimal={false}
                    min={0}
                    max={50}
                    aria-label={t.workouts.setsLabel}
                    onChange={(v) => patchRow(row.rowId, { sets: v })}
                    className="bg-[#0a0a0f]"
                  />
                </div>
                {row.isCardio ? (
                  <div>
                    <label className="mb-0.5 flex h-5 items-center text-[9px] text-[#555555]">
                      {t.workouts.durationLabel}
                    </label>
                    <NumberField
                      value={row.reps}
                      min={0}
                      max={999}
                      aria-label={t.workouts.durationLabel}
                      onChange={(v) => patchRow(row.rowId, { reps: v })}
                      className="bg-[#0a0a0f]"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="mb-0.5 flex h-5 items-center text-[9px] text-[#555555]">
                        {t.workouts.repsLabel}
                      </label>
                      <NumberField
                        value={row.reps}
                        decimal={false}
                        min={0}
                        max={999}
                        aria-label={t.workouts.repsLabel}
                        onChange={(v) => patchRow(row.rowId, { reps: v })}
                        className="bg-[#0a0a0f]"
                      />
                    </div>
                    <div>
                      <div className="mb-0.5 flex h-5 items-center">
                        <LoadUnitToggle
                          value={row.weightUnit}
                          onChange={(unit) => patchRow(row.rowId, { weightUnit: unit })}
                        />
                      </div>
                      <NumberField
                        value={row.weight}
                        min={0}
                        max={2000}
                        aria-label={t.workouts.weightColumn}
                        onChange={(v) => patchRow(row.rowId, { weight: v })}
                        className="bg-[#0a0a0f]"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })}

      <button
        type="button"
        onClick={() => setPicker({ mode: "add" })}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.15] py-3 text-xs font-semibold text-[#888888] transition-colors hover:border-[#00ffff]/50 hover:text-[#00ffff]"
      >
        <Plus className="h-4 w-4" />
        {t.workouts.addExercise}
      </button>

      {error && <p role="alert" className="text-xs text-[#ff7777]">{error}</p>}

      {/* Sticky so a long routine can still be saved without scrolling back up. */}
      <div className="sticky bottom-0 z-10 rounded-xl border border-white/[0.08] bg-[#0a0a0f]/95 p-2 backdrop-blur">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="flex-1 rounded-lg border border-white/[0.15] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1c2128] disabled:opacity-40"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex flex-[2] items-center justify-center gap-2 rounded-lg bg-[#00ff88] py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? t.common.saving : t.workouts.saveChanges}
          </button>
        </div>
      </div>

      <ExercisePickerSheet
        open={picker !== null}
        onOpenChange={(next) => { if (!next) setPicker(null) }}
        onSelect={handlePicked}
        targetUserId={targetUserId}
        subjectName={subjectName}
      />
    </div>
  )
}
