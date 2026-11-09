import videoMap from "@/data/exercise-video-map.json"
import gifMap from "@/data/exercise-gif-map.json"
import descriptionMap from "@/data/exercise-description-map.json"
import { apiFetch } from "@/lib/api"

const videoUrls = videoMap as Record<string, string>
const gifUrls = gifMap as Record<string, string>
const descriptions = descriptionMap as Record<string, string>

export function normalizeExerciseName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

const normalizedVideoMap = new Map<string, string>()
for (const [name, url] of Object.entries(videoUrls)) {
  const normalizedName = normalizeExerciseName(name)
  if (!normalizedVideoMap.has(normalizedName)) normalizedVideoMap.set(normalizedName, url)
}

const normalizedGifMap = new Map<string, string>()
for (const [name, url] of Object.entries(gifUrls)) {
  const normalizedName = normalizeExerciseName(name)
  if (!normalizedGifMap.has(normalizedName)) normalizedGifMap.set(normalizedName, url)
}

const normalizedDescriptionMap = new Map<string, string>()
for (const [name, description] of Object.entries(descriptions)) {
  const normalizedName = normalizeExerciseName(name)
  if (!normalizedDescriptionMap.has(normalizedName)) normalizedDescriptionMap.set(normalizedName, description)
}

export function getExerciseGifUrl(exerciseName: string): string | null {
  return normalizedGifMap.get(normalizeExerciseName(exerciseName)) ?? null
}

/**
 * Base URL of the self-hosted dataset media (our own `Dupla-exercises-media`
 * repository served through jsDelivr, pinned to a commit SHA).
 *
 * The API already returns absolute `gif_url`/`thumb_url` built from the
 * backend's `EXERCISE_MEDIA_BASE`; this constant is only the fallback for
 * deployments that expose bare file names.
 */
const DATASET_MEDIA_BASE = (process.env.NEXT_PUBLIC_EXERCISE_MEDIA_BASE || "").replace(/\/+$/, "")

/** Builds a public URL for a dataset media file name (`0001-2gPfomN.gif`). */
export function datasetMediaUrl(file: string | null | undefined, kind: "gif" | "thumb" = "gif"): string | null {
  if (!file) return null
  if (/^https?:\/\//i.test(file)) return file
  if (!DATASET_MEDIA_BASE) return null
  const folder = kind === "thumb" ? "thumb" : "gif"
  return `${DATASET_MEDIA_BASE}/${folder}/${file.replace(/^\/+/, "")}`
}


export function getExerciseDescription(exerciseName: string): string | null {
  const description = normalizedDescriptionMap.get(normalizeExerciseName(exerciseName))
  return description && description !== "Ejercicio para ." ? description : null
}

export function getExerciseVideoUrl(exerciseName: string): string | null {
  return normalizedVideoMap.get(normalizeExerciseName(exerciseName)) ?? null
}

export function getYouTubeVideoId(value?: string | null): string | null {
  if (!value) return null

  try {
    const url = new URL(value)
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "")
    if (hostname === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0]
      return id && /^[\w-]{11}$/.test(id) ? id : null
    }

    if (hostname !== "youtube.com" && hostname !== "m.youtube.com" && hostname !== "youtube-nocookie.com") return null

    const parts = url.pathname.split("/").filter(Boolean)
    const id = url.searchParams.get("v") ?? (
      ["shorts", "embed", "v"].includes(parts[0] ?? "") ? parts[1] : null
    )
    return id && /^[\w-]{11}$/.test(id) ? id : null
  } catch {
    return null
  }
}

export type YouTubeThumbnailQuality = "mq" | "hq" | "sd" | "max"

/**
 * YouTube still images. `mq` is 320×180 (clean 16:9), `hq` is 480×360, `sd` is
 * 640×480 and `max` is 1280×720 (the last three are letterboxed to 4:3 for 16:9
 * videos). Small crops should start at `mq`; large media panels should start at
 * `max` and fall back to `sd`/`hq` when the uploader did not generate the bigger sizes.
 */
export function getYouTubeThumbnailUrl(videoId: string, quality: YouTubeThumbnailQuality = "hq"): string {
  const fileName = quality === "max"
    ? "maxresdefault"
    : quality === "sd"
      ? "sddefault"
      : quality === "mq"
        ? "mqdefault"
        : "hqdefault"
  return `https://img.youtube.com/vi/${videoId}/${fileName}.jpg`
}

/** Next smaller size that is still usable, or `null` when nothing else can be tried. */
export function getSmallerYouTubeThumbnail(quality: YouTubeThumbnailQuality): YouTubeThumbnailQuality | null {
  if (quality === "max") return "sd"
  if (quality === "sd") return "hq"
  if (quality === "mq") return "hq"
  return null
}

export function getYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`
}

export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`
}

export function getYouTubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}`
}

export interface ExerciseVideoLookup {
  videoId: string | null
  title?: string | null
  thumbnailUrl?: string | null
  embedUrl?: string | null
  searchUrl: string
}

interface ExerciseVideoLookupResponse {
  videoId?: string | null
  title?: string | null
  thumbnailUrl?: string | null
  embedUrl?: string | null
  searchUrl?: string | null
}

// One lookup per exercise name per page session; the API also caches server-side.
const videoLookupCache = new Map<string, Promise<ExerciseVideoLookup>>()

/**
 * Resolves a YouTube reference video from the exercise name.
 * Used when the catalog has no usable video_url and the static map has no entry.
 */
export function lookupExerciseVideo(exerciseName: string): Promise<ExerciseVideoLookup> {
  const fallback: ExerciseVideoLookup = { videoId: null, searchUrl: getYouTubeSearchUrl(exerciseName) }
  const cacheKey = normalizeExerciseName(exerciseName)
  if (!cacheKey) return Promise.resolve(fallback)

  const cached = videoLookupCache.get(cacheKey)
  if (cached) return cached

  const request = apiFetch<ExerciseVideoLookupResponse>(`/exercises/video?name=${encodeURIComponent(exerciseName)}`)
    .then(data => {
      const videoId = data?.videoId && /^[\w-]{11}$/.test(data.videoId) ? data.videoId : null
      return {
        videoId,
        title: data?.title ?? null,
        thumbnailUrl: videoId ? data?.thumbnailUrl ?? getYouTubeThumbnailUrl(videoId) : null,
        embedUrl: videoId ? data?.embedUrl ?? getYouTubeEmbedUrl(videoId) : null,
        searchUrl: data?.searchUrl || fallback.searchUrl,
      } as ExerciseVideoLookup
    })
    .catch(() => fallback)

  videoLookupCache.set(cacheKey, request)
  return request
}
