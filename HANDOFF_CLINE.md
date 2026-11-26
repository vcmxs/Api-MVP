# Handoff to Cline — Exercise video/reference detail

**Project:** `C:\Users\admin\Documents\GitHub\Api-MVP`  
**Date:** 2026-11-05  
**Status:** Initial web implementation complete; continue with visual/API QA and fix any issues. Do not restart from scratch or overwrite existing work.

## Goal and agreed behavior

Port the mobile exercise-reference experience into the web workout session. The exercise thumbnail opens an in-page responsive detail with tabs in this order:

1. **About** — show an exercise GIF if one is mapped; otherwise show a YouTube thumbnail and load an inline player only after the user presses play. No autoplay, no external redirect. Show instructions below. Do not show the mobile “Músculos trabajados” anatomy image.
2. **History** — group progression records by workout date, with best estimated 1RM and set weight/reps/RPE/RIR/1RM.
3. **Progress** — estimated 1RM summary, recent-session chart and selected-session detail.

The mobile code was inspected in `C:\Users\admin\Documents\GitHub\Dupla-mobile\src\screens\WorkoutDetailScreen.js` and `ExerciseDetailScreen.js`. Mobile currently displays a thumbnail and opens YouTube externally; although `youtubeEmbedUrl` and `WebView` are present, that inline player is not used by the visible screen. The web inline player is an intentional improvement requested by the user. The mobile tabs and history/progress ordering are the design reference.

User confirmed mobile and web share the Railway database. Railway is the canonical current exercise list. The mobile static media map is only a provisional media source. The mobile YouTube videos belong to the user's friend and are placeholders, not approved permanent coaching media. Keep this reminder in project documentation; do not display a warning badge in the UI for now. Long-term goal is exercise GIFs. Do not modify the mobile app or write these media links to Railway.

## Work already done

- Added `frontend/components/dashboard/exercise-reference-dialog.tsx` with the thumbnail button and responsive Dialog for About/History/Progress. Uses existing progression API, Recharts, mobile-like date grouping and selected-session detail. The video embeds inline in a `youtube-nocookie.com` iframe after a click.
- Added `frontend/lib/exercise-media.ts` with case/diacritic/punctuation-insensitive matching, YouTube URL/ID validation, thumbnail/embed URL helpers, GIF lookup and description lookup.
- Added `frontend/data/exercise-video-map.json` with mobile static YouTube URLs reconciled to current Railway exercise names, `frontend/data/exercise-description-map.json` as instructions fallback, and empty `frontend/data/exercise-gif-map.json` awaiting approved GIF assets.
- Added `frontend/data/EXERCISE_MEDIA_NOTES.md` documenting that videos are placeholders and how to maintain the mapping.
- Integrated thumbnail buttons in `frontend/components/dashboard/workouts-view.tsx` and `frontend/components/dashboard/trainee-detail.tsx` for normal exercises and supersets.
- Added English and Spanish UI labels in `frontend/locales/en.ts` and `frontend/locales/es.ts`.
- Added the shared routine exercise picker `frontend/components/dashboard/exercise-picker-sheet.tsx` and replaced the three ad-hoc pickers with it (`programs-view.tsx` create mode / workout builder / custom day, `workouts-view.tsx` new-workout builder, `assign-workout-modal.tsx`). `ExerciseReferenceDialog` was extracted as a controlled component so each card's "?" opens technique/history without leaving the picker.
- No backend or database files were changed for this feature.
- **Plan assignment with plan-internal routines (2026-11-09).** `POST /workout-plans` returned 400 and `GET /programs/workouts/:id` 500 for the routines a coach creates inside a plan: they live in `localStorage` (`dupla_local_workouts`) under a negative id, but `AssignPlanModal` only ever asked the API for them, so every day rendered as empty (`noExercisesFound`) and the payload carried `exercises: []`. `programs-view.tsx` now exposes `readLocalWorkouts()` / `localWorkoutsFor()` / `resolveWorkout()`, which seed `workoutCache` from `localStorage` (the negative ids are skipped in the network fetch). The assign flow builds every payload first and aborts with a translated message listing the empty days instead of half-assigning the plan, and the failure alert shows the real error message. `controllers/programs.controller.js#getWorkoutById` answers 404 (`/^\d+$/` guard) for a non-numeric id instead of letting Postgres throw a 500.
- **Delete plan confirmation (2026-11-09).** Both `handleDeletePlan` implementations (`FolderDetailView` and `ProgramsView`) ask `window.confirm(t.programs.confirmDeletePlan)` with the plan name before calling `removePlan()`.
- **Exercise dialog without the neon glow (2026-11-09).** `mediaGlow` (blurred thumbnail halo + cyan/magenta radials) and the gradient frame with `shadow-[0_18px_45px_-26px_rgba(0,255,255,0.85)]` were deleted; the GIF panel is now a flat card (`border border-white/[0.08] bg-[#0a0a0f]`).
- **CAMINADORA / ESCALADORA media fix (2026-11-09).** The dataset matcher sent `CAMINADORA` to dataset 2311 ("walking on stepmill"), so the treadmill played a stair-climber GIF and `ESCALADORA` had no row. `migrations/010_caminadora_escaladora.sql` (+ `run-migration-010.js`, already applied to staging) creates `ESCALADORA` from 2311 and re-points `CAMINADORA` at 3666 ("walking on incline treadmill"); `scripts/exercise-dataset/lib.js` separates both movements and `scripts/exercise-dataset/match-overrides.json` pins the two matches so a future `--apply` keeps them.
- **Local API startup crash (frontend "Failed to fetch").** `utils/emailService.js` built `new Resend(process.env.RESEND_API_KEY)` at import time; the Resend SDK throws from its constructor when the key is absent, and `controllers/auth.controller.js` requires that module while booting, so the whole API died on start whenever `RESEND_API_KEY` was missing from `.env`. Every browser request then failed with `TypeError: Failed to fetch` (`trainee-overview.tsx` logged `Failed to fetch workouts`) and no workouts rendered. The client is now created lazily and `sendWithFallback()` logs the email instead of sending in non-production when the key is missing (production still throws). Also `frontend/lib/api.ts` now rethrows network failures with the API base URL (`Cannot reach the API at <url>. Is the backend running?`) and `trainee-overview.tsx` logs the actual error object.

## Railway and mobile catalog findings

A read-only GET to the public Railway exercise endpoint succeeded once and returned 164 exercise rows. The response had `id`, `name`, `muscle_category`, `video_url`, `created_at`; no description field. There were 155 mobile static URLs matched to 155 current catalog names; 9 catalog exercises lacked a mapped URL. The `video_url` column had 155 nonempty values, but they were not valid URLs (example value `EJEMPLO`), so the web validates any catalog URL and prefers the static mobile map. The mobile `exercise_gifs.json` was `{}`.

A later repeat request to the same API returned 404 `Application not found`. It is not clear whether this is temporary or the public endpoint/service URL changed. Avoid assuming it is still reachable; investigate endpoint availability only if needed. No credentials were copied into this handoff. Do not query user data.

## Validation already run

- Frontend `tsc --noEmit`: passed.
- Frontend `npm run build`: passed twice. Next warned that the repository root was inferred from multiple lockfiles (`package-lock.json` at root and `frontend/pnpm-lock.yaml`); build itself succeeded.
- ESLint was not run: `eslint` is not installed in the frontend dependency set; `npm exec eslint` prompted to download a package, and the prompt was cancelled. Do not accept/install unrequested packages just to run lint.

## Known follow-up / QA targets

1. **Duplicate superset thumbnails — resolved 2026-11-24.** `SupersetRowWrapper` in `workouts-view.tsx` renders `ExerciseReferenceButton` only with `setNum === 1` (`workouts-view.tsx:772`), and the large header thumbnail lives once in `ExerciseSetSection` (`workouts-view.tsx:911`), outside the round loop. `trainee-detail.tsx` was already gated to round 1. Only the visual check remains: open a superset session and confirm one reference button per exercise, not one per round.
2. Test the reference button in both pages as coach and trainee, normal exercise/superset/cardio, no history, one history session, multiple sessions and no mapped video.
3. Validate YouTube URL parsing for `youtu.be`, `watch?v=`, `/shorts/`, and check behavior when embedding is disabled/restricted. The current iframe may show YouTube's own unavailable message; consider an explicit inline fallback state if it can be detected reliably. Do not redirect automatically.
4. Check whether the session workout detail is a modal on narrow screens and whether the nested exercise Dialog behaves well and remains scrollable/mobile responsive.
5. The public exercise endpoint returned a 404 on repeat during this session. Confirm the configured frontend API URL/service is correct before declaring live progression/API QA complete.
6. Confirm `frontend/data/exercise-video-map.json` and `exercise-description-map.json` contain exactly expected current static values; do not map ambiguous aliases without manual review.
7. Optional only if a real, approved GIF source is provided: populate `exercise-gif-map.json`. It is intentionally empty now.
8. Re-run TypeScript and build after any changes.
9. **Exercise picker QA.** Open each routine builder (programs create mode, program workout builder, plan custom-day editor, workouts-view new workout, assign-workout modal) and confirm the shared picker opens above the sheet (it renders at `z-400` while the builders sit at `z-200`), that search/chips/paging work, that the "?" dialog opens on top of the picker and closes back to it, and that picking an exercise fills the row it was opened from and leaves any other empty row untouched. Repeat in Spanish.
10. **Local env/process hygiene.** Add `RESEND_API_KEY` to `.env` if real emails are needed locally; without it the API now boots and logs the email payload instead of sending. Also note that duplicate `npm run dev` / `nodemon server.js` chains can be left running in this workspace — two nodemon instances were alive at once and the second one crash-loops on `EADDRINUSE :3001`. Keep a single API process before QA.
11. **Plan assign / delete / cardio labels QA (2026-11-09).** Restart the API so `GET /exercises/lookup` serves the new rows, then: create a standalone plan whose routine is created inside the plan (stored in `localStorage`), assign it and confirm no 404/500, every day populated and the routine's exercises listed in the day panel; delete a plan and confirm the browser confirmation appears and cancelling keeps it; open the "?" dialog for `CAMINADORA` (treadmill GIF `3666-rjiM4L3.gif`, no halo) and `ESCALADORA` (stepmill GIF `2311-j9Q5crt.gif`). Also confirm a plan day with zero exercises aborts with the "These days have no exercises…" message instead of posting a 400.
12. **Plan-internal routines are still browser-local.** The routines created inside a plan are only written to `localStorage` (`dupla_local_workouts`); a plan created in another browser/device assigns those days as empty and now fails loudly instead of half-assigning. Persisting them server-side (`POST /workout-templates` with `programId: null`) is the pending follow-up if plans must be portable.

