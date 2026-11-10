"use client"

import { useCallback, useRef, useState, type DragEvent, type KeyboardEvent } from "react"
import { ChevronDown, ChevronUp, GripVertical, Link } from "lucide-react"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

/**
 * Exercise ordering helpers shared by every routine/plan exercise builder.
 *
 * Reordering is done with the native HTML5 drag-and-drop API (same approach the
 * plan timeline already uses to move days) plus up/down arrows so it also works
 * on touch devices and with the keyboard.
 */

/** Immutable move used by every builder to persist the new order. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to) return list
  if (from < 0 || to < 0 || from >= list.length || to >= list.length) return list
  const next = [...list]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

type RowDragProps = {
  onDragOver: (e: DragEvent<HTMLElement>) => void
  onDragLeave: (e: DragEvent<HTMLElement>) => void
  onDrop: (e: DragEvent<HTMLElement>) => void
}

type HandleDragProps = {
  draggable: true
  onDragStart: (e: DragEvent<HTMLElement>) => void
  onDragEnd: () => void
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void
  title: string
  "aria-label": string
}

export interface ExerciseReorder {
  dragIndex: number | null
  overIndex: number | null
  isDragging: (index: number) => boolean
  isDropTarget: (index: number) => boolean
  /** Spread on the row wrapper that receives the drop. */
  rowProps: (index: number) => RowDragProps
  /** Spread on the drag handle button (the only draggable element). */
  handleProps: (index: number) => HandleDragProps
  moveUp: (index: number) => void
  moveDown: (index: number) => void
}

export function useExerciseReorder(onMove: (from: number, to: number) => void): ExerciseReorder {
  const { t } = useT()
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  // Mirror in a ref so the drop handler always reads the current row without
  // needing a state updater (updaters must stay side-effect free).
  const dragIndexRef = useRef<number | null>(null)

  const beginDrag = useCallback((index: number | null) => {
    dragIndexRef.current = index
    setDragIndex(index)
  }, [])

  const reset = useCallback(() => {
    dragIndexRef.current = null
    setDragIndex(null)
    setOverIndex(null)
  }, [])

  const dropAt = useCallback((target: number) => {
    const from = dragIndexRef.current
    if (from !== null && from !== target) onMove(from, target)
    reset()
  }, [onMove, reset])

  const moveUp = useCallback((index: number) => {
    if (index <= 0) return
    onMove(index, index - 1)
  }, [onMove])

  const moveDown = useCallback((index: number) => {
    onMove(index, index + 1)
  }, [onMove])

  const rowProps = (index: number): RowDragProps => ({
    onDragOver: (e) => {
      if (dragIndexRef.current === null) return
      e.preventDefault() // required, otherwise the browser rejects the drop
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move"
      setOverIndex(index)
    },
    onDragLeave: (e) => {
      const next = e.relatedTarget as Node | null
      if (next && e.currentTarget.contains(next)) return
      setOverIndex(current => (current === index ? null : current))
    },
    onDrop: (e) => {
      e.preventDefault()
      dropAt(index)
    },
  })

  const handleProps = (index: number): HandleDragProps => ({
    draggable: true,
    onDragStart: (e) => {
      beginDrag(index)
      setOverIndex(index)
      // Firefox only starts the drag when some data is attached
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move"
        e.dataTransfer.setData("text/plain", String(index))
      }
    },
    onDragEnd: reset,
    onKeyDown: (e) => {
      if (e.key === "ArrowUp") { e.preventDefault(); moveUp(index) }
      else if (e.key === "ArrowDown") { e.preventDefault(); moveDown(index) }
    },
    title: t.programs.dragToReorder,
    "aria-label": t.programs.dragToReorder,
  })

  return {
    dragIndex,
    overIndex,
    isDragging: (index: number) => dragIndex === index,
    isDropTarget: (index: number) => dragIndex !== null && overIndex === index && dragIndex !== index,
    rowProps,
    handleProps,
    moveUp,
    moveDown,
  }
}

/** Grip handle: the only element that can start a drag, so row clicks keep working. */
export function DragHandle({ index, reorder, className }: {
  index: number; reorder: ExerciseReorder; className?: string
}) {
  return (
    <button
      type="button"
      {...reorder.handleProps(index)}
      className={cn(
        "flex h-6 w-4 shrink-0 cursor-grab items-center justify-center rounded text-[#555555] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00ffff]/60 active:cursor-grabbing",
        reorder.isDragging(index) && "text-[#00ffff]",
        className
      )}
    >
      <GripVertical className="h-3.5 w-3.5" />
    </button>
  )
}

/** Touch / keyboard friendly alternative to dragging. */
export function ReorderArrows({ index, total, reorder, className }: {
  index: number; total: number; reorder: ExerciseReorder; className?: string
}) {
  const { t } = useT()
  const arrowCls = "flex h-3.5 w-4 items-center justify-center rounded text-[#555555] transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:text-[#555555]"
  return (
    <div className={cn("flex shrink-0 flex-col", className)}>
      <button type="button" onClick={() => reorder.moveUp(index)} disabled={index <= 0}
        aria-label={t.programs.moveUp} title={t.programs.moveUp} className={arrowCls}>
        <ChevronUp className="h-3 w-3" />
      </button>
      <button type="button" onClick={() => reorder.moveDown(index)} disabled={index >= total - 1}
        aria-label={t.programs.moveDown} title={t.programs.moveDown} className={arrowCls}>
        <ChevronDown className="h-3 w-3" />
      </button>
    </div>
  )
}

/**
 * Pill rendered between two exercises to link them as a bi-serie.
 * The backend convention is `rest_time = -1` on the exercise that hangs from
 * the previous one, which is what the builders translate the flag into.
 */
export function SupersetToggle({ active, onToggle, className }: {
  active: boolean; onToggle: () => void; className?: string
}) {
  const { t } = useT()
  return (
    <div className={cn("relative z-10 flex justify-center", className)}>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={active}
        title={active ? t.programs.biSerie : t.programs.link}
        className={cn(
          "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold transition-colors",
          active
            ? "border-[#00ffff] bg-[#00ffff]/20 text-[#00ffff]"
            : "border-white/[0.1] bg-[#0a0a0f] text-[#555] hover:border-[#00ffff]/50"
        )}
      >
        <Link className="h-3 w-3" />
        {active ? t.programs.biSerie : t.programs.link}
      </button>
    </div>
  )
}

/** Unique row id for builders that create exercises locally. */
export function newExerciseRowId(prefix = "ex"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

