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

1. **Check duplicate superset thumbnails in the workout session view.** `ExerciseReferenceButton` is rendered by `SupersetRowWrapper` in `workouts-view.tsx`, which is rendered once per round/set; this may show duplicate thumbnails per exercise. Move the button to a once-per-exercise position or render only on the first round, preserving the existing layout. In `trainee-detail.tsx` the superset thumbnail is already gated to round 1.
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
- `EXERCISE_MEDIA_BASE` (Railway) is still **unset**, so the API currently returns
  `gif_url: null`. Set it to
  `https://cdn.jsdelivr.net/gh/vcmxs/Dupla-exercises-media@d3e64b9f1e1dab64150e81b845f0e30e88dd719a`
  and Railway redeploys; `/api/v1/exercises/lookup?name=caminadora` should then return a `gif_url`.
  Both that URL and `https://raw.githubusercontent.com/vcmxs/Dupla-exercises-media/d3e64b9/...` were
  verified with HTTP 206. `NEXT_PUBLIC_EXERCISE_MEDIA_BASE` (Vercel) mirrors it as a fallback only.


**Code**

- Push to `main` redeploys Railway (API) and Vercel (web). The push must always come **after**
  migration 009: the deployed `GET /api/v1/exercises` selects `dataset_id`, `gif_file` and
  `thumb_file`, so code without the schema returns 500 for the catalog used by web and mobile.
- `.gitignore` now excludes `.expo`, `frontend/tsconfig.tsbuildinfo`, the OAuth credentials JSON,
  `temp_landing`, `gym-training-fronten old` and `backups/` so they can never be pushed.

**Still manual / pending**

- The two media environment variables above (no Railway/Vercel CLI is installed in this workspace).
- Browser QA of the five fixes listed in the previous section (assignment with plan-internal
  routines, delete-plan confirmation, GIF from the catalog, Spanish strings).
- Phase 2 for plan-internal routines (server-side persistence via `POST /workout-templates`) is
  still deferred; they remain in `localStorage` (`dupla_local_workouts`).