## Useful commands (PowerShell, run inside `frontend`)

- Type check: `..\frontend\node_modules\.bin\tsc.cmd --noEmit` when current directory is repo root; or `node_modules\.bin\tsc.cmd --noEmit` when already inside `frontend`.
- Production build: `npm run build`.

## Important constraints

- Do not change the mobile repo as part of this web task.
- Do not write to Railway or query/copy user data.
- Railway catalog determines which exercises are current; static mobile map supplies placeholder links/instructions only.
- Never embed the anatomy/muscle image. The video must play inline only after user interaction, with no autoplay or automatic external navigation.
- Preserve prior coach/trainee note-history behavior and set logging.

## Follow-up session 2026-11-06 — exercises without video

**Problem reported:** no video or thumbnail was visible for any exercise while reviewing a workout session. Root cause was twofold: (1) the displayed video required a unique catalog match, so any exercise whose name is not in the catalog (for example `Bicep Curls`, `Pull Ups`) rendered the "unavailable" state even when the static map had a URL; (2) 9 catalog exercises have no static map entry, and every catalog `video_url` is a placeholder (`EJEMPLO`), so they had nothing to show.

**What changed:**

- New `services/youtubeSearchService.js`: searches YouTube for the exercise name (technique-biased query), parses `ytInitialData`, ranks the candidate `videoRenderer` titles (token match against the exercise name, bonus for technique/tutorial wording) and returns `{ videoId, title, thumbnailUrl, embedUrl, searchUrl, source }`. Hits cache 7 days and misses 6 hours in memory; results with no title match are rejected so an unrelated video is never embedded.
- New public endpoint in `server.js`: `GET /api/v1/exercises/video?name=<exercise name>` (400 without `name`, 200 with `videoId: null` when nothing matched).
- `frontend/lib/exercise-media.ts`: added `getYouTubeSearchUrl`, `ExerciseVideoLookup` and `lookupExerciseVideo` (per-name promise cache so multiple rows do not re-request).
- `frontend/components/dashboard/exercise-reference-dialog.tsx`: resolution order is now GIF → static map → valid catalog URL → name-based YouTube lookup. The catalog-match gate was removed from `canShowVideo`. The thumbnail button shows a spinner while the lookup runs, and the About tab shows "Searching a YouTube reference video…" then, when nothing is found, the no-video message with a "Search on YouTube" link.
- New locale keys `searchingVideo` and `searchOnYouTube` in `frontend/locales/en.ts` and `frontend/locales/es.ts`.
- Documentation updated: `frontend/data/EXERCISE_MEDIA_NOTES.md` and `WEB_TO_MOBILE.md`.

**Validation run:** `node --check` on the service and `server.js`; service exercised directly for `Pull Ups`, `Bicep Curls`, `SALTO DE CUERDA`, `SHORT FOOT` and the 9 catalog exercises without mapped video — all resolved to technique videos; nonsense input returns `videoId: null`; endpoint returns 200/JSON on the local API and 400 without `name`; `npx tsc --noEmit` in `frontend` passes.

**Pending:** browser QA of the thumbnails/player (coach and trainee views).

**UI polish session 2026-11-06 (exercise media placement):**

- `ExerciseReferenceButton` now has two variants: `compact` (48×64, unchanged, used in superset rows) and `card` (16:9 media card `w-24`/`sm:w-32`/`lg:w-36` with gradient, "VIDEO" chip and a YouTube-style red play badge; hover lift + cyan glow).
- `ExerciseSetSection` header in `workouts-view.tsx` was re-laid out: number badge → name + progress pill (`0/3`, now colour-coded) → target line → 1px progress bar on the left column, with the media card pinned to the right. The count is no longer squeezed between the name and the thumbnail.
- `trainee-detail.tsx` exercise header uses the same structure and `variant="card"` (both `card` usages were later replaced by the `hero` panel — see the next session).
- Fixed QA target #1: superset thumbnails render only on round 1 (`setNum === 1`), so no more duplicate thumbnails per set.
- Validation: `npx tsc --noEmit` passes; `/dashboard` compiles and returns 200 on the Next dev server.
**Media hero panel session 2026-11-06 (superseded — the hero panel was removed in the next session):**

The agreed Option B layout is implemented. The ugly header was caused by the `card` media card competing with the exercise name, the `0/3` pill and the progress bar inside a single flex row, so names truncated (for example `BARRA T CO…`) and the card floated misaligned above the sets table.

- `ExerciseReferenceButton` variants are now `compact` (64×48, unchanged; superset rows and non-current exercise headers) and `hero` (full-width 16:9 media panel). The old `card` variant is gone.
- Hero panel: `aspect-video` capped at `max-h-[240px]` in cards (`260px` inside the dialog), `object-cover` thumbnail, `VIDEO` chip, 56px red play badge and a `⤢` expand button that opens the same dialog. Media is still click-to-play only — no autoplay, no automatic navigation to YouTube.
- Neon glow is layered: (a) a blurred copy of the thumbnail (`scale-110 blur-2xl opacity-35`) so the halo adopts the video's own colours, (b) two soft radial glows (`rgba(0,255,255,.35)` + `rgba(255,0,200,.3)`), (c) a 1px gradient border wrapper (`from-[#00ffff]/60 via-white/[0.08] to-[#ff00c8]/45`). All of it lives inside the card's existing `overflow-hidden`, so the Sheet never gains horizontal scroll.
- Action chips under the panel (shared `ExerciseMediaActions`, used by the hero card and the dialog About tab): `Ver vídeo` (opens the dialog and plays), `YouTube` (explicit external watch link), `Compartir` (`navigator.share`, clipboard fallback showing "Enlace copiado") and `Cómo hacerlo` (opens the About tab and smooth-scrolls to the instructions).
- The same hero panel replaces the old player block inside the exercise dialog About tab, so card and dialog are visually identical; the iframe still only mounts after a click.
- Where it renders: `workouts-view.tsx` (`ExerciseSetSection`) and `trainee-detail.tsx` (`renderSingle`) accept a `showVideoHero` flag that is true only for the first **single** group with an unlogged set (`completed < max(sets, logs.length)`). Superset groups keep their round-1 compact thumbnails.
- Thumbnail quality: `getYouTubeThumbnailUrl(videoId, "max" | "sd" | "hq")` plus a `VideoThumbnail` helper that degrades `maxresdefault → sddefault → hqdefault` on error (guarded, cannot loop). Hero and dialog start at `max`; compact stays at `hq`.
- New locale keys in `frontend/locales/{en,es}.ts` under `workouts`: `watchVideo`, `openOnYouTube`, `shareVideo`, `copied`, `howTo`, `expandVideo`.

**Validation run:** `npx tsc --noEmit` in `frontend` passes after all edits. ESLint was not run: the repo has no `eslint.config.*` and the installed `eslint` is v10, so it refuses to start (do not install packages just to lint).

**Pending browser QA:** hero at 380/768/1440px in light and dark; confirm the blurred halo does not create horizontal scroll in the Sheet/Dialog; confirm `Compartir` falls back to the clipboard on desktop; check an exercise whose video has no `maxresdefault` (fallback chain) and one with no resolvable video (dashed/no-media state).

**Known limitation:** a workout made only of supersets never shows the hero panel (supersets intentionally keep the compact thumbnails).

**Card header thumb session 2026-11-06 (current):**

The hero panel was removed after reviewing the mobile card: the exercise header is now a portrait thumbnail on the left plus the name/target/progress stack on the right, so the card reads like the mobile app instead of carrying a full-width video block.

