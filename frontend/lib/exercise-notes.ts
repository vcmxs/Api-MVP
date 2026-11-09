export interface ExerciseNoteEntry {
  userId?: number | string | null
  userName: string
  authorName?: string
  role?: "coach" | "trainee" | string
  text: string
  createdAt?: string
}

export function parseExerciseNotes(value: unknown, legacyAuthor = "Coach"): ExerciseNoteEntry[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is ExerciseNoteEntry =>
      !!entry && typeof entry === "object" && typeof (entry as ExerciseNoteEntry).text === "string"
    )
  }

  if (typeof value !== "string" || !value.trim()) return []

  try {
    const parsed: unknown = JSON.parse(value)
    if (Array.isArray(parsed)) return parseExerciseNotes(parsed, legacyAuthor)
  } catch {
    // Existing templates/workouts may still contain the original plain-text coach note.
  }

  return [{ userName: legacyAuthor, role: "coach", text: value.trim() }]
}

export function getCoachNoteDraft(value: unknown, coachUserId?: number | string): string {
  const entries = parseExerciseNotes(value)
  return entries
    .filter((entry) =>
      entry.role === "coach" ||
      entry.userName === "Coach" ||
      (coachUserId != null && entry.userId != null && String(entry.userId) === String(coachUserId))
    )
    .map((entry) => entry.text.trim())
    .filter(Boolean)
    .join("\n\n")
}

export function serializeCoachNote(text: string, user?: { id?: number; name?: string }): string {
  const content = text.trim()
  if (!content) return ""

  return JSON.stringify([{
    userId: user?.id ?? null,
    userName: "Coach",
    authorName: user?.name || "Coach",
    role: "coach",
    text: content,
    createdAt: new Date().toISOString(),
  } satisfies ExerciseNoteEntry])
}
