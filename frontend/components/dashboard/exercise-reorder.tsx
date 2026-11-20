"use client"

import {
  useCallback, useEffect, useRef, useState,
  type CSSProperties, type KeyboardEvent,
  type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent,
} from "react"
import { ChevronDown, ChevronUp, GripVertical, Link } from "lucide-react"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

/**
 * Exercise ordering helpers shared by every routine/plan exercise builder.
 *
 * Dragging runs on Pointer Events, not on the HTML5 drag-and-drop API: iOS
 * Safari and Android Chrome never fire `dragstart` from a touch, so the native
 * API turned the grip into a dead control on phones. Pointer events cover
 * mouse, pen and finger with one code path; the grip declares `touch-action:
 * none` so the gesture reorders instead of scrolling the sheet. Up/down arrows
 * stay as the keyboard and accessibility fallback.
 *
 * On top of the grip, a finger can drag the whole card: holding it for
 * `LONG_PRESS_MS` arms the same engine. The row deliberately keeps
 * `touch-action: auto` so a quick swipe still pans the sheet; the browser is
 * only told to stop panning once the hold completes.
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

/** Distance the pointer travels before a press turns into a drag. */
const DRAG_THRESHOLD_PX = 6
/** Band at the top/bottom of a scrollable ancestor that triggers auto-scrolling. */
const AUTOSCROLL_EDGE_PX = 56
const AUTOSCROLL_STEP_PX = 12
/** Marks a row with its position so the grip can find it under the finger. */
const ROW_ATTR = "data-reorder-row"
/** Hold time before a finger anywhere on the card turns into a drag. */
const LONG_PRESS_MS = 350
/** A finger that travels this far during the hold was scrolling, not dragging. */
const LONG_PRESS_CANCEL_PX = 10
/**
 * Presses inside these elements belong to the control, not to the row. Inputs
 * would lose text editing, links would lose the iOS preview, and Radix
 * triggers (`aria-haspopup`) open on pointerdown, long before a hold could
 * win. Everything else - the card surface, the exercise name, the arrows -
 * can be held to drag.
 */
const INTERACTIVE_SELECTOR = [
  "input", "textarea", "select", "label", "a",
  "[aria-haspopup]", '[role="slider"]', '[contenteditable="true"]',
  "[data-no-long-press]",
].join(",")

type RowDragProps = {
  "data-reorder-row": number
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void
  onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void
  onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void
  onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void
  onLostPointerCapture: (e: ReactPointerEvent<HTMLElement>) => void
  onContextMenu: (e: ReactMouseEvent<HTMLElement>) => void
  onClickCapture: (e: ReactMouseEvent<HTMLElement>) => void
  style: CSSProperties
}

type HandleDragProps = {
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void
  onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void
  onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void
  onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void
  onLostPointerCapture: (e: ReactPointerEvent<HTMLElement>) => void
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void
  style: CSSProperties
  title: string
  "aria-label": string
}

/** Position of the row under a viewport point, or null when the point misses. */
function rowIndexAt(x: number, y: number): number | null {
  const hit = document.elementFromPoint(x, y)
  const row = hit instanceof Element ? hit.closest(`[${ROW_ATTR}]`) : null
  const raw = row?.getAttribute(ROW_ATTR)
  if (raw == null) return null
  const index = Number(raw)
  return Number.isInteger(index) ? index : null
}

/**
 * Scrollable ancestors of a row, innermost first. The builders live inside
 * sheets with their own vertical scroll, so `window.scrollBy` is not enough.
 */
function scrollableAncestors(from: Element | null): HTMLElement[] {
  const found: HTMLElement[] = []
  let node = from?.parentElement ?? null
  while (node) {
    if (node.scrollHeight > node.clientHeight + 2) {
      const overflowY = window.getComputedStyle(node).overflowY
      if (overflowY === "auto" || overflowY === "scroll") found.push(node)
    }
    node = node.parentElement
  }
  return found
}

/** True when the press landed on a control that must keep its own gesture. */
function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(INTERACTIVE_SELECTOR) !== null
}