- `ExerciseReferenceButton` variants are now `thumb` (new: 56×68, `sm` 80×64, `object-cover`, small play dot, opens the same exercise dialog) and `compact` (64×48, unchanged — superset rows, round 1 only). The `hero` variant and its code are gone: `heroTrigger`, `noMediaPanel`, `handlePlayFromChip`, `autoPlayRef`, `Maximize2`, plus the `showVideoHero` / `currentGroupIndex` / `firstIncomplete` wiring and the `index` prop of `ExerciseSetSection`.
- Card header markup (both pages): `py-3 pl-3 pr-4`, thumb (`shrink-0`) + `min-w-0 flex-1` text column; the `0/3` pill stays right-aligned in the name row and the 1px progress bar sits under the target line. The sets table was not touched.
- Thumbnails: new `mq` quality in `getYouTubeThumbnailUrl` (`mqdefault`, clean 16:9, ~10 KB) and a `getSmallerYouTubeThumbnail` helper for the fallback chain `max → sd → hq` / `mq → hq`. `VideoThumbnail.onError` uses it, so a missing size can never loop; the dialog still starts at `maxresdefault`.
- `ExerciseMediaActions` (Ver vídeo / YouTube / Compartir / Cómo hacerlo) now renders only inside the dialog About tab; the dialog itself is unchanged.
- Locale keys `watchVideo`, `openOnYouTube`, `shareVideo`, `copied`, `howTo` remain in use in the dialog; `expandVideo` is no longer referenced (kept in `en.ts`/`es.ts` to avoid churn).

**Validation run:** `npx tsc --noEmit` in `frontend` passes; `/dashboard` recompiles and returns 200 on the already-running Next dev server (port 3000).

**Pending browser QA:** exercise card at 380/768/1440 px in light and dark — the name must not truncate awkwardly next to the 56 px thumb, the 68/80 px thumb must not overflow the card, the Sheet must keep having no horizontal scroll, an exercise with no resolvable video must show the dumbbell fallback, and the dialog must still open from the thumbnail. Superset rows should look unchanged.





## Production rollout 2026-11-09 (staging work promoted)

The exercise-reference work, the dataset catalog and the plan-assignment fixes were promoted to
production. Nothing was rebuilt from scratch; this section records what the live environment now
contains and what is still manual.

**Database (`mainline.proxy.rlwy.net:56505/railway`, 164 → 1403 `exercise_library` rows)**

- `CONFIRM_PROD_MIGRATION=YES node run-migration-009.js --production` — 15 dataset columns added,
  `name_norm` backfilled, snapshot table `exercise_library_backup_20261106` created.
- `scripts/exercise-dataset/import.js --apply` against the production `DATABASE_URL` — 78 catalog
  rows enriched in place, 1238 dataset rows inserted (same buckets as staging: 3 ambiguous,
  83 unmatched, 22 conflicts skipped).
- `CONFIRM_PROD_MIGRATION=YES node run-migration-010.js --production` — `CAMINADORA` (id 142) now
  points at dataset 3666 and `ESCALADORA` was created as id 1417 from dataset 2311.
- Off-database copy of the original 164 rows: `backups/production-exercise-library-*.json`
  (git-ignored).

**Media**

- `node scripts/exercise-dataset/sync-media.js --copy` filled
  `C:\Users\admin\Documents\GitHub\Dupla-exercises-media` (1324 GIFs + 1324 thumbnails, 131 MB),
  now published as the public GitHub repo `vcmxs/Dupla-exercises-media` at commit
  `d3e64b9f1e1dab64150e81b845f0e30e88dd719a`. A single 131 MB pack was rejected by GitHub, so the
  history is eleven ~250-file commits pushed one by one.
- `EXERCISE_MEDIA_BASE` is optional from now on: `server.js` and
  `frontend/lib/exercise-media.ts` default to the pinned jsDelivr URL
  `https://cdn.jsdelivr.net/gh/vcmxs/Dupla-exercises-media@d3e64b9f1e1dab64150e81b845f0e30e88dd719a`
  (also verified with HTTP 206, as was
  `https://raw.githubusercontent.com/vcmxs/Dupla-exercises-media/d3e64b9/...`). Setting
  `EXERCISE_MEDIA_BASE` on Railway / `NEXT_PUBLIC_EXERCISE_MEDIA_BASE` on Vercel still overrides it and
  is what to do whenever the media repo or the CDN changes.


**Verified after the deploy of `e1a721f`**

- `GET /api/v1/exercises` → `200` with `source`, `dataset_id`, `gif_file`, `thumb_file`, `gif_url`,
  `thumb_url`; `?source=dataset&limit=5` returns 5 rows, all with `gif_url`.
- `/api/v1/exercises/lookup?name=caminadora` → `CAMINADORA`, dataset 3666, treadmill GIF
  (`206 image/gif` on jsDelivr); `?name=ESCALADORA` → dataset 2311.
- `?search=curl barra` → `CURL DE BÍCEPS CON BARRA Z`; categories → 19.
- Media coverage: 165 catalog rows (79 with a GIF) + 1238 dataset rows (all with a GIF) = 1403 rows.
- Vercel serves a build whose `/dashboard` chunk contains the pinned media base, so web and mobile
  consume the same enriched endpoint.

**Code**

- Push to `main` redeploys Railway (API) and Vercel (web). The push must always come **after**
  migration 009: the deployed `GET /api/v1/exercises` selects `dataset_id`, `gif_file` and
  `thumb_file`, so code without the schema returns 500 for the catalog used by web and mobile.
- `.gitignore` now excludes `.expo`, `frontend/tsconfig.tsbuildinfo`, the OAuth credentials JSON,
  `temp_landing`, `gym-training-fronten old` and `backups/` so they can never be pushed.

**Still manual / pending**

- Optional: set `EXERCISE_MEDIA_BASE` / `NEXT_PUBLIC_EXERCISE_MEDIA_BASE` in the Railway and Vercel
  dashboards (no CLI is installed in this workspace). The code already defaults to the pinned
  jsDelivr URL, so this is only needed to move media to another CDN or commit.
- Browser QA of the five fixes listed in the previous section (assignment with plan-internal
  routines, delete-plan confirmation, GIF from the catalog, Spanish strings).
- Phase 2 for plan-internal routines (server-side persistence via `POST /workout-templates`) is
  still deferred; they remain in `localStorage` (`dupla_local_workouts`).

## Follow-up session 2026-11-09 — Bi-serie + exercise reordering in every routine builder

**Goal:** every screen where a coach builds or customises a routine can (a) link an exercise to the previous one as a bi-serie and (b) reorder the exercises, using only the platform's native HTML5 drag-and-drop plus ▲/▼ buttons (no new dependency; `GripVertical`, `ChevronUp`, `ChevronDown` already exist in `lucide-react@0.564.0`).

**New shared module `frontend/components/dashboard/exercise-reorder.tsx`:**

- `useExerciseReorder(onMove)` returns `{ isDragging, isDropTarget, rowProps, handleProps, moveUp, moveDown }`. Tracking is **index based**, which is what lets it serve builders with local ids and the plan-day list, whose rows may have no stable `id` at all.
- `DragHandle` is the only `draggable` element, so the exercise-picker button, the number inputs and the delete button keep working normally; `ArrowUp`/`ArrowDown` while it is focused moves the row (keyboard access).
- `ReorderArrows` (▲/▼, disabled at both ends) is the touch-friendly path, `SupersetToggle` renders the `BI-SERIE` / `Link` pill (i18n via `t.programs.*`), and `moveItem` / `newExerciseRowId` are the small helpers used by every caller.
- Feedback: the dragged row dims (`opacity-60`) and the row under the pointer is highlighted with the page accent; `draggedId` is always cleared on drop/`dragend`.

**Integrated in all four builders:**

- `programs-view.tsx` → `WorkoutPickerPanel` create mode, `WorkoutBuilderSheet` (program workouts, create **and** edit) and the plan-day editor.
- `workouts-view.tsx` → `WorkoutBuilderSheet` (`ExerciseRow` list).
- `assign-workout-modal.tsx` → `build` step.
- The plan-day editor was extracted from `AssignPlanModal` into a new `PlanDayEditorSheet` component: it lived inside a conditional IIFE, which cannot host hooks. Its numeric inputs are uncontrolled, so the row key includes the index to force a remount after a move and keep the displayed values aligned with the new position.

**Bi-serie persistence (existing backend convention, untouched):** the linked exercise is stored with `rest_time = -1` and the previous one keeps its normal rest; order is the array index sent as `exerciseOrder` (`models/Workout.js` keeps `-1` because it uses `ex.restTime || 60`). Payload builders now guard `i > 0` so a leading exercise can never carry `-1` (nothing above it to link to), and the plan-day editor toggles `restTime`/`rest_time` on the row itself so the flag travels with the exercise when it is reordered.

## Follow-up session 2026-11-09 — Coach invite link (`/join/<code>`)

**Goal:** a coach can share ONE link and any trainee who opens it ends up linked to that coach
automatically on signup (or after logging in). Before this, the only way to link a trainee was
`POST /coaches/:coachId/trainees` with the trainee's **email**, and that required the trainee to
already have an account.

**Deliberately NOT the Win-Win code.** `users.referral_code` is the coach→coach commission program
(`controllers/referral.controller.js`, `referral_earnings`, 20% discount). Mixing "give me money" with
"link this account to me" would make the commission rules ambiguous, so the invite lives in its own
table and service.

