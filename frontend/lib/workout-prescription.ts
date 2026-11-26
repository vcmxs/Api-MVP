import { getCoachNoteDraft, serializeCoachNote } from "@/lib/exercise-notes"
import { normalizeLoadUnit, type LoadUnit } from "@/lib/format"

/**
 * Shared prescription editing model.
 *
 * Every screen that retunes a routine in place (the session sheet and the coach's
 * trainee detail) works on the same draft rows, saves them with the same payload
 * and warns about data loss with the same rule, so the three pieces live here
 * instead of being copied into each builder.
 *
 * The rule the whole edit flow rests on: `PUT /workout-plans/:id` applies the
 * exercise list as a diff by row id (see `Workout.replaceExercises`). A row that
 * keeps its id is updated in place and keeps its `exercise_logs`; only removing a
 * row, or lowering its `sets` below the highest logged set, destroys data.
 */

/** A set the trainee already logged for an exercise of the plan being edited. */
export interface PrescriptionLog {
  set_number?: number
  setNumber?: number
  completed?: boolean
  is_completed?: boolean
}

/** Plan row exactly as the detail routes return it (`GET /workout-plans/:id`). */
export interface PrescriptionExercise {
  id: number | string
  name: string
  sets: number
  reps: number
  targetWeight?: number
  target_weight?: number
  weightUnit?: string
  weight_unit?: string
  notes?: string
  exerciseOrder?: number
  is_cardio?: boolean | number
  isCardio?: boolean | number
  track_rpe?: boolean | number
  trackRpe?: boolean | number
  track_rir?: boolean | number
  trackRir?: boolean | number
  rpe?: number | null
  rir?: number | null
  targetDistance?: number
  targetDuration?: number
  target_distance?: number
  target_duration?: number
  restTime?: number
  rest_time?: number
  logs?: PrescriptionLog[]
}

/** The plan the editors are retuning; only these fields are ever sent back. */
export interface PrescriptionPlan {
  id: number
  name: string
  description?: string
  scheduledDate?: string
  exercises?: PrescriptionExercise[]
}

/**
 * One editable prescription row.
 *
 * `exerciseId` is the plan row this entry came from. Sending it back is what
 * makes the API update that row in place (logs kept); rows without it are
 * inserted as new exercises. `rowId` is a stable React/list key that survives a
 * name change, which clears `exerciseId`.
 */
export interface DraftExercise {
  rowId: string
  exerciseId?: number
  name: string
  sets: number
  reps: number
  weight: number
  weightUnit: LoadUnit
  /** Coach note as the editor shows it (plain text, without the JSON envelope). */
  notes: string
  /** True once the editor's note field was edited; untouched notes go back verbatim. */
  notesTouched: boolean
  isCardio: boolean
  isSuperset: boolean
  /** Logged sets of the plan row, used for the badge and the loss warning. */
  logs?: PrescriptionLog[]
  restTime?: number
  rpe?: number | null
  rir?: number | null
  trackRpe?: boolean | number
  trackRir?: boolean | number
  targetDistance?: number
  targetDuration?: number
}

/** What `PUT /workout-plans/:id` expects inside `exercises`. */
export interface PrescriptionPayloadRow {
  id?: number
  name: string
  sets: number
  reps: number
  targetWeight: number
  weightUnit: LoadUnit
  restTime: number
  notes: string
  exerciseOrder: number
  track_rpe: boolean | number
  track_rir: boolean | number
  rpe: number | null
  rir: number | null
  targetDistance?: number
  targetDuration?: number
  is_cardio: 0 | 1
}

/** Full response of the update route: how many logged sets the save dropped. */
export interface PrescriptionSaveResult {
  deletedLogs?: number
  workoutPlan?: unknown
}

/**
 * The API serialises `exercises.id` as a string; the plan row is sent back as a
 * number, and anything unusable must stay `undefined` so the row is inserted as a
 * new exercise instead of overwriting somebody else's.
 */
export function asRowId(raw: unknown): number | undefined {
  const value = Number(raw)
  return Number.isInteger(value) && value > 0 ? value : undefined
}

