"use client"

import { useEffect, useRef, type ReactNode } from "react"

/** Approximate row height used when the browser reports deltas in lines. */
const LINE_HEIGHT_PX = 16

type WheelAxis = "x" | "y"

/**
 * Scroll container that keeps working with the mouse wheel inside nested modals.
 *
 * Radix locks page scrolling with `react-remove-scroll`. When a dialog is
 * portaled on top of an open sheet, that lock sees the wheel as "outside" of
 * the sheet's shard and cancels it before it reaches the list: touch still
 * scrolls, but the wheel does nothing. Translating the wheel into
 * `scrollTop`/`scrollLeft` ourselves keeps both levels usable. The listener is
 * native and non-passive on purpose — React attaches `onWheel` as a passive
 * root listener, so `preventDefault()` there is a no-op and the list would
 * scroll twice once the lock is gone.
 */
export function WheelScrollArea({ axis = "y", className, children }: {
  axis?: WheelAxis
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const handleWheel = (event: WheelEvent) => {
      const scrollable = axis === "x"
        ? node.scrollWidth > node.clientWidth
        : node.scrollHeight > node.clientHeight
      if (!scrollable) return

      // A vertical wheel over a horizontal strip still travels sideways.
      const raw = axis === "x" ? event.deltaX || event.deltaY : event.deltaY
      if (raw === 0) return

      const viewport = axis === "x" ? node.clientWidth : node.clientHeight
      const delta = event.deltaMode === 1 ? raw * LINE_HEIGHT_PX : event.deltaMode === 2 ? raw * viewport : raw
      const before = axis === "x" ? node.scrollLeft : node.scrollTop
      if (axis === "x") node.scrollLeft = before + delta
      else node.scrollTop = before + delta

      // Only swallow the event when we actually moved, so an edge of the list
      // does not trap the wheel.
      const after = axis === "x" ? node.scrollLeft : node.scrollTop
      if (after !== before) event.preventDefault()
    }

    node.addEventListener("wheel", handleWheel, { passive: false })
    return () => node.removeEventListener("wheel", handleWheel)
  }, [axis])

  return <div ref={ref} className={className}>{children}</div>
}