**Schema — `migrations/011_coach_invites.sql` (`run-migration-011.js`)**

- `coach_invites(id, code UNIQUE, coach_id FK→users ON DELETE CASCADE, created_at, expires_at,
  max_uses, uses DEFAULT 0, revoked DEFAULT FALSE)`, index on `coach_id` + unique index on `code`.
- Idempotent (`CREATE TABLE/INDEX IF NOT EXISTS`), so it is also safe inside `db.js`
  (`createTables()` now creates it next to `coach_trainee`).
- Applied to **staging** with `node run-migration-011.js` (freshly created, 0 rows). Production still
  pending: `CONFIRM_PROD_MIGRATION=YES node run-migration-011.js --production`.

**Rule reuse — `services/coachLinkService.js` (new)**

- `linkTraineeToCoach({ coachId, traineeId, trainee })` is now the ONLY place that applies the
  linking rules: coach tier limit (`getTraineeLimit`), peer-coaching slot on the coach being trained,
  role check (trainee|coach only), self-assignment, "one active coach per trainee" (`409`), the
  `coach_trainee` insert and the `friendships` auto-accept.
- Failures are typed `CoachLinkError` (`LIMIT_REACHED` 403, `PEER_LIMIT_REACHED` 403,
  `ALREADY_ASSIGNED` 409, `INVALID_ROLE`/`SELF_ASSIGN` 400, `TRAINEE_NOT_FOUND`/`COACH_NOT_FOUND`/
  `INVALID_INVITE` 404) and serialized by `err.toJSON()` (`{ error, code, message, ...meta }`).
- `assignTrainee` (`controllers/user.controller.js`) was refactored to look the trainee up by email
  and delegate everything else to the service, so the manual path and the invite path can never
  diverge. `getAvailableSlots(coachId)` powers the "X/Y" counter.

**Invites — `services/coachInviteService.js` (new)**

- `generateCode()` = 6 chars `[A-Z0-9]` from `Math.random().toString(36)` (same alphabet as referral
  codes, shorter for WhatsApp links); `createInvite()` retries on `23505` (unique violation).
- `getOrCreateInvite(coachId)` reuses the coach's active, non-revoked, non-expired, non-exhausted
  invite (lazy creation, same pattern as `GET /referrals/stats`).
- `rotateInvite(coachId)` revokes every active invite and mints a new one.
- `findInviteByCode(code)` is case-insensitive and returns `invalid_reason`
  (`revoked` | `expired` | `exhausted`); `consumeInvite({ code, userId })` validates the code, calls
  `linkTraineeToCoach` and only then bumps `uses`.
- `buildInviteUrl(code, req)` = `WEB_APP_URL` → request `Origin` (keeps localhost links local) →
  `https://duplagym.vercel.app`. `.env` has a new empty `WEB_APP_URL=` entry documenting this.

**API**

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/v1/coaches/:coachId/invite` | yes (self or admin) | `{ code, url, uses, maxUses, expiresAt, tier, maxTrainees, currentCount, slotsAvailable }` |
| `POST` | `/api/v1/coaches/:coachId/invite/rotate` | yes (self or admin) | revokes + reissues |
| `GET` | `/api/v1/coach-invites/:code` | **no** | always 200: `{ valid, reason?, coachName?, slotsAvailable?, tier? }`, rate-limited 120/15 min |
| `POST` | `/api/v1/coach-invites/apply` | yes | `{ code }` → links `req.user`, returns `{ success, coachId, coachName }` |

**Registration / login wiring**

- `controllers/auth.controller.js`: `register` accepts `coachInviteCode` (multipart field) and
  `googleLogin` accepts it in the JSON body. Both call `consumeInvite` right after the user exists and
  return `inviteWarning` instead of failing — a broken invite must never block a signup.
- `frontend/app/register/page.tsx` reads `?coach=CODE` with `readInviteCode()` (no `useSearchParams`,
  therefore no `<Suspense>` requirement), shows a "You're joining X's team" banner, appends
  `coachInviteCode` to the `FormData` and forwards the code to `google-login`. On success it only
  redirects to `/dashboard` when the API actually returned a token; otherwise it goes to `/login`
  (registration requires email verification — pre-existing behaviour, keep it in mind).
- `frontend/app/login/page.tsx` reads the same `?coach=`, shows a banner, calls
  `POST /coach-invites/apply` after a successful password **or** Google login, and also applies a
  pending code when the visitor is already logged in before redirecting. Failures are logged
  (`console.warn`) and never block the login.

**Frontend**

- `frontend/lib/coach-invite.ts` (new): `readInviteCode`, `fetchInvitePreview`, `applyInviteCode`,
  plus the `CoachInvite` / `CoachInvitePreview` types.
- `frontend/app/join/[code]/page.tsx` (new, client component, `useParams`): loading → coach name +
  "N spots available"; when logged in it offers **Link my account**, otherwise it deep-links to
  `/register?coach=CODE` and `/login?coach=CODE`. Invalid/revoked/expired/exhausted codes get their own
  message. A coach with no free slots shows a "plan is full" note instead of the CTAs.
- `frontend/components/dashboard/trainees-view.tsx`: new share card in "My Trainees" — the URL, Copy
  (with a `document.execCommand` fallback), Share (`navigator.share`, WhatsApp `wa.me` fallback),
  Regenerate (with confirm) and a `code · uses · slots` line. The email dialog is untouched.
- i18n: `trainees.share*`, `joinPage.*`, `registerPage.invitedBy|inviteCodeNote|inviteWarning`,
  `loginPage.inviteBanner|inviteBannerFallback` in both `en.ts` and `es.ts`.

**Validation run**

- `node --check` on every new/edited backend file — clean.
- Temporary unit smoke test with a stubbed `pool.query` (deleted afterwards): 12 assertions covering
  `LIMIT_REACHED`, happy-path insert, `ALREADY_ASSIGNED` (other coach / same coach), `PEER_LIMIT_REACHED`,
  `INVALID_ROLE`, `SELF_ASSIGN`, slot math, code format, unknown/revoked/exhausted codes and `uses + 1`.
- Temporary HTTP wiring test against the **staging** DB (deleted afterwards): `GET
  /coach-invites/NOPE12` → `200 {valid:false,reason:"not_found"}`; `POST /coach-invites/apply` and
  `GET /coaches/1/invite` without a token → `401`; a real invite created for coach #1 (gold) previews
  as `{valid:true,coachName:"Coach Mike",slotsAvailable:24,maxTrainees:25}`; `getOrCreateInvite` reuses
  the same code; the throwaway row was deleted.
- `cd frontend && npx tsc --noEmit` → clean; `npm run build` → compiled, `/join/[code]` listed as
  `ƒ (Dynamic)`.

**Still manual / pending**

- Browser QA: starter coach at 1/1 (limit copy), trainee already linked (409 copy), rotated link (the
  old one must stop working), peer coaching, `/join/<code>` incognito **and** logged in, the deep links
  on `/register` and `/login`, and the WhatsApp fallback on desktop.
- Production migration + redeploy (Railway API, Vercel web). Register `WEB_APP_URL` in Railway/Vercel if
  the invite links should not rely on the request `Origin` header.



**Also fixed:** builder row ids were `ex-${Date.now()}`, so two rows created in the same millisecond collided and broke the React keys used as drag identity → `newExerciseRowId()` = `ex-<ts>-<rand>`. The `assign-workout-modal` pill labels were hardcoded English → `t.programs.biSerie` / `t.programs.link`. New locale keys `dragToReorder`, `moveUp`, `moveDown` in `frontend/locales/{en,es}.ts`.

**Validation run:** `npx tsc --noEmit` and `npm run build` inside `frontend` both pass (Next 16 / Turbopack, 14 static routes). ESLint still cannot run here (no `eslint.config.*`, installed ESLint is v10).

**Pending manual QA:** drag and ▲/▼ in each of the four builders in ES and EN; confirm the bi-serie survives save + reload and that the trainee/trainee-session view shows the linked pair; check the 380 px layout (arrows instead of dragging) and that reordering does not disturb the exercise picker, the "?" reference dialog or the last-session chips in the plan-day editor.

**Notification localization, coach unlinking and mobile set tables (2026-11-12):** the commit log has the detail; this entry records what shipped and what is still manual.

- Notifications no longer store finished English sentences. `services/notificationI18n.js` renders title and body in the recipient's language from structured params, and `users.language` (`migrations/012_add_user_language.sql`, `run-migration-012.js`) holds that preference. `PATCH /users/:userId/language` persists what the user picks in Settings.
- In-app popups (`frontend/components/notifications/notification-popups.tsx`, `notification-toast-card.tsx`, `lib/notification-sound.ts`, Sonner `<Toaster>` in `app/layout.tsx`), a notification-sound toggle, the language picker and a "My coach" card live in `settings-view.tsx`. A trainee can now leave their coach: `DELETE /users/:userId/connection/:coachId` is bidirectional, drops the auto-created friendship and notifies the counter-party with localized copy.
- Direct messages create a single deduplicated `direct_message` notification per sender, conversation payloads carry `unreadCount`, opening a chat clears that sender's notifications, and the push goes to `receiverId` (it went to `friendId`, i.e. the sender).
- `db.js` reads `timestamp without time zone` as UTC and pins every pooled session to UTC; on a UTC-4 machine stored 21:35 UTC came back as 01:35 the next day.
- The set tables in `workouts-view.tsx` and `trainee-detail.tsx` are fluid on mobile: the weight input grows, action buttons are 24px with a 48px header spacer, every row has `min-w-0`, and the `sm:` values keep the desktop table identical. Minimum row width dropped from ~388px to ~218px (single) / ~300px (superset), so 320-390px viewports no longer clip the reps box or the buttons.
- Chore: `gym-training-fronten/` (the first CRA prototype) and the accidentally tracked `node_modules/` were removed from the repository.

**Deployment record (2026-11-12):** migrations 011 and 012 were applied to the production Railway database (`coach_invites` created; `users.language` added with 45 users, all `es`), then `main` was pushed (`db26fce`, 7 commits). The Railway API redeployed from GitHub and serves the new code: `GET /api/v1/coach-invites/NOPE12` answers `200 {"valid":false,"reason":"not_found"}` (it was `404` for the whole route before) and `PATCH /api/v1/users/1/language` answers `401` instead of `404`. `GET /api/v1/notifications` without a token still answers `401`, so auth is intact.

**Still manual / pending**

- Confirm in the Vercel dashboard that the web deployment of the latest `main` commit finished. No web URL is checked into this repository, so it could not be probed from here.
- Browser QA: popups and sound toggle, switching es/en (UI + newly generated notifications), message unread counts and the "opens the chat clears the badge" behavior, and the leave-coach flow from `Settings` and `TraineeOverview`.
- Mobile QA of the set tables at 320/360/375/390px plus desktop >= 640px (must look unchanged).
- `tsconfig.json` in the repository root is an Expo leftover (`extends: expo/tsconfig.base`). It is untracked; delete it or move it to the mobile repository.

**Deployment record (2026-11-18):** the six commits behind `b2261ea` were promoted to production.
Order used: the migrations first, then the push. `CONFIRM_PROD_MIGRATION=YES node run-migration-013.js --production`
and `… run-migration-014.js --production` created the two `workout_plans` agenda indexes and the
`release_notes` table plus `idx_release_notes_published` on `mainline.proxy.rlwy.net:56505/railway`
(both additive and idempotent), then `git push origin main` (`8a47aff..b2261ea`) redeployed Railway and
Vercel automatically.

Verified live after the deploy:

- `GET /api/v1/release-notes` → `200` with an empty list, **without** a token; the route is public on
  purpose because the notes are global (the v1.4 note was seeded afterwards, see the pending list below).
- `GET /api/v1/agenda/today` → `401` (it answered `404` before).
- `GET /api/v1/workout-plans/1` → `401` (it used to answer anonymously; `loadWorkoutPlan` now scopes a
  plan to its trainee, its coach or an admin and freezes completed sessions for writes).
- `GET /api/v1/notifications` and `GET /api/v1/admin/release-notes` → `401`.
- `https://duplagym.vercel.app/novedades` → `200`, and the served HTML already contains the "Novedades"
  heading, so the Vercel build picked up the new route.

