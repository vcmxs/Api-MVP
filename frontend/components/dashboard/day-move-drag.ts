"use client"

import {
  useCallback, useEffect, useRef, useState,
  type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent,
} from "react"

/**
 * Long-press drag for the weekly timeline of the "assign plan" modal.
 *
 * The timeline used to be draggable with the HTML5 API only, which no mobile
 * browser fires from a touch, so on a phone a day could only be moved through
 * the "Mover a…" menu. This engine uses Pointer Events instead (one code path
 * for mouse, pen and finger) and arms only after a hold, which keeps a quick
 * swipe panning the sheet — the columns deliberately stay `touch-action: auto`.
 *
 * The same rules as the exercise reorder engine apply: a hold is cancelled when
 * the finger travels (that was a scroll), controls inside the column keep their
 * own gesture, and the release of a long press never also clicks the card.
 */

/** Marks a column with its day number so a drag can find it under the finger. */
const DAY_ATTR = "data-day-slot"
/** Hold time before a finger anywhere on a column turns into a drag. */
const LONG_PRESS_MS = 350
/** A finger that travels this far during the hold was scrolling, not dragging. */
const LONG_PRESS_CANCEL_PX = 10
/** Band at the edge of a scrollable ancestor that triggers auto-scrolling. */
const AUTOSCROLL_EDGE_PX = 48
const AUTOSCROLL_STEP_PX = 10
/**
 * Presses inside these elements belong to the control. Inputs would lose text
 * editing, links their preview, and Radix triggers (`aria-haspopup`, i.e. the
 * "Mover a…" menu) open on pointerdown, long before a hold could win.
 */
const INTERACTIVE_SELECTOR = [
  "input", "textarea", "select", "label", "a",
  "[aria-haspopup]", '[role="slider"]', '[contenteditable="true"]',
  "[data-no-long-press]",
].join(",")

export type DayColumnProps = {
  "data-day-slot": number
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void
  onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void
  onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void
  onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void
  onLostPointerCapture: (e: ReactPointerEvent<HTMLElement>) => void
  onContextMenu: (e: ReactMouseEvent<HTMLElement>) => void
  onClickCapture: (e: ReactMouseEvent<HTMLElement>) => void
  style: CSSProperties
}

export interface DayMoveDrag {
  /** Day whose workout is currently in the hand. */
  dragDay: number | null
  /** Day under the finger, or null while the finger is outside the timeline. */
  overDay: number | null
  /** Viewport point of the finger, used to place the floating chip. */
  point: { x: number; y: number }
  /** True for the column the workout would land on. */
  isDropTarget: (day: number) => boolean
  /**
   * Spread on the column wrapper. Every column carries the attribute, so even a
   * rest day is a drop target; `canDrag` decides whether a hold on it can pick
   * anything up.
   */
  columnProps: (day: number, canDrag: boolean) => DayColumnProps
}

/** Day under a viewport point, or null when the point misses every column. */
function dayAt(x: number, y: number): number | null {
  const hit = document.elementFromPoint(x, y)
  const column = hit instanceof Element ? hit.closest(`[${DAY_ATTR}]`) : null
  const raw = column?.getAttribute(DAY_ATTR)
  if (raw == null) return null
  const day = Number(raw)
  return Number.isInteger(day) ? day : null
}

/** Scrollable ancestors of a column, in any direction, innermost first. */
function scrollableAncestors(from: Element | null): HTMLElement[] {
  const found: HTMLElement[] = []
  let node = from?.parentElement ?? null
  while (node) {
    const style = window.getComputedStyle(node)
    const scrollsY = (style.overflowY === "auto" || style.overflowY === "scroll")
      && node.scrollHeight > node.clientHeight + 2
    const scrollsX = (style.overflowX === "auto" || style.overflowX === "scroll")
      && node.scrollWidth > node.clientWidth + 2
    if (scrollsX || scrollsY) found.push(node)
    node = node.parentElement
  }
  return found
}

/** True when the press landed on a control that must keep its own gesture. */
function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(INTERACTIVE_SELECTOR) !== null
}

