"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { Dumbbell, Info, Loader2, Search, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { apiFetch } from "@/lib/api"
import { useT } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { categoryLabel, exerciseCardSubtitle } from "@/lib/exercise-labels"
import { ExerciseReferenceDialog } from "./exercise-reference-dialog"

/** What an exercise pick hands back to the routine being built. */
export interface PickedExercise {
  name: string
  isCardio: boolean
  thumbUrl?: string | null
}

/** Subset of `GET /exercises` used by the cards. */
interface CatalogExercise {
  id: number
  name: string
  muscle_category?: string | null
  muscle_group?: string | null
  equipment?: string | null
  is_cardio?: boolean | number | null
  thumb_url?: string | null
  gif_url?: string | null
}

type ExerciseListResponse = CatalogExercise[] | { exercises?: CatalogExercise[] } | null | undefined
type CategoryListResponse = string[] | { categories?: string[] } | null | undefined

/** Search only kicks in from 2 characters so the full list stays browsable by category. */
const SEARCH_MIN_CHARS = 2
const SEARCH_DEBOUNCE_MS = 250
/** Searching returns a short ranked list; browsing a category returns up to 200 rows. */
const SEARCH_LIMIT = 40
const BROWSE_LIMIT = 200
/** Cards painted at once — the rest is revealed with "load more" to keep the sheet light. */
const PAGE_SIZE = 60

function unwrapExercises(data: ExerciseListResponse): CatalogExercise[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  return data.exercises ?? []
}

function unwrapCategories(data: CategoryListResponse): string[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  return data.categories ?? []
}

/**
 * The list endpoint has no `is_cardio` column, so cardio rows are recognised by
 * category or name — the same heuristic the routine screens used before.
 */
function isCardioExercise(exercise: CatalogExercise): boolean {
  const category = (exercise.muscle_category ?? exercise.muscle_group ?? "").toLowerCase()
  const name = (exercise.name ?? "").toLowerCase()
  return Boolean(
    exercise.is_cardio ||
    category.includes("cardio") || category.includes("aerobic") ||
    name.includes("treadmill") || name.includes("cycling") ||
    name.includes("running") || name.includes("correr") ||
    name.includes("bici") || name.includes("caminadora") ||
    name.includes("elíptica") || name.includes("eliptica")
  )
}

/** Categories rarely change, so one request per page load is enough. */
let categoriesRequest: Promise<string[]> | null = null

function loadCategories(): Promise<string[]> {
  if (!categoriesRequest) {
    categoriesRequest = apiFetch<CategoryListResponse>("/exercises/categories")
      .then(unwrapCategories)
      .catch(() => {
        // Let the next open retry instead of caching an empty taxonomy.
        categoriesRequest = null
        return []
      })
  }
  return categoriesRequest
}

/** The two accents used by the screens that open the picker. */
const ACCENTS = {
  cyan: {
    badge: "bg-[#00ffff]/10 text-[#00ffff]",
    card: "hover:border-[#00ffff]/50 hover:bg-[#00ffff]/[0.04] focus-visible:ring-[#00ffff]/50",
    chip: "border-[#00ffff]/60 bg-[#00ffff]/15 text-[#00ffff]",
    info: "hover:border-[#00ffff]/60 hover:text-[#00ffff] focus-visible:ring-[#00ffff]/50",
  },
  violet: {
    badge: "bg-[#a78bfa]/10 text-[#a78bfa]",
    card: "hover:border-[#a78bfa]/50 hover:bg-[#a78bfa]/[0.04] focus-visible:ring-[#a78bfa]/50",
    chip: "border-[#a78bfa]/60 bg-[#a78bfa]/15 text-[#a78bfa]",
    info: "hover:border-[#a78bfa]/60 hover:text-[#a78bfa] focus-visible:ring-[#a78bfa]/50",
  },
} as const

type Accent = keyof typeof ACCENTS

/**
 * One catalog row: still image + name + "muscle · equipment", with a small "?"
 * that opens the technique/history dialog without adding the exercise.
 */