**Still manual / pending (2026-11-18)**

- The first note (**v1.4**, `release_notes.id = 1`, created `2026-11-19T00:09:41Z`) was seeded straight into
  the production table with a one-off script, **without** the notification fan-out (`notified_at` is NULL).
  `GET /release-notes` returns it and the route answers
  `access-control-allow-origin: https://duplagym.vercel.app`, so the Vercel page can render it.
- To ping the bell the note must be re-created: delete it in Admin → Release Notes and publish the same
  copy from the panel with *Notify* checked (`POST /admin/release-notes` inserts one `release_note` row per
  active coach/trainee and reports `notified`). It was left silent on purpose — the mobile app still has no
  `notifications.release_note` key, so a fan-out today would show every mobile user the raw
  `{"version":"1.4"}` params in the bell.
- Mobile: `Dupla-mobile/src/locales/{en,es}.json` still has no `notifications.release_note` key (nor
  `direct_message`), and `NotificationScreen` falls back to the raw JSON params (`{"version":"…"}`) when
  the key is missing. Nothing breaks, but add the key and ship a build so the bell copy reads properly;
  the mobile app cannot open `/novedades` yet either.


## Session ownership — only the trainee may execute a workout (2026-11-18)

**Bug.** The dashboard's *Today's workouts* row let a coach open a trainee's session in
`WorkoutDetailSheet` and log sets or press *Complete Workout*. The API accepted those writes:
`loadWorkoutPlan` only enforces **read** access (trainee, their coach, admin) and the
start/complete/log routes reused it. Completing someone else's session wrote training volume
under the trainee's name, froze their plan as `completed` and fired `notifyCoachOnCompletion`
back at the coach — a coach notifying themself about a session they "finished".

**Backend fix.** `middleware/plan-access.js` exports three helpers:

- `sessionOwnerId(plan)` → `trainee_id`, falling back to `coach_id` for plans created before that
  column existed. A coach's own routine keeps working because the builder stores
  `trainee_id = coach.id` for self-assigned plans.
- `isSessionOwner(plan, user)` → id comparison as strings (`req.user.id` is an int, the DB row may
  be a bigint).
- `requireSessionOwner()` → `403 {"message":"Only the trainee this session belongs to can log sets
  or complete it"}`. Admins are **not** exempt: nobody executes someone else's session.

`routes/workout.routes.js` mounts it on `POST /:workoutPlanId/start`,
`POST /:workoutPlanId/complete` and on `POST`/`PUT`/`DELETE` of
`/:workoutPlanId/exercises/:exerciseId/logs(/:logId)`. The three log routes also moved from
`loadWorkoutPlan()` to `loadWorkoutPlan({ blockCompleted: true })`, so a finished session now
rejects logs with `409` (that matches what the v1.4 note promised). The `GET` routes were left on
plain `loadWorkoutPlan()`, so a coach keeps full read access to agenda, history and logs.

**Web fix.** In `frontend/components/dashboard/workouts-view.tsx`, `SetLogRow`,
`SupersetRowWrapper`, `SupersetSection` and `ExerciseSetSection` take a `readOnly` prop; when it is
set `SetLogRow` renders a static row (set number, previous session, weight, reps, no inputs and no
save/uncheck buttons). `WorkoutDetailSheet` derives

```ts
const sessionOwnerId = rawDetail?.traineeId ?? rawDetail?.trainee_id ?? rawDetail?.coachId ?? rawDetail?.coach_id
const isSessionOwner = sessionOwnerId != null && me?.id != null && String(sessionOwnerId) === String(me.id)
const showCompleteButton = !loading && !loadFailed && !isCompleted && isSessionOwner
```

and hides the floating *Complete Workout* button plus the `pb-32` spacer (now `pb-6`), adds a lock
icon + *View only* / *Solo lectura* chip next to the status badge (`workouts.viewOnly` and
`workouts.viewOnlyHint` added to `frontend/locales/en.ts` and `es.ts`), and passes
`readOnly={!isSessionOwner || isCompleted}` to both set sections. Completed sessions were already
read-only in the sheet; the new flag keeps that path unchanged.

**Verification (2026-11-18, staging Railway DB `caboose.proxy.rlwy.net:21099/railway`).** A throwaway
Express harness mounted only `routes/workout.routes` and created disposable coach/trainee/admin users

## Touch reordering on web — pointer events instead of HTML5 drag (2026-11-19)

**Bug.** Reordering exercises worked with a mouse only. `useExerciseReorder`
(`frontend/components/dashboard/exercise-reorder.tsx`) and the plan timeline in
`programs-view.tsx` were built on the HTML5 drag-and-drop API (`draggable`,
`onDragStart/Over/Drop`), which iOS Safari and Android Chrome never fire for a
finger — the grip and the day cards were dead controls on phones. It was not a
scroll/`touch-action` regression; the events simply do not exist for touch.

**Fix — engine swapped inside the hook, public API untouched.** `rowProps`,
`handleProps`, `isDragging`, `isDropTarget`, `moveUp`, `moveDown` keep their
signatures, so the four builders (`workouts-view` `WorkoutBuilderSheet`,
`assign-workout-modal`, `programs-view` `WorkoutBuilderSheet` and
`PlanDayEditorSheet`) changed by zero lines. The engine is now Pointer Events:

- The grip drags immediately (`onPointerDown/Move/Up/Cancel` +
  `setPointerCapture`), so row clicks, inputs and pickers keep working.
- `touch-action: none` + `select-none` live on the grip only (`handleProps().style`),
  so the sheet still scrolls everywhere else. This is the first `touch-action` in
  the repo.
- A press becomes a drag after `DRAG_THRESHOLD_PX` (6 px), so taps and vertical
  scroll attempts still behave.
- Rows expose only `data-reorder-row={index}` (`rowProps`); because the pointer
  is captured, the drop target is resolved with
  `document.elementFromPoint(x, y).closest("[data-reorder-row]")`. A miss (gap
  between rows, sticky header) keeps the last valid target instead of cancelling.
- Auto-scroll: `scrollableAncestors()` collects the sheet's own `overflow-y`
  scrollers and an rAF loop scrolls them by 12 px inside a 56 px top/bottom edge
  band. `reset()`/unmount cancels the frame.