export interface ExerciseReorder {
  dragIndex: number | null
  overIndex: number | null
  isDragging: (index: number) => boolean
  isDropTarget: (index: number) => boolean
  /** Spread on the row wrapper: drop target marker plus the long-press drag. */
  rowProps: (index: number) => RowDragProps
  /** Spread on the drag handle button (immediate drag, no hold needed). */
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
  const overIndexRef = useRef<number | null>(null)
  const pointerIdRef = useRef<number | null>(null)
  const activeRef = useRef(false)
  const originRef = useRef({ x: 0, y: 0 })
  const pointRef = useRef({ x: 0, y: 0 })
  const scrollersRef = useRef<HTMLElement[]>([])
  const frameRef = useRef<number | null>(null)
  /** Press that may still turn into a long-press drag (touches only). */
  const pressRef = useRef<{ index: number; pointerId: number } | null>(null)
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Set once a long press armed, so the release does not also click the card. */
  const suppressClickRef = useRef(false)
  const touchGuardRef = useRef<(() => void) | null>(null)

  const stopAutoScroll = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }, [])

  const clearTouchGuard = useCallback(() => {
    touchGuardRef.current?.()
    touchGuardRef.current = null
  }, [])

  /**
   * While the row is being dragged the sheet must not pan. A non-passive
   * `touchmove` listener is the only way to veto a scroll that the browser has
   * not committed to yet: React registers `touchmove` as passive, so a handler
   * from JSX could not call `preventDefault()`.
   */
  const guardTouchScroll = useCallback(() => {
    if (touchGuardRef.current) return
    const onTouchMove = (ev: TouchEvent) => { if (ev.cancelable) ev.preventDefault() }
    document.addEventListener("touchmove", onTouchMove, { passive: false })
    touchGuardRef.current = () => document.removeEventListener("touchmove", onTouchMove)
  }, [])

  const clearPress = useCallback(() => {
    if (pressTimerRef.current !== null) {
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
    pressRef.current = null
  }, [])

  const reset = useCallback(() => {
    stopAutoScroll()
    clearTouchGuard()
    clearPress()
    dragIndexRef.current = null
    overIndexRef.current = null
    pointerIdRef.current = null
    activeRef.current = false
    scrollersRef.current = []
    setDragIndex(null)
    setOverIndex(null)
  }, [stopAutoScroll, clearTouchGuard, clearPress])

  // A sheet can unmount mid-gesture; never leave the rAF loop, the pending hold
  // timer or the touch guard behind.
  useEffect(() => () => {
    stopAutoScroll()
    clearTouchGuard()
    clearPress()
  }, [stopAutoScroll, clearTouchGuard, clearPress])

  const markOver = useCallback((index: number | null) => {
    if (overIndexRef.current === index) return
    overIndexRef.current = index
    setOverIndex(index)
  }, [])

  const beginDrag = useCallback((index: number) => {
    dragIndexRef.current = index
    overIndexRef.current = index
    activeRef.current = true
    setDragIndex(index)
    setOverIndex(index)
  }, [])

  const startAutoScroll = useCallback(() => {
    stopAutoScroll()
    const step = () => {
      const { y } = pointRef.current
      for (const el of scrollersRef.current) {
        const rect = el.getBoundingClientRect()
        if (rect.height <= 0) continue
        if (y < rect.top + AUTOSCROLL_EDGE_PX) el.scrollTop -= AUTOSCROLL_STEP_PX
        else if (y > rect.bottom - AUTOSCROLL_EDGE_PX) el.scrollTop += AUTOSCROLL_STEP_PX
      }
      frameRef.current = requestAnimationFrame(step)
    }
    frameRef.current = requestAnimationFrame(step)
  }, [stopAutoScroll])

  /** Tracks the finger and resolves the row under it while a drag is live. */
  const followPointer = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    pointRef.current = { x: e.clientX, y: e.clientY }
    // The pointer is captured, so every event targets the same element: the row
    // under the finger can only be resolved from the coordinates. Keeping the
    // last match means sliding over a gap does not drop the target.
    const target = rowIndexAt(e.clientX, e.clientY)
    if (target !== null) markOver(target)
  }, [markOver])

  /** The hold completed: take the pointer over and start dragging the card. */
  const armLongPress = useCallback((
    index: number, rowEl: HTMLElement, pointerId: number,
  ) => {
    pressRef.current = null
    pointerIdRef.current = pointerId
    try {
      rowEl.setPointerCapture(pointerId)
    } catch {
      // Older Safari throws when the pointer is already gone.
    }
    scrollersRef.current = scrollableAncestors(rowEl)
    beginDrag(index)
    startAutoScroll()
    guardTouchScroll()
    suppressClickRef.current = true
    // A short tap on the motor is the only "you grabbed it" cue a phone gives.
    if (typeof navigator.vibrate === "function") navigator.vibrate(8)
  }, [beginDrag, startAutoScroll, guardTouchScroll])

  /** Closes the gesture; only a real drop commits, cancels keep the order. */
  const endDrag = useCallback((commit: boolean) => {
    const from = dragIndexRef.current
    const to = overIndexRef.current
    const suppressClick = suppressClickRef.current
    reset()
    if (commit && from !== null && to !== null && from !== to) onMove(from, to)
    // If the browser still emits a click for the release, drop it as well; the
    // flag is also cleared by the next press, so it can never linger.
    if (suppressClick) {
      window.setTimeout(() => { suppressClickRef.current = false }, LONG_PRESS_MS)
    }
  }, [onMove, reset])

  // Safety net: when capture never lands (older Safari) the release can be
  // delivered outside the grip, which would leave the drag armed forever.
  useEffect(() => {
    if (dragIndex === null) return
    const abort = () => {
      if (pointerIdRef.current !== null) endDrag(false)
    }
    window.addEventListener("pointerup", abort)
    window.addEventListener("pointercancel", abort)
    return () => {
      window.removeEventListener("pointerup", abort)
      window.removeEventListener("pointercancel", abort)
    }
  }, [dragIndex, endDrag])

  const moveUp = useCallback((index: number) => {
    if (index <= 0) return
    onMove(index, index - 1)
  }, [onMove])

  const moveDown = useCallback((index: number) => {
    onMove(index, index + 1)
  }, [onMove])

  // Rows are drop targets and, on a touch screen, a second drag surface: hold
  // the card for a beat and the same engine takes over. Quick swipes and every
  // control inside the card keep their own behaviour.
  const rowProps = (index: number): RowDragProps => ({
    [ROW_ATTR]: index,
    onPointerDown: (e) => {
      if (!e.isPrimary || e.pointerType !== "touch") return
      // The grip already owns this press (its handler runs first and sets the
      // pointer id), and a held input or button must keep its own gesture.
      if (pointerIdRef.current !== null || isInteractiveTarget(e.target)) return
      const rowEl = e.currentTarget
      // `currentTarget` is null once the handler returns, so keep the node for
      // the timer callback.
      originRef.current = { x: e.clientX, y: e.clientY }
      pointRef.current = { x: e.clientX, y: e.clientY }
      suppressClickRef.current = false
      clearPress()
      pressRef.current = { index, pointerId: e.pointerId }
      pressTimerRef.current = setTimeout(() => {
        pressTimerRef.current = null
        armLongPress(index, rowEl, e.pointerId)
      }, LONG_PRESS_MS)
    },
    onPointerMove: (e) => {
      const press = pressRef.current
      if (press !== null && press.pointerId === e.pointerId) {
        const dx = e.clientX - originRef.current.x
        const dy = e.clientY - originRef.current.y
        // The finger moved before the hold completed: this is a scroll, so the
        // sheet pans and no drag starts.
        if (Math.hypot(dx, dy) > LONG_PRESS_CANCEL_PX) { clearPress(); return }
      }
      if (!activeRef.current || pointerIdRef.current !== e.pointerId) return
      followPointer(e)
    },
    onPointerUp: (e) => {
      clearPress()
      if (!activeRef.current || pointerIdRef.current !== e.pointerId) return
      endDrag(true)
    },
    onPointerCancel: (e) => {
      clearPress()
      if (!activeRef.current || pointerIdRef.current !== e.pointerId) return
      endDrag(false)
    },
    onLostPointerCapture: (e) => {
      if (!activeRef.current || pointerIdRef.current !== e.pointerId) return
      endDrag(false)
    },
    // A held touch would open the iOS callout or the Android context menu.
    onContextMenu: (e) => {
      if (pointerIdRef.current !== null || pressRef.current !== null) e.preventDefault()
    },
    // The release of a long press must not also "click" whatever is underneath.
    onClickCapture: (e) => {
      if (!suppressClickRef.current) return
      suppressClickRef.current = false
      e.preventDefault()
      e.stopPropagation()
    },
    // Keeps the iOS text callout away without touching selection inside inputs;
    // the sheet keeps panning because `touch-action` stays untouched here. The
    // outline is the "this card is in your hand" cue while the drag is live.
    style: {
      WebkitTouchCallout: "none",
      userSelect: dragIndex !== null ? "none" : undefined,
      outline: dragIndex === index ? "2px solid rgba(255,255,255,0.45)" : undefined,
      outlineOffset: dragIndex === index ? "2px" : undefined,
    },
  })

  const handleProps = (index: number): HandleDragProps => ({
    onPointerDown: (e) => {
      if (!e.isPrimary) return
      // Touch reports button 0; only the extra mouse buttons are filtered out.
      if (e.pointerType === "mouse" && e.button !== 0) return
      clearPress()
      suppressClickRef.current = false
      pointerIdRef.current = e.pointerId
      originRef.current = { x: e.clientX, y: e.clientY }
      pointRef.current = { x: e.clientX, y: e.clientY }
      activeRef.current = false
      dragIndexRef.current = null
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // Older Safari throws when the pointer is already gone.
      }
    },
    onPointerMove: (e) => {
      if (pointerIdRef.current !== e.pointerId) return
      pointRef.current = { x: e.clientX, y: e.clientY }
      if (!activeRef.current) {
        const dx = e.clientX - originRef.current.x
        const dy = e.clientY - originRef.current.y
        // Below the threshold the press is still a tap / a scroll attempt.
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return
        scrollersRef.current = scrollableAncestors(e.currentTarget.closest(`[${ROW_ATTR}]`))
        beginDrag(index)
        startAutoScroll()
      }
      followPointer(e)
    },
    onPointerUp: (e) => {
      if (pointerIdRef.current !== e.pointerId) return
      endDrag(true)
    },
    onPointerCancel: (e) => {
      if (pointerIdRef.current !== e.pointerId) return
      endDrag(false)
    },
    onLostPointerCapture: (e) => {
      // Fires after a normal release too, by which point reset() already ran.
      if (pointerIdRef.current !== e.pointerId) return
      endDrag(false)
    },
    onKeyDown: (e) => {
      if (e.key === "ArrowUp") { e.preventDefault(); moveUp(index) }
      else if (e.key === "ArrowDown") { e.preventDefault(); moveDown(index) }
    },
    // `touch-action: none` is what turns the gesture into a drag instead of a scroll.
    style: { touchAction: "none", userSelect: "none" },
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

/** Grip handle: drags immediately, while the rest of the card needs a hold. */
export function DragHandle({ index, reorder, className }: {
  index: number; reorder: ExerciseReorder; className?: string
}) {
  return (
    <button
      type="button"
      {...reorder.handleProps(index)}
      className={cn(
        // Sized for a thumb on phones (h-8 w-6) and back to the compact grip on
        // desktop; the touch-action that makes the drag possible comes from
        // `handleProps().style`.
        "flex h-8 w-6 shrink-0 touch-none select-none cursor-grab items-center justify-center rounded bg-white/[0.04] text-[#777777] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00ffff]/60 active:cursor-grabbing active:text-[#00ffff] md:h-6 md:w-4 md:bg-transparent",
        reorder.isDragging(index) && "text-[#00ffff]",
        className
      )}
    >
      <GripVertical className="h-4 w-4 md:h-3.5 md:w-3.5" />
    </button>
  )
}

/** Touch / keyboard friendly alternative to dragging. */
export function ReorderArrows({ index, total, reorder, className }: {
  index: number; total: number; reorder: ExerciseReorder; className?: string
}) {
  const { t } = useT()
  const arrowCls = "flex h-6 w-6 items-center justify-center rounded text-[#666666] transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:text-[#666666] md:h-3.5 md:w-4"
  return (
    <div className={cn("flex shrink-0 flex-col", className)}>
      <button type="button" onClick={() => reorder.moveUp(index)} disabled={index <= 0}
        aria-label={t.programs.moveUp} title={t.programs.moveUp} className={arrowCls}>
        <ChevronUp className="h-4 w-4 md:h-3 md:w-3" />
      </button>
      <button type="button" onClick={() => reorder.moveDown(index)} disabled={index >= total - 1}
        aria-label={t.programs.moveDown} title={t.programs.moveDown} className={arrowCls}>
        <ChevronDown className="h-4 w-4 md:h-3 md:w-3" />
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