function ExerciseCard({ exercise, accent, openReferenceLabel, onPick, onOpenReference }: {
  exercise: CatalogExercise
  accent: Accent
  openReferenceLabel: string
  onPick: () => void
  onOpenReference: () => void
}) {
  const [imageFailed, setImageFailed] = useState(false)
  const tint = ACCENTS[accent]
  const subtitle = exerciseCardSubtitle(exercise)
  // Still first: the animated GIFs are 180×180 and heavy for a grid of cards.
  const imageUrl = imageFailed ? null : exercise.thumb_url || exercise.gif_url

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onPick}
        className={cn(
          "flex w-full flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#151a21] text-left transition focus:outline-none focus-visible:ring-2",
          tint.card
        )}
      >
        <span className="block aspect-square w-full overflow-hidden bg-[#05060a]">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => setImageFailed(true)}
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center">
              <Dumbbell className="h-6 w-6 text-[#333]" />
            </span>
          )}
        </span>
        <span className="flex flex-1 flex-col gap-0.5 px-2 py-1.5">
          <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-white sm:text-xs">{exercise.name}</span>
          {subtitle && <span className="truncate text-[10px] text-[#777]">{subtitle}</span>}
        </span>
      </button>

      <button
        type="button"
        onClick={onOpenReference}
        title={openReferenceLabel}
        aria-label={`${openReferenceLabel}: ${exercise.name}`}
        className={cn(
          "absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.18] bg-black/70 text-[#c3c8d2] backdrop-blur-sm transition focus:outline-none focus-visible:ring-2",
          tint.info
        )}
      >
        <Info className="h-3 w-3" />
      </button>
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="animate-pulse overflow-hidden rounded-xl border border-white/[0.06] bg-[#151a21]">
          <div className="aspect-square w-full bg-white/[0.04]" />
          <div className="space-y-1.5 px-2 py-2">
            <div className="h-2.5 w-4/5 rounded bg-white/[0.06]" />
            <div className="h-2 w-1/2 rounded bg-white/[0.05]" />
          </div>
        </div>
      ))}
    </div>
  )
}

function Placeholder({ tone, children }: { tone: "muted" | "error"; children: ReactNode }) {
  return (
    <p className={cn(
      "px-4 py-14 text-center text-sm",
      tone === "error" ? "text-[#ff6b6b]" : "text-[#777]"
    )}>
      {children}
    </p>
  )
}

/**
 * Catalog picker shared by every routine builder.
 *
 * Cards carry their own still + name so the choice is visual instead of a plain
 * text list, and a "?" on each card opens the full technique/history dialog
 * without adding the exercise. Search, filtering and paging all run server side
 * (`GET /exercises` caps a page at 500 rows).
 */