- `pointercancel` and a spontaneous `lostpointercapture` abort without moving
  rows; only `pointerup` commits. ▲/▼ arrows and `ArrowUp`/`ArrowDown` on the
  grip are unchanged.
- Hit sizes: grip `h-8 w-6` on phones (compact `h-6 w-4` from `md`), arrows
  `h-6 w-6` (`md:h-3.5 md:w-4`), grip tinted `#777777` on a faint background so
  it reads as draggable.

**Long press on the whole card (same session).** Aiming at a 24×32 px grip while
holding a phone was still uncomfortable, so any touch held on the card for
`LONG_PRESS_MS` (350 ms) arms the same engine and drags the row:

- The row keeps `touch-action: auto` on purpose. A hold timer is started on
  `pointerdown`; a finger that travels more than `LONG_PRESS_CANCEL_PX` (10 px)
  before the timer fires cancels it, so a quick swipe still pans the sheet.
- When the hold completes the row calls `setPointerCapture`, adopts the pointer
  id, starts auto-scroll, and installs a **non-passive** `document` `touchmove`
  listener that calls `preventDefault()`. React registers `touchmove` as passive,
  so a JSX handler could not veto the pan that would otherwise start mid-drag.
  The listener is removed by `reset()`, the unmount cleanup and `clearTouchGuard()`.
- Presses inside `INTERACTIVE_SELECTOR` never arm: `input`, `textarea`, `select`,
  `label`, `a`, `[aria-haspopup]` (Radix triggers open on `pointerdown`, long
  before a hold could win), `[role="slider"]`, `[contenteditable="true"]` and the
  `[data-no-long-press]` escape hatch. Plain buttons (exercise name, trash, ▲/▼,
  superset pill) do arm, so the card is draggable almost anywhere.
- Feedback: `navigator.vibrate(8)` where supported plus a 2 px white outline on
  the grabbed row (`rowProps().style`), removed on drop.
- The release of a hold must not also click the row, so `suppressClickRef` makes
  `onClickCapture` swallow that one click; `onContextMenu` is vetoed while a hold
  or drag is live and rows carry `-webkit-touch-callout: none` (selection inside
  inputs is untouched because `user-select` is only set while dragging).
- The grip keeps its instant 6 px behaviour; the row handler bails whenever
  `pointerIdRef` is already set, so the two surfaces never fight.

**Plan timeline (`AssignPlanModal` in `programs-view.tsx`).** A 7-column grid
that scrolls horizontally is a bad touch-drag surface, so the card drag stayed
mouse-only and a new **Mover a… / Move to…** menu (existing Radix
`DropdownMenu`, 32 px trigger under each day card) does the move on touch. The
old `handleDrop(targetDay)` was split into `moveSlot(fromDay, toDay)` (swap when
the destination is occupied, move otherwise, same semantics as before) plus a
thin `handleDrop` for the desktop path. `draggable` is now gated behind
`matchMedia("(pointer: fine)")`, evaluated in an effect (SSR keeps `false`, so
hydration stays stable). The column header label also stopped using
`(t.programs as any).daysShort` — a typed `shortDay()` helper replaces it.

**i18n.** `programs.moveToDay` — *Move to…* / *Mover a…* — in `en.ts` and `es.ts`.

**Validation run.** `cd frontend && npx tsc --noEmit` → clean (twice: after the
pointer-events engine and after the long press). `npm run build` was run for the
first pass (Next 16 / Turbopack, 15 routes); it was deliberately not re-run for
the long press because `next build` would wipe the `.next` directory the
developer's `next dev` server was serving from at the time — `tsc` plus the dev
server's on-demand compile (`GET /` and `GET /dashboard` → 200) covered it.

**Confirmed by the user.** The pointer-events engine works in the local build
(`localhost:3000` + API on `:3001`); the earlier "still dead" report came from
testing the deployed site, which does not have this change yet because nothing
has been pushed.

**Still manual / pending.** Chrome DevTools touch emulation and a real phone:
hold a card for ~350 ms in each of the four builders, confirm the sheet keeps
scrolling on a quick swipe and that inputs/trash/pickers still respond to a tap,
drag to the top/bottom edge to check auto-scroll, and check "Mover a…" in ES and
EN (move to an empty day and swap with an occupied one). Nothing is committed yet
for this change.

(no push tokens, so nothing real could be notified) plus three plans; **25/25 assertions passed** and
every row was deleted afterwards (`PURGED plans=0 users=0`):

| Caller | GET plan | start | log set | edit/uncheck log | complete |
| --- | --- | --- | --- | --- | --- |
| anonymous | `401` | — | — | — | — |
| coach, trainee's plan | `200` | `403` | `403` | `403`* | `403` |
| admin, trainee's plan | `200` | — | `403` | — | `403` |
| trainee, own plan | `200` | `200` | `201` | `200` | `200` |
| coach, own plan | — | — | `201` | — | `200` |
| trainee, completed plan | — | — | `409` | `409` | — |

\* *edit/uncheck as coach was not part of the run; those two routes carry the identical
`requireSessionOwner()` guard, verified in the route diff.*

Also checked: the rejected writes left the plan at `status = assigned` with zero logs, the
unrelated trainee gets `403` on the coach's own plan, `npx tsc --noEmit` is clean and
`npm run build` in `frontend` compiles all 15 routes.

**Follow-up.** The mobile app (`Dupla-mobile/src/screens/WorkoutDetailScreen.js`) still shows its own
log/complete controls and relies on the same API, so a coach on mobile now gets a 403 toast instead of
a hidden button; hide those controls for `workout.trainee_id !== user.id` in the next mobile build.
A v1.5 release note for this fix has **not** been seeded (same notification fan-out caveat as v1.4).

## Coach's own routine in the agenda + who a session belongs to (2026-11-19)

**Symptom.** A coach's own routine never showed under *Hoy / Today's workouts* on the dashboard, even
though it listed in *Mis rutinas* and opened fine from there. Trainees' sessions appeared normally,
which is what made it look like a frontend filter.

**Root cause (backend).** `Workout.findAgenda({ coachId })` — the query behind `GET /agenda/today`
(`controllers/agenda.controller.js` passes `coachId = req.user.id` for every non-admin, non-trainee
role) — scoped coaches to
`wp.trainee_id IN (SELECT trainee_id FROM coach_trainee WHERE coach_id = $3)`. A self-assigned routine
is created with `trainee_id = coach_id` (`workouts-view.tsx#handleCreate` sends `traineeId: user.id`)
and `coach_trainee` never links a coach to themself, so the subquery could never match it. It is not
related to the session-ownership fix (`eb8d3b9`), which only touched the write routes.

**Fix.** `models/Workout.js#findAgenda` adds `OR wp.trainee_id = $3::int` to the coach predicate. The
`traineeId` scope, the unscoped (admin) path and the `scheduled_date` predicate are unchanged, so the
migration-013 indexes still apply. `controllers/agenda.controller.js` documents the rule in its header
and next to the scope assignment.

**Whose routine is open.** `GET /workout-plans/:id` now also returns `traineeName` and `coachName`
(subqueries on `users`; `null` stays `null`), so the sheet no longer needs a second round-trip.
`frontend/components/dashboard/workouts-view.tsx`:

- `ApiWorkout` gains `traineeName` / `trainee_name` / `coachName` / `coach_name`, `DisplayWorkout`
  gains `ownerName`; `apiToDisplay` reads the detail names and `displayWorkoutFromAgenda` seeds it
  from the agenda row (`AgendaWorkout.traineeName`), so the label is already there while the fetch is
  in flight (and for notification-opened sheets it comes from the payload).
- `WorkoutDetailSheet` renders a cyan user-icon line under the date: `workouts.yourRoutine`
  (*Tu rutina* / *Your routine*) when the viewer owns the session, `Para: <name>` / `For: <name>`
  otherwise. New keys `workouts.forTrainee` and `workouts.yourRoutine` in `frontend/locales/en.ts` and
  `es.ts`. The line is not tied to `--hp`, so it stays readable while scrolling through the sets.
  *(Superseded the same day: the header now titles itself with the trainee name, so `forTrainee` was
  removed again — see the next section.)*

**Verification (2026-11-19, staging Railway DB `caboose.proxy.rlwy.net:21099/railway`).** Throwaway
Node harness (deleted afterwards) with a coach, a linked trainee, an unlinked trainee, three plans
dated today and one exercise — **14/14 assertions passed**:

- `findAgenda({ coachId })` → own routine **and** the linked trainee's plan; the stranger's plan is
  absent. Unscoped (admin) returns all three fixtures.
- `findAgenda({ traineeId: coachId })` → the own routine only; `{ traineeId: linked }` → that plan only.
- The own row keeps `trainee_name` (the coach, as the agenda row prints it) and `exercise_count = 1`.
- `getWorkoutPlanById` payload: `traineeName` / `coachName` correct on both plans, a `null`
  `coach_id` resolves to `null` instead of throwing, and `traineeId` is unchanged so the sheet's owner
  check keeps working.
- Cleanup of the fixtures: `PURGED plans=3 links=1 users=3`, `LEFTOVER users=0 plans=0`.

`npx tsc --noEmit` is clean and `npm run build` compiles all 15 routes.

