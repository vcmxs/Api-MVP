"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { formatDecimal } from "@/lib/format"

export interface NumberFieldProps {
  /** Committed numeric value. */
  value: number
  /** Called with the parsed number on every keystroke and on blur. */
  onChange: (value: number) => void
  /** Allow fractional values (weights, distances, cardio minutes). */
  decimal?: boolean
  /** Digits kept after the separator when `decimal` is true. DECIMAL(10, 2) -> 2. */
  maxDecimals?: number
  /** Step used by ArrowUp / ArrowDown. Defaults to 0.5 (decimal) or 1. */
  step?: number
  min?: number
  max?: number
  placeholder?: string
  className?: string
  disabled?: boolean
  id?: string
  "aria-label"?: string
}

/**
 * Numeric input that lets the user finish typing before the value is
 * normalised.
 *
 * The builders used to render `<input type="number" value={number}>` with
 * `parseFloat(raw) || 0`, which rewrote the field to `2` as soon as the user
 * typed `2.` — making `2.5` impossible to enter. This keeps a local string
 * draft (`"2."`, `"0."`, `""`) and only converts to a number for the parent,
 * so decimals, a lone trailing separator and clearing the field all behave.
 *
 * It is a text input on purpose: `type="number"` with the default `step=1`
 * marks `2.5` as invalid, and it silently drops commas from keyboards that
 * use `,` as the decimal separator. `inputMode` still opens the numeric
 * keypad on mobile.
 */
export function NumberField({
  value,
  onChange,
  decimal = true,
  maxDecimals = 2,
  step,
  min,
  max,
  placeholder,
  className,
  disabled,
  id,
  "aria-label": ariaLabel,
}: NumberFieldProps) {
  const [draft, setDraft] = useState(() => formatDecimal(value, maxDecimals))
  // While the user is typing we must not overwrite the draft with the committed
  // numeric value, otherwise "2." collapses back to "2" and the dot is lost.
  const editing = useRef(false)

  useEffect(() => {
    if (!editing.current) setDraft(formatDecimal(value, maxDecimals))
  }, [value, maxDecimals])

  const clamp = (num: number) => {
    const factor = 10 ** maxDecimals
    let next = decimal ? Math.round(num * factor) / factor : Math.trunc(num)
    if (min !== undefined) next = Math.max(min, next)
    if (max !== undefined) next = Math.min(max, next)
    return next
  }

  const emit = (raw: string) => {
    const parsed = parseFloat(raw)
    // An empty draft (or just ".") commits the minimum instead of NaN, so the
    // parent keeps a valid payload while the user retypes.
    onChange(clamp(Number.isFinite(parsed) ? parsed : (min ?? 0)))
  }

  const handleChange = (raw: string) => {
    const separators = raw.replace(/,/g, ".")
    const allowed = decimal ? separators.replace(/[^0-9.]/g, "") : separators.replace(/[^0-9]/g, "")

    let next = allowed
    if (decimal) {
      const dot = allowed.indexOf(".")
      if (dot !== -1) {
        // Keep a single separator and cap the scale at the column precision.
        const decimals = allowed.slice(dot + 1).replace(/\./g, "").slice(0, maxDecimals)
        next = allowed.slice(0, dot + 1) + decimals
      }
    }

    setDraft(next)
    emit(next)
  }

  const handleBlur = () => {
    editing.current = false
    const parsed = parseFloat(draft)
    const committed = clamp(Number.isFinite(parsed) ? parsed : (min ?? 0))
    setDraft(formatDecimal(committed, maxDecimals))
    onChange(committed)
  }

  const nudge = (direction: 1 | -1) => {
    const parsed = parseFloat(draft)
    const base = Number.isFinite(parsed) ? parsed : (min ?? 0)
    const delta = step ?? (decimal ? 0.5 : 1)
    const committed = clamp(base + delta * direction)
    setDraft(formatDecimal(committed, maxDecimals))
    onChange(committed)
  }

  return (
    <input
      id={id}
      type="text"
      inputMode={decimal ? "decimal" : "numeric"}
      autoComplete="off"
      value={draft}
      placeholder={placeholder}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => handleChange(e.target.value)}
      onFocus={(e) => {
        editing.current = true
        // Select on focus so typing replaces the placeholder-ish 0 instead of
        // producing "02".
        e.currentTarget.select()
      }}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp") {
          e.preventDefault()
          nudge(1)
        } else if (e.key === "ArrowDown") {
          e.preventDefault()
          nudge(-1)
        }
      }}
      className={cn(
        "w-full rounded-lg border border-white/[0.08] bg-[#0a0a0f] px-2 py-1.5 text-xs text-white",
        "placeholder:text-[#555555] focus:border-[#00ffff]/40 focus:outline-none",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    />
  )
}