export function ExercisePickerSheet({
  open,
  onOpenChange,
  onSelect,
  targetUserId,
  subjectName,
  accent = "cyan",
  title,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called once with the chosen exercise; the sheet closes right after. */
  onSelect: (exercise: PickedExercise) => void
  /** Whose history the reference dialog shows. Defaults to the signed-in user. */
  targetUserId?: number
  /** Name shown in the reference dialog ("Historial de …"). */
  subjectName?: string | null
  accent?: Accent
  title?: string
}) {
  const { t } = useT()
  const tint = ACCENTS[accent]
  const searchRef = useRef<HTMLInputElement | null>(null)

  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [category, setCategory] = useState<string | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [exercises, setExercises] = useState<CatalogExercise[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [reloadKey, setReloadKey] = useState(0)
  const [reference, setReference] = useState<CatalogExercise | null>(null)

  const searchTerm = debouncedQuery.trim()
  const isSearching = searchTerm.length >= SEARCH_MIN_CHARS
  const shown = useMemo(() => exercises.slice(0, visible), [exercises, visible])

  // Every open starts clean and reloads the muscle groups (cached per page load).
  useEffect(() => {
    if (!open) return
    setQuery("")
    setDebouncedQuery("")
    setCategory(null)
    setExercises([])
    setFailed(false)
    setVisible(PAGE_SIZE)
    setCategoriesLoading(true)
    loadCategories().then(list => {
      setCategories(list)
      setCategoriesLoading(false)
    })
  }, [open])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  // Typing leaves the category filter behind, otherwise results look contradictory.
  useEffect(() => {
    if (isSearching) setCategory(null)
  }, [isSearching])

  useEffect(() => {
    if (!open) return
    // One character is not a useful query yet: keep the grid empty until the
    // user finishes the word instead of firing a request per keystroke.
    if (searchTerm.length === 1) {
      setExercises([])
      setLoading(false)
      setFailed(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setFailed(false)

    const params = new URLSearchParams()
    if (isSearching) params.set("search", searchTerm)
    else if (category) params.set("category", category)
    params.set("limit", String(isSearching ? SEARCH_LIMIT : BROWSE_LIMIT))

    apiFetch<ExerciseListResponse>(`/exercises?${params.toString()}`)
      .then(data => {
        if (cancelled) return
        setExercises(unwrapExercises(data))
        setVisible(PAGE_SIZE)
      })
      .catch(() => {
        if (cancelled) return
        setExercises([])
        setFailed(true)
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [open, isSearching, searchTerm, category, reloadKey])

  const handleOpenChange = (next: boolean) => {
    // Drop the nested reference dialog with the sheet, otherwise it would stay
    // mounted on top of a closed picker.
    if (!next) setReference(null)
    onOpenChange(next)
  }

  const handlePick = (exercise: CatalogExercise) => {
    onSelect({
      name: exercise.name,
      isCardio: isCardioExercise(exercise),
      thumbUrl: exercise.thumb_url ?? null,
    })
    handleOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          // The routine builders host the picker from inside a sheet at z-200.
          overlayZIndex={400}
          onOpenAutoFocus={event => {
            // The picker is almost always a "find the exercise" task: start typing.
            event.preventDefault()
            searchRef.current?.focus()
          }}
          className="top-0 left-0 flex h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-[#0a0a0f] p-0 text-white sm:top-[50%] sm:left-[50%] sm:h-auto sm:max-h-[92vh] sm:w-[calc(100%-2rem)] sm:max-w-4xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:border-white/[0.1]"
        >
          <DialogHeader className="flex shrink-0 flex-row items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", tint.badge)}>
                <Dumbbell className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="truncate text-base font-bold">{title ?? t.exercisePicker.title}</DialogTitle>
                <p className="hidden truncate text-[11px] text-[#888] sm:block">{t.exercisePicker.subtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              aria-label={t.common.close}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.1] text-[#888] transition hover:border-white/[0.2] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/[0.3]"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogHeader>

          <div className="shrink-0 space-y-2 border-b border-white/[0.08] px-3 pb-2.5 pt-3 sm:px-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555]" />
              <input
                ref={searchRef}
                type="search"
                inputMode="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder={t.exercisePicker.searchPlaceholder}
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-xl border border-white/[0.1] bg-[#161b22] py-2.5 pl-9 pr-10 text-sm text-white placeholder:text-[#555] focus:border-[#00ffff]/50 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(""); searchRef.current?.focus() }}
                  aria-label={t.exercisePicker.clearSearch}
                  className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[#666] transition hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5">
              <button
                type="button"
                onClick={() => { setQuery(""); setCategory(null) }}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition",
                  !category && !isSearching
                    ? tint.chip
                    : "border-white/[0.1] text-[#888] hover:border-white/[0.25] hover:text-white"
                )}
              >
                {t.exercisePicker.all}
              </button>
              {categoriesLoading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#555]" />}
              {categories.map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => { setQuery(""); setCategory(option) }}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition",
                    category === option
                      ? tint.chip
                      : "border-white/[0.1] text-[#888] hover:border-white/[0.25] hover:text-white"
                  )}
                >
                  {categoryLabel(option) ?? option}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-5">
            {loading && exercises.length === 0 ? (
              <SkeletonGrid />
            ) : failed ? (
              <div className="py-12 text-center">
                <Placeholder tone="error">{t.exercisePicker.error}</Placeholder>
                <button
                  type="button"
                  onClick={() => setReloadKey(key => key + 1)}
                  className="rounded-xl border border-white/[0.15] px-4 py-2 text-sm font-medium text-white transition hover:border-white/[0.3]"
                >
                  {t.common.retry}
                </button>
              </div>
            ) : searchTerm.length === 1 ? (
              <Placeholder tone="muted">{t.exercisePicker.typeToSearch}</Placeholder>
            ) : shown.length === 0 ? (
              <Placeholder tone="muted">{t.exercisePicker.noResults}</Placeholder>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                  {shown.map(exercise => (
                    <ExerciseCard
                      key={exercise.id}
                      exercise={exercise}
                      accent={accent}
                      openReferenceLabel={t.exercisePicker.openReference}
                      onPick={() => handlePick(exercise)}
                      onOpenReference={() => setReference(exercise)}
                    />
                  ))}
                </div>
                {exercises.length > visible && (
                  <button
                    type="button"
                    onClick={() => setVisible(count => count + PAGE_SIZE)}
                    className="mt-3 w-full rounded-xl border border-white/[0.1] py-2.5 text-sm font-medium text-[#888] transition hover:border-white/[0.25] hover:text-white"
                  >
                    {t.exercisePicker.loadMore}
                  </button>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ExerciseReferenceDialog
        open={reference !== null}
        onOpenChange={next => { if (!next) setReference(null) }}
        exerciseName={reference?.name ?? ""}
        targetUserId={targetUserId}
        subjectName={subjectName}
        onPick={reference ? () => handlePick(reference) : undefined}
      />
    </>
  )
}