**Follow-up.** Same mobile caveat as the previous section: `Dupla-mobile` renders its own header, so it
can read the new `traineeName` from the detail payload but does not show it yet.

## Agenda rows: own routine first, owner-first labels, trainee in the sheet header (2026-11-19, follow-up)

**Product goal.** In *Hoy / Today's workouts*: the coach's own routine comes first and its icon is
cyan; trainee rows swap the padlock for the two-people icon; the trainee **name** leads and the routine
name moves underneath. Opening a session shows whose it is.

**Ordering — `models/Workout.js#findAgenda`.**
`ORDER BY (wp.trainee_id = $3::int) DESC NULLS LAST, u.name ASC, wp.created_at ASC`. `$3` is the coach
id, so the own routine leads and the trainees follow alphabetically. `NULLS LAST` is deliberate: in the
trainee and admin scopes `$3` is NULL, so every row evaluates the boolean to NULL and the day must stay
plain-alphabetical (own routine *not* pinned — an admin has no "own" row in that listing).

**`isMine` — `controllers/agenda.controller.js`.** `toAgendaItem(row, viewerId)` adds
`isMine: traineeId === viewerId`, and `getTodayAgenda` passes `Number(req.user.id)`. The row needs it
because a trainee's self-made plan and a coach's own routine are indistinguishable through
`isCoachAssigned` alone (both `false`). Additive: mobile ignores the field.

**Row — `frontend/components/dashboard/workout-row.tsx`.**
- `AgendaWorkout.isMine`; `showOwnerFirst = !isMine`.
- Primary line: **trainee name** for someone else's session; **`workouts.myRoutine`** (*Mi rutina* /
  *My routine*) for your own routine, with the real routine name on the secondary line. `labelMine`
  comes from `TodayWorkouts` and is only `true` when the day mixes owners — a trainee's listing is all
  theirs, so there the routine name stays the headline and the secondary line is just `N ejercicios`.
- Icons: `Lock` → `Users` (same glyph as *Alumnos*) on coach-prescribed rows, keeping the status tint
  (gold while pending, `CheckCircle2` green when done). Own rows always use the cyan palette
  (`#00ffff` on `rgba(0,255,255,0.10)`) with `Dumbbell`, or a cyan check when completed.
- The left status edge is untouched on purpose: tinting it cyan would have removed the trainee's
  "prescribed by your coach" gold cue.

**Sheet header — `frontend/components/dashboard/workouts-view.tsx`.** For a session that is not yours:
`Users` badge → **trainee name as `SheetTitle`** → routine name (gray) → date (still fades with
`--hp`). The old `Para: <name>` line is gone, so `workouts.forTrainee` was removed from `en.ts` /
`es.ts` (only `yourRoutine` remains). Your own session keeps routine name + cyan `<User /> Tu rutina`.
New `DisplayWorkout.ownerId`, filled by `displayWorkoutFromAgenda` (and `apiToDisplay`), joins the
`sessionOwnerId` chain — without it the header would briefly title itself with your own name until
`GET /workout-plans/:id` landed.

**Verification (2026-11-19, staging Railway DB).** Throwaway Node harness (deleted afterwards) with a
coach, two linked trainees, one unlinked trainee and four plans dated today — names chosen so
alphabetical order (`Ana`, `Beto`, `Cira`, `Zoe`) differs from own-first. **17/17 assertions passed:**

- `findAgenda({ coachId })` → own routine first, then `Ana`, `Beto`; the unlinked `Cira` excluded.
- `findAgenda({ date })` (admin) → `Ana, Beto, Cira, Zoe`: alphabetical, own routine not pinned.
- `GET /agenda/today` as the coach (fake `req.user`) → own row first, `isMine: true` only on it,
  `isCoachAssigned: true` on `Ana`'s row, `traineeName` correct, `summary.total = 3`.
- As `Ana` (trainee) → single row, `isMine: true` (so her list keeps routine-name-first).
- As an admin → four fixtures, `isMine: false` everywhere.
- Cleanup: `PURGED plans=4 users=4`, `LEFTOVER users=0 plans=0`.

`npx tsc --noEmit` clean, `npm run build` compiles all 15 routes.

**Follow-up.** `Dupla-mobile`'s agenda screen keeps its own labels: it inherits the new order from the
API but ignores `isMine` until it renders it.

## Web polish round: decimal loads, cache policy, progression cadence, run colour (2026-11-24)

**Nine commits, already pushed — `origin/main` = `5d17734`.** Web only (`frontend/**` plus the
`GET /api/v1/version` route in `server.js`); no schema change, no migration, no mobile change.

**Decimal loads — `e6aa59b`.** The set-log row rendered `<input type="number">` with a controlled
string value, so the DOM rejected `"2."` and `62.5` could never be typed; the payload then saved the
truncated integer. Both fields moved to `NumberField` (text input + `inputMode`, local draft), and the
plan day editor does the same for the target load and the weekly increment. The previous-set label is
now a compact `62.5×12` instead of `formatLoad`'s `12 plates × 10`, and the history track is
`minmax(42px, max-content)` with wrapping instead of `truncate`. `DECIMAL(10,2)` was already correct.

**Cache policy and stale data — `0cc2b4a`.** Every `GET` now leaves the API with a deliberate policy:
`/api/v1` answers `no-store` (plans, logs, payments, notifications) while catalogs and release notes
answer `no-cache, must-revalidate` so the browser can revalidate with the ETag Express already
computes and land on a 304. New `GET /api/v1/version` (registered before the rate limiter) reports the
running build id; `useAppVersion()` polls it and calls `router.refresh()` on a redeploy, and
`useRefetchOnFocus()` re-reads the shell KPIs and the bell when the tab becomes visible (collapsed to
one call per 30 s). `apiFetch` coalesces identical in-flight `GET`s — a coalescer, not a cache: entries
are dropped when they settle.

**Day moves on touch — `17dced6`.** `useDayMoveDrag` gives the weekly timeline of *assign plan* the
same Pointer Events engine the exercise builder uses: a 350 ms hold arms the drag, the column under
the finger is resolved with `elementFromPoint`, the timeline auto-scrolls on both axes (the target is
re-resolved every frame because a still finger sends no `pointermove`), and a floating chip names the
workout in the hand. Columns keep `touch-action: auto`, so a quick swipe still pans the sheet and a
hold that travels 10 px is cancelled as a scroll; the HTML5 drag stays for mice.

**Progression cadence — `f3dd296`.** Each row of the plan day editor carries its own rhythm next to
the increase (`+ [1 wk]`, `2 wk`, `4 wk`), stored as `progressionWeeks` and applied at assignment time
as `base + increment × floor(week ÷ cadence)`, rounded to the two decimals the columns accept. Weekly
is the default and the fallback, so plans written before this option assign exactly as they did.

**A run of three is a superset — `3f4019e`.** `groupLabel`, `isLinkedRow` and `linkedGroupSize` moved
next to the builders: two linked rows read as BI-SERIE, three or more as SUPERSET, and the pill
between rows is named after the whole run. Nothing changed on the wire — a superset is still a chain
of `rest_time = -1`.

**Today's workouts needed Retry — `b807fb6`.** Two things in `apiFetch` combined: read-only requests
were shared on `token|path` even when the caller brought its own `AbortSignal` (React double-invokes
effects in dev, the first mount aborted on cleanup and the second was handed that dead promise), and
aborts were rewritten as *Cannot reach the API*, which painted an error card. A request with a
`signal` is now unshareable and an `AbortError` is rethrown untouched; `TodayWorkouts` also retries
once, silently, after 400 ms before it reports a failure.

**Monday's ring was clipped — `06ee0b8`.** The day-hold outline is drawn at `outlineOffset: "-2px"`,
inside the column, because the timeline lives in an `overflow-x-auto` box that cut the first column's
ring in half.

**One colour per run — `4c014f7`.** `LINK_ACCENT`, `linkAccent(size)` and `linkRingClass(size)` in
`exercise-reorder.tsx` are the only source of the colour: cyan for a bi-serie, red from the moment the
run is a superset, applied to frame, header gradient, connector, icon, card ring and the
`SupersetToggle` pill. Consumed by `workouts-view.tsx` (`SupersetSection` plus the new `accent` prop on
`SupersetRowWrapper`), `trainee-detail.tsx`, `assign-workout-modal.tsx` and `programs-view.tsx`; a
standalone exercise gets no ring because `linkRingClass` returns `""` below two rows.

**The day menu became a grip — `5d17734`.** The full-width *Mover a…* button and its Radix menu are
gone from the timeline; a dim `GripVertical` in the card corner (`aria-hidden`, titled with
`t.programs.holdDayToMove`) says the card can be picked up. `moveSlot`, `shortDay` and the mouse drag
are untouched — only the menu trigger and its day list were removed. `t.programs.moveToDay` was
deleted from `en.ts` / `es.ts` in the cleanup commit that follows this round.