export function useDayMoveDrag(onMove: (from: number, to: number) => void): DayMoveDrag {
  // The gesture handlers are created on every render, but the drop is resolved
  // from a ref so a stale closure can never move the wrong day.
  const onMoveRef = useRef(onMove)
  useEffect(() => {
    onMoveRef.current = onMove
  }, [onMove])

  const [dragDay, setDragDay] = useState<number | null>(null)
  const [overDay, setOverDay] = useState<number | null>(null)
  const [point, setPoint] = useState({ x: 0, y: 0 })

  const dragRef = useRef<number | null>(null)
  const overRef = useRef<number | null>(null)
  const pointerIdRef = useRef<number | null>(null)
  const originRef = useRef({ x: 0, y: 0 })
  const pointRef = useRef({ x: 0, y: 0 })
  const scrollersRef = useRef<HTMLElement[]>([])
  const frameRef = useRef<number | null>(null)
  /** Press that may still turn into a long-press drag. */
  const pressRef = useRef<{ day: number; pointerId: number } | null>(null)
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Set once a long press armed, so the release does not also open the day. */
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
   * While the card is being dragged the sheet must not pan. A non-passive
   * `touchmove` listener is the only way to veto a scroll the browser has not
   * committed to yet: React registers `touchmove` as passive, so a handler from
   * JSX could not call `preventDefault()`.
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
    dragRef.current = null
    overRef.current = null
    pointerIdRef.current = null
    scrollersRef.current = []
    setDragDay(null)
    setOverDay(null)
  }, [stopAutoScroll, clearTouchGuard, clearPress])

  // The modal can close mid-gesture; never leave the rAF loop, the pending hold
  // timer or the touch guard behind.
  useEffect(() => () => {
    stopAutoScroll()
    clearTouchGuard()
    clearPress()
  }, [stopAutoScroll, clearTouchGuard, clearPress])

  const markOver = useCallback((day: number | null) => {
    if (overRef.current === day) return
    overRef.current = day
    setOverDay(day)
  }, [])

  /** Keeps the timeline scrolling while the finger rests near an edge. */
  const startAutoScroll = useCallback(() => {
    stopAutoScroll()
    const step = () => {
      const { x, y } = pointRef.current
      for (const el of scrollersRef.current) {
        const rect = el.getBoundingClientRect()
        if (rect.width <= 0 || rect.height <= 0) continue
        if (x < rect.left + AUTOSCROLL_EDGE_PX) el.scrollLeft -= AUTOSCROLL_STEP_PX
        else if (x > rect.right - AUTOSCROLL_EDGE_PX) el.scrollLeft += AUTOSCROLL_STEP_PX
        if (y < rect.top + AUTOSCROLL_EDGE_PX) el.scrollTop -= AUTOSCROLL_STEP_PX
        else if (y > rect.bottom - AUTOSCROLL_EDGE_PX) el.scrollTop += AUTOSCROLL_STEP_PX
      }
      // Scrolling moves the columns under a finger that is holding still, and a
      // still finger sends no pointermove: resolve the target again every frame.
      const target = dayAt(x, y)
      if (target !== null) markOver(target)
      frameRef.current = requestAnimationFrame(step)
    }
    frameRef.current = requestAnimationFrame(step)
  }, [stopAutoScroll, markOver])

  /** The hold completed: take the pointer over and start dragging the card. */
  const armLongPress = useCallback((day: number, columnEl: HTMLElement, pointerId: number) => {
    pressRef.current = null
    pointerIdRef.current = pointerId
    try {
      columnEl.setPointerCapture(pointerId)
    } catch {
      // Older Safari throws when the pointer is already gone.
    }
    scrollersRef.current = scrollableAncestors(columnEl)
    dragRef.current = day
    overRef.current = day
    setDragDay(day)
    setOverDay(day)
    // Publish the grab point right away so the floating chip appears under the
    // finger instead of at the origin of the viewport.
    setPoint(pointRef.current)
    startAutoScroll()
    guardTouchScroll()
    suppressClickRef.current = true
    // A short tap on the motor is the only "you grabbed it" cue a phone gives.
    if (typeof navigator.vibrate === "function") navigator.vibrate(8)
  }, [startAutoScroll, guardTouchScroll])

  /** Closes the gesture; only a real drop commits, cancels change nothing. */
  const endDrag = useCallback((commit: boolean) => {
    const from = dragRef.current
    const to = overRef.current
    const suppressClick = suppressClickRef.current
    reset()
    if (commit && from !== null && to !== null && from !== to) onMoveRef.current(from, to)
    // If the browser still emits a click for the release, drop it as well; the
    // flag is also cleared by the next press, so it can never linger.
    if (suppressClick) {
      window.setTimeout(() => { suppressClickRef.current = false }, LONG_PRESS_MS)
    }
  }, [reset])

  // Safety net: when capture never lands (older Safari) the release can be
  // delivered elsewhere, which would leave the drag armed forever.
  useEffect(() => {
    if (dragDay === null) return
    const abort = () => {
      if (pointerIdRef.current !== null) endDrag(false)
    }
    window.addEventListener("pointerup", abort)
    window.addEventListener("pointercancel", abort)
    return () => {
      window.removeEventListener("pointerup", abort)
      window.removeEventListener("pointercancel", abort)
    }
  }, [dragDay, endDrag])

  const columnProps = (day: number, canDrag: boolean): DayColumnProps => ({
    [DAY_ATTR]: day,
    onPointerDown: (e) => {
      if (!canDrag) return
      if (!e.isPrimary || e.pointerType !== "touch") return
      if (pointerIdRef.current !== null || isInteractiveTarget(e.target)) return
      // `currentTarget` is null once the handler returns, so keep the node for
      // the timer callback.
      const columnEl = e.currentTarget
      originRef.current = { x: e.clientX, y: e.clientY }
      pointRef.current = { x: e.clientX, y: e.clientY }
      suppressClickRef.current = false
      clearPress()
      pressRef.current = { day, pointerId: e.pointerId }
      pressTimerRef.current = setTimeout(() => {
        pressTimerRef.current = null
        armLongPress(day, columnEl, e.pointerId)
      }, LONG_PRESS_MS)
    },
    onPointerMove: (e) => {
      const press = pressRef.current
      if (press !== null && press.pointerId === e.pointerId) {
        const dx = e.clientX - originRef.current.x
        const dy = e.clientY - originRef.current.y
        // The finger moved before the hold completed: this is a scroll.
        if (Math.hypot(dx, dy) > LONG_PRESS_CANCEL_PX) { clearPress(); return }
      }
      if (dragRef.current === null || pointerIdRef.current !== e.pointerId) return
      pointRef.current = { x: e.clientX, y: e.clientY }
      setPoint(pointRef.current)
      // The pointer is captured, so every event targets the same column: the
      // one under the finger can only be resolved from the coordinates. Keeping
      // the last match means sliding over a gap does not drop the target.
      const target = dayAt(e.clientX, e.clientY)
      if (target !== null) markOver(target)
    },
    onPointerUp: (e) => {
      clearPress()
      if (dragRef.current === null || pointerIdRef.current !== e.pointerId) return
      endDrag(true)
    },
    onPointerCancel: (e) => {
      clearPress()
      if (dragRef.current === null || pointerIdRef.current !== e.pointerId) return
      endDrag(false)
    },
    onLostPointerCapture: (e) => {
      if (dragRef.current === null || pointerIdRef.current !== e.pointerId) return
      endDrag(false)
    },
    // A held touch would open the iOS callout or the Android context menu.
    onContextMenu: (e) => {
      if (pointerIdRef.current !== null || pressRef.current !== null) e.preventDefault()
    },
    // The release of a long press must not also "click" the card underneath.
    onClickCapture: (e) => {
      if (!suppressClickRef.current) return
      suppressClickRef.current = false
      e.preventDefault()
      e.stopPropagation()
    },
    // Keeps the iOS text callout away without touching selection inside inputs;
    // the sheet keeps panning because `touch-action` stays untouched here. The
    // outline is the "this day is in your hand" cue while the drag is live.
    style: {
      WebkitTouchCallout: "none",
      userSelect: dragDay !== null ? "none" : undefined,
      outline: dragDay === day ? "2px solid rgba(167,139,250,0.9)" : undefined,
      outlineOffset: dragDay === day ? "2px" : undefined,
    },
  })

  return {
    dragDay,
    overDay,
    point,
    isDropTarget: (day) => dragDay !== null && overDay === day && dragDay !== day,
    columnProps,
  }
}
