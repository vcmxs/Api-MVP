"use client"

import { useState } from "react"
import { Dumbbell } from "lucide-react"

/**
 * Small square still of an exercise (dataset JPG served by the API/CDN).
 *
 * The pickers used to show a bare `Dumbbell` icon; this keeps the icon as the
 * graceful fallback so lists still look right when the API runs without
 * `EXERCISE_MEDIA_BASE` (no `thumb_url`), the row has no media, or the image
 * fails to load.
 */
export function ExerciseThumb({ url, className = "h-7 w-7" }: {
  url?: string | null
  className?: string
}) {
  const [failed, setFailed] = useState(false)

  if (!url || failed) {
    return (
      <span className={`flex shrink-0 items-center justify-center rounded-md bg-white/[0.05] ${className}`}>
        <Dumbbell className="h-3 w-3 text-[#555555]" />
      </span>
    )
  }

  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-md border border-white/[0.08] bg-[#0a0a0f] object-cover ${className}`}
    />
  )
}