/** Unique list key for a row that does not exist on the server yet. */
function draftRowId(): string {
  return `new-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/** Plan row → editable draft row. */
export function toDraftExercise(ex: PrescriptionExercise, userId?: number | string): DraftExercise {
  const id = asRowId(ex.id)
  const restTime = ex.restTime ?? ex.rest_time
  return {
    rowId: id != null ? `row-${id}` : draftRowId(),
    exerciseId: id,
    name: ex.name ?? "",
    sets: Number(ex.sets ?? 0) || 0,
    reps: Number(ex.reps ?? 0) || 0,
    weight: Number(ex.targetWeight ?? ex.target_weight ?? 0) || 0,
    weightUnit: normalizeLoadUnit(ex.weightUnit ?? ex.weight_unit),
    notes: getCoachNoteDraft(ex.notes, userId),
    notesTouched: false,
    isCardio: Boolean(ex.isCardio ?? ex.is_cardio),
    // The backend encodes "this row hangs from the one above" as `rest_time = -1`.
    isSuperset: restTime === -1,
    logs: ex.logs,
    restTime,
    rpe: ex.rpe ?? null,
    rir: ex.rir ?? null,
    trackRpe: ex.trackRpe ?? ex.track_rpe ?? 0,
    trackRir: ex.trackRir ?? ex.track_rir ?? 0,
    targetDistance: ex.targetDistance ?? ex.target_distance,
    targetDuration: ex.targetDuration ?? ex.target_duration,
  }
}

/** A brand-new row appended by "add exercise". */
export function newDraftExercise(name: string, isCardio = false): DraftExercise {
  return {
    rowId: draftRowId(),
    name,
    sets: 3,
    reps: isCardio ? 20 : 10,
    weight: 0,
    weightUnit: "kg",
    notes: "",
    notesTouched: false,
    isCardio,
    isSuperset: false,
    logs: [],
  }
}

/** Logged-set summary of one exercise: used by the badge and the trim warning. */
export function countLoggedSets(logs: PrescriptionLog[] | undefined): {
  /** Rows in `exercise_logs` (completed or not). */
  total: number
  /** Sets the trainee already ticked off. */
  completed: number
  /** Highest `set_number` present, i.e. the lowest `sets` that keeps every row. */
  maxSet: number
} {
  let completed = 0
  let maxSet = 0
  for (const log of logs ?? []) {
    if (log.completed || log.is_completed) completed++
    maxSet = Math.max(maxSet, Number(log.set_number ?? log.setNumber ?? 0) || 0)
  }
  return { total: logs?.length ?? 0, completed, maxSet }
}

/** The only fields the loss check needs from a draft row. */
export type DraftLogCheckRow = Pick<DraftExercise, "name" | "sets" | "exerciseId">

/**
 * Names of the exercises whose logged sets a save would destroy.
 *
 * Editing keeps every row that is still in the list — and its logs — so adding or
 * reordering exercises costs nothing. Only removals and set counts below the
 * logged sets do, and those are exactly what this returns. An empty array means
 * the save can go through without a warning.
 */
export function findDroppedLogSets(
  draft: DraftLogCheckRow[],
  previous: PrescriptionExercise[] | undefined,
): string[] {
  const losing: string[] = []
  const keptById = new Map<number, DraftLogCheckRow>()
  for (const row of draft) {
    if (row.name.trim() && row.exerciseId != null) keptById.set(row.exerciseId, row)
  }

  for (const before of previous ?? []) {
    const beforeId = asRowId(before.id)
    const current = beforeId != null ? keptById.get(beforeId) : undefined
    const logs = before.logs

    if (current) {
      // Kept: the row and its logs survive, except sets the new prescription no
      // longer has. Without `logs` the caller could not tell us, so any reduction
      // is treated as risky.
      if (!logs) {
        if (current.sets < before.sets) losing.push(before.name)
        continue
      }
      const { maxSet } = countLoggedSets(logs)
      if (maxSet > current.sets) losing.push(before.name)
      continue
    }

    // Dropped from the list: the API deletes the row and its logs cascade.
    if (!logs || logs.length > 0) losing.push(before.name)
  }

  return losing
}

/**
 * Draft rows → the `exercises` array of `PUT /workout-plans/:id`.
 *
 * Rows are written in list order (`exerciseOrder` is the index after the empty
 * names are dropped), which is what makes drag & drop persist with no extra
 * endpoint. `rest_time` follows the builder convention: `-1` on a row that hangs
 * from the previous one, the previous value otherwise (a renamed exercise must not
 * flatten every 90s rest to the 60s default). Notes the editor did not touch are
 * sent back verbatim so a trainee editing their own plan does not re-attribute the
 * coach's cue to themselves.
 */
export function buildPrescriptionPayload(
  draft: DraftExercise[],
  previous: PrescriptionExercise[] | undefined,
  user?: { id?: number; name?: string } | null,
): PrescriptionPayloadRow[] {
  const previousById = new Map<number, PrescriptionExercise>()
  for (const row of previous ?? []) {
    const id = asRowId(row.id)
    if (id != null) previousById.set(id, row)
  }

  return draft
    .filter((row) => row.name.trim())
    .map((row, index) => {
      const before = row.exerciseId != null ? previousById.get(row.exerciseId) : undefined
      const untouchedNotes = !row.notesTouched && before &&
        getCoachNoteDraft(before.notes, user?.id).trim() === row.notes.trim()
        ? before.notes ?? ""
        : undefined
      const previousRest = row.restTime ?? before?.restTime ?? before?.rest_time
      const restTime = index > 0 && row.isSuperset
        ? -1
        : previousRest != null && previousRest > 0 ? previousRest : 60

      return {
        id: row.exerciseId,
        name: row.name.trim(),
        sets: row.sets,
        reps: row.reps,
        targetWeight: row.weight,
        weightUnit: row.weightUnit,
        restTime,
        notes: untouchedNotes ?? serializeCoachNote(row.notes, user ?? undefined),
        exerciseOrder: index,
        track_rpe: row.trackRpe ?? before?.trackRpe ?? before?.track_rpe ?? 0,
        track_rir: row.trackRir ?? before?.trackRir ?? before?.track_rir ?? 0,
        rpe: row.rpe ?? before?.rpe ?? null,
        rir: row.rir ?? before?.rir ?? null,
        targetDistance: row.targetDistance ?? before?.targetDistance ?? before?.target_distance,
        targetDuration: row.targetDuration ?? before?.targetDuration ?? before?.target_duration,
        is_cardio: row.isCardio ? 1 : 0,
      }
    })
}