**Validation.** `npx tsc --noEmit` clean after every step. While the round was live, the running
`next dev` was also checked by fetching its real client chunks and grepping for the strings each edit
introduces (the outline offset, `AbortError`, the retry loop, `GripVertical`/`holdDayToMove` present and
`moveToDay` absent, the red/cyan ring pair). The cleanup commit then removed
`typescript.ignoreBuildErrors` from `next.config.mjs` and `npm run build` was run for real:
*Compiled successfully in 13.6 s*, *Finished TypeScript in 29.0 s* (the build now fails on type errors
instead of hiding them), 15/15 static pages prerendered, `/join/[code]` dynamic, no warnings. `tsc` was
re-run after deleting `t.programs.moveToDay` from both locales, and `git grep moveToDay -- frontend`
returns nothing while `holdDayToMove` still resolves in `en.ts`, `es.ts` and `programs-view.tsx`.

**Pending browser QA for this round.**

1. Hold a **Monday** card in the plan timeline: the violet outline must be whole; the grip must be
   visible and no *Mover a…* button may remain.
2. Reload the dashboard cold (or restart the API first): *Hoy / Today's workouts* must paint without
   pressing Retry; check the network tab for one aborted `/agenda/today` followed by a successful one.
3. Link two exercises in each of the four builders: cyan ring + cyan BI-SERIE pill; link a third: red
   ring, red frame/header and SUPERSET. A standalone exercise must have no ring.
4. Repeat in ES and EN and at 380 px; confirm the grip does not shift the card header.
5. `frontend/next-env.d.ts` is rewritten by `next dev` — restore it before committing (`git checkout
   -- frontend/next-env.d.ts`).


## Subscription line-up: four capacity tiers (2026-11-25)

**Product rule.** Every plan ships the same product. The only difference is how many trainees a coach
can hold, so the whole pricing surface collapsed to four tiers:

| Tier | Trainees | Price | Max trainees |
| --- | --- | --- | --- |
| Starter | 1 | Free | `1` |
| Bronze | 5 | $5 | `5` |
| Silver | 15 | $15 | `15` |
| Gold (unlimited) | ∞ | $30 | `999` |

`olympian` is gone. `basic` was already gone.

**Backend — `config/subscriptionTiers.js`.** Bronze moved from `maxTrainees: 15 / price: 15` to
`5 / 5`, Silver from `25 / 25` to `15 / 15`, Gold from `50 / 50` to `999 / 30` (label
*Gold (unlimited)*), and the `olympian` block was deleted. `suggestTierUpgrade` now walks
`['starter', 'bronze', 'silver', 'gold']` and falls back to `'gold'`. `getTierInfo('olympian')` returns
`null`, so anything still holding that value resolves to a 0-trainee limit — hence the migration below.

**Why `999` and not `Infinity`.** `slotsAvailable`, `isOverLimit` and `services/coachLinkService.js`
do arithmetic on `maxTrainees`. `999` keeps every comparison numeric (and `NULL`-safe) while the web
formats it as `∞`; a real `Infinity` would have turned JSON payloads into `null` over the wire.

**Frontend.** `frontend/lib/subscription-tiers.ts` (new) is the single place that knows the numbers:
`UNLIMITED_TRAINEES = 999`, `TIER_LIMITS`, `getTraineeLimit(tier)` (unknown/missing → starter limit) and
`formatTraineeLimit(limit)` (`∞` at or above 999). `trainees-view.tsx`, `assign-workout-modal.tsx` and
`programs-view.tsx` dropped their own `TIER_LIMITS` maps and import `getTraineeLimit`; their plan badge
reads `BRONZE 3/5`, `GOLD 3/∞`. The `olympian` entry was removed from the colour maps and the plan
`<select>` in `sidebar.tsx`, `settings-view.tsx`, `trainee-detail.tsx` and
`frontend/components/admin/admin-users-view.tsx`.

**Pricing surfaces.** `frontend/components/landing/pricing-section.tsx` (landing) and
`frontend/components/dashboard/pricing-plans-modal.tsx` (in-app) both render four equal cards
(`lg:grid-cols-4`, prices `null / 5 / 15 / 30`), a per-card trainee-capacity block, `mt-auto` CTAs so the
buttons line up, and one shared *every plan includes* list underneath instead of repeating ten bullets
four times. `frontend/locales/{en,es}.ts` were rewritten accordingly (`landing.pricing.allIncluded`,
`includedTitle`, `included: string[]`, per-tier `{name, sub, cta, trainees}`); the per-tier `features`
arrays and the `olympian` copy are gone. `es.ts` is typed against `en.ts`, so the two locales cannot
drift.

**Migration — `migrations/015_tier_lineup.sql` / `run-migration-015.js`.** Parks every coach that is not
on `starter` on `bronze` (that includes `olympian`, `null` and retired names such as `basic` /
`enterprise`), touching nothing else:

```sql
UPDATE users
   SET subscription_tier = 'bronze',
       updated_at = NOW()
 WHERE role = 'coach'
   AND (subscription_tier IS NULL OR lower(subscription_tier) <> 'starter');
```

The runner mirrors `run-migration-012.js`: `node run-migration-015.js` targets `DATABASE_URL`,
`--dry-run` runs inside a transaction, prints what would change and `ROLLBACK`s, and `--production`
requires `CONFIRM_PROD_MIGRATION=YES` plus `PRODUCTION_DATABASE_URL`. Before the `UPDATE` it writes
`backups/tier_lineup_before_<timestamp>.json` (id, email, role, tier, status, start/end dates,
`is_comped`) so any coach can be restored by hand, and it prints the coach/admin tier distribution before
and after. The migration is idempotent: a second run matches zero rows.

**Order of operations.** Migration first, code second. The new code does not know `olympian`, so an
`olympian` coach served by the deployed API before the migration links trainees against limit `0` and
reports `$0` MRR. `payments` and `referral_earnings` were deliberately left alone; admin MRR is derived
from `users.subscription_tier`.

**Post-migration.** Every paying coach sits on Bronze (5 trainees). The owner re-assigns each one to
Silver or Gold from `/admin` → Users (`PATCH /admin/users/:id/subscription`), which is also what
recomputes the MRR panel.

**Validation run.** `cd frontend && npx tsc --noEmit` clean; `npm run build` exits 0 and the prerendered
`frontend/.next/server/app/index.html` already carries the four cards (Starter / Bronze / Silver /
*Alumnos ilimitados*, *Hasta 5 alumnos*, *Hasta 15 alumnos*, *Todos los planes incluyen*) with no
`olympian`; `git grep -n -i olympian` only matches this file and `WEB_TO_MOBILE.md` (the two dead copies
are untracked); Node assertions — backend `getTraineeLimit` → `1 / 5 / 15 / 999` and `0` for
`olympian`/`undefined`, `getAllTiers()`, `isValidTier('olympian') === false`, `getTierInfo('olympian') ===
null`, prices `0 / 5 / 15 / 30`, `suggestTierUpgrade` → `starter` 1, `bronze` 2–5, `silver` 6–15, `gold`
16+; web `getTraineeLimit` → `1 / 5 / 15 / 999` with `1` for `olympian`/`null`/`undefined`,
`formatTraineeLimit` → `1 / 5 / 15 / ∞` (`5000` → `∞`), plus a mirror check that every tier agrees with
the API. The web fallback is `1` (starter) on purpose while the API returns `0` — an unknown tier must not
silently grant seats.

**Production dry-run (2026-11-25).**
`set CONFIRM_PROD_MIGRATION=YES && node run-migration-015.js --production --dry-run` against
`mainline.proxy.rlwy.net:56505/railway`:

```
📊 Tiers before: starter: 11 · silver: 2 · enterprise: 1 · gold: 1 · olympian: 1
💾 Snapshot: backups\tier_lineup_before_2026-11-25T21-39-00-368Z.json (4 row(s))
🧪 Dry run: 4 coach(es) would move to bronze. Rolled back.
```

The 4 affected coaches are `olympian` ×1, `gold` ×1 and `silver` ×2 (ids 12, 19, 21, 27 — all `coach`);
the 11 coaches already on `starter` are untouched. The `enterprise` row is an **admin**, so the
`role = 'coach'` filter leaves it alone — worth remembering, since `enterprise` is not a valid tier either.
A later duplicate run produced the same four rows (`tier_lineup_before_2026-11-26T02-32-02-268Z.json`).

Staging (`caboose.proxy.rlwy.net:21099`) was asleep on the first attempt and timed out, so the runner now
sets `connectionTimeoutMillis: 15000` and prints `Could not connect …` instead of hanging. Once it woke up,
`node run-migration-015.js --dry-run` answered `basic: 1 · starter: 1` and **0 coaches affected** (the
`basic` rows are an admin and a trainee; the only coach is on `starter`), exercising the
"nothing to change" path — which now skips the snapshot entirely.

**Go / no-go.** The production `UPDATE` has **not** been executed yet. Run it immediately before the code
deploy, never on its own:

```
set CONFIRM_PROD_MIGRATION=YES && node run-migration-015.js --production   :: 4 rows → bronze
git push origin main                                                      :: Railway + Vercel redeploy
```

Only after that push do the new limits (`5 / 15 / 999`) and the new badge copy go live; the reverse order
would leave an `olympian` coach with limit `0` and `$0` MRR in between.

**Still manual / pending.** The production run above + deploy + re-assign plans in `/admin`; browser check
of the landing pricing grid and the in-app pricing modal at 380 px in ES and EN, and a Gold coach's badge
reading `n/∞` in *Alumnos*.

