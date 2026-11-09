# Dupla — Project Guide

This guide is an orientation map for working on Dupla across its API, web app, and Android/mobile app. It is based on the checked-out source and owner-provided product context; it does not certify the current state of any live deployment.

## At a glance

Dupla is a coaching platform for gym coaches and their trainees. Coaches create and assign training plans; trainees view and complete routines. The web and mobile clients use the same API. An administrator also has tools for managing users and coach subscriptions.

**Repositories in this local checkout**

- API and web: this repository, `Api-MVP`.
- Mobile: sibling repository at `../Dupla-mobile` (from the `Api-MVP` folder; local path supplied by the owner is `C:\Users\admin\Documents\GitHub\Dupla-mobile`).

**Production context from the owner:** Railway API and the Play Store mobile app are the expected production services. Their live behavior, deployed revision, and current store version have not been independently checked.

## Product roles and subscriptions

### Roles

- **Administrator:** manages users and coach platform subscriptions from the web admin area; a smaller admin area also exists in the mobile app.
- **Coach:** manages trainees, creates plans and workouts, assigns training, and uses finance/payment-related features.
- **Trainee:** receives assigned training, records completed sets and progress, and can use shared features such as nutrition and messaging.

### Two separate subscription/payment layers

The owner confirmed that these are distinct:

1. **Coach platform subscription:** Dupla's administrator grants/manages a coach's subscription. The API defines coach tiers and trainee limits in `config/subscriptionTiers.js`; the admin API exposes subscription-management operations.
2. **Coach-to-trainee payment/access:** the coach manages each trainee's payment status. Per the owner, an unpaid or expired trainee subscription means that trainee cannot access either new or previously assigned training.

The code contains multiple subscription fields and checks (including coach subscription status/tier and a trainee coach-subscription end date used in client behavior). This is an important product invariant, but do not assume every API endpoint enforces the rule uniformly without tracing the relevant route, middleware, controller, and client UI for the feature being changed.

## System map

```text
Web app (Next.js) ─────┐
                       ├── HTTPS /api/v1 ── Express API ── PostgreSQL
Mobile app (Expo) ─────┘                       ├── Socket.IO
                                               ├── scheduled subscription check
                                               └── uploads / notification integrations
```

Both clients currently point to `https://api-mvp-production.up.railway.app/api/v1` by default in source, unless the web app's public API environment variable overrides it. Mobile development URL selection is present but commented out, so the checked-in mobile configuration currently selects the production URL even in development. Confirm the intended environment before testing against or changing data.

## API/backend (`Api-MVP` root)

### Stack and entry points

- CommonJS JavaScript, Express 5, PostgreSQL (`pg`), JWT authentication, Socket.IO, `node-cron`, and supporting middleware/integrations.
- `server.js` is the package entry point. It loads the API route router at `/api/v1`, serves uploaded files, initializes Socket.IO, schedules the daily subscription check, and listens on `PORT` (default 3000).
- `routes/index.js` composes route groups. Route modules generally delegate to matching controllers; controllers commonly contain SQL/business logic directly. `models/` contains some model-level database behavior, but the codebase is not organized around a single service/repository layer.
- Some exercise-library endpoints remain directly in `server.js`; several routes are registered in the route aggregator more than once. Treat these as legacy/maintenance details to verify before refactoring.

### Local commands

Run commands from the relevant project directory:

| Project | Command | Purpose |
|---|---|---|
| API root | `npm run dev` | Run `server.js` with Nodemon |
| API root | `npm start` | Run `server.js` |
| API root | `npm run seed` | Run `seed_nutrition.js` |
| API root | `npm run db:check` | Run a read-only PostgreSQL connection check (`SELECT 1`) |
| API root | `npm run db:schema` | List database tables and columns (read-only) |
| API root | `npm run db:copy-schema-to-staging` | Copy schema definitions only to an empty staging DB (guarded) |
| `frontend/` | `pnpm dev` or `npm run dev` | Start Next.js development server |
| `frontend/` | `pnpm build` or `npm run build` | Build the web app |
| Mobile sibling | `npm start` | Start Expo tooling |
| Mobile sibling | `npm run android` | Run the Expo Android native workflow |

Use the package manager and lockfile already established for a repository when installing dependencies. API package scripts do not currently define an automated test command; manual checks and migration helper scripts are present.

There is no root README in the API repository at the time this guide was written. `frontend/CHANGELOG.md` records historical work but includes older stack descriptions; use the current package manifests and source as the authority for framework versions.

### Main API domains

The route/controller groups cover authentication and account management; coach/trainee relationships; workouts, exercise logs, templates and plans; nutrition; programs; notifications and push tokens; social/chat; referrals; currency/configuration; and admin user, subscription, finance, and audit operations. For admin endpoints, `routes/admin.routes.js` applies `requireAdmin` to each registered operation.

Useful starting points:

- `routes/index.js` — API route composition.
- `routes/` and `controllers/` — feature routing and request/business logic.
- `middleware/auth.js` — token, role, and coach-subscription middleware.
- `config/subscriptionTiers.js` — coach tier definitions and trainee limits.
- `cron/checkSubscriptions.js` — scheduled subscription expiry/reminder processing.
- `models/`, `services/`, and `utils/` — supporting database/business helpers.

### Database and migrations

- PostgreSQL connection setup is in `db.js` and re-exported through `config/database.js`.
- `npm run db:check` runs `check_db_connection.js` and tests connectivity without importing `db.js`, creating tables, or inserting seed users. It uses `DATABASE_URL`, or explicit `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` variables.
- `npm run db:schema` runs `inspect_db_schema.js` and lists table/column metadata from the connected database's `public` schema; it does not query application rows or change data. The inspected production and staging schemas each returned the same 24 tables after the schema-only setup. Main domains include users and coach/trainee links/payments; workout plans, exercises, logs, templates and shared sessions; nutrition and weight logs; programs; messages, friendships and notifications; push tokens; referrals, payments/payouts; and admin audit logs.
- `npm run db:copy-schema-to-staging` is a guarded schema-only copy helper. It requires `PRODUCTION_DATABASE_URL`, uses `DATABASE_URL` as the staging target, refuses to proceed unless `CONFIRM_STAGING_SCHEMA_COPY=YES` is set and staging has no public tables, and exports no table rows. Verify both URLs locally before running; never point the target at production. This command has been used to initialize the current staging database.
- The local API was started against staging on port 3001. Its existing bootstrap inserted hard-coded demo accounts and sample exercises into staging; this is acceptable only for the isolated staging database, and those demo credentials must never be reused in production.
- The exercise-note web flow was smoke-tested against staging using a temporary coach-assigned workout: the authenticated coach added a coach entry, the trainee appended a separate entry, and the API returned both entries in order. The temporary workout was deleted afterward. This validates the current staging API/schema path, not production deployment behavior.
- The live schema shows trainee subscription fields on `coach_trainee` (`subscription_status`, `subscription_start_date`, `subscription_end_date`) and a `coach_payments` ledger with coach, trainee, amount and start/end dates. Coach platform subscription fields are on `users`. Use the live schema as an important reference, but verify constraints, data semantics, and deployed code paths before modifying access or billing behavior; this inventory checked columns, not row contents or all foreign-key constraints.
- Importing `db.js` has database initialization side effects (table creation and seed/bootstrap behavior). Do not run ad hoc scripts against a production database without first confirming exactly what they execute and arranging a backup.
- SQL migration files live in `migrations/`; there are also root-level `run-migration*.js`, initialization, repair, and backup scripts. Migration numbering is not fully unique, and no migration tracking framework is apparent. Establish which schema and migrations are authoritative before schema changes.
- Local database defaults are embedded in the connection configuration. Keep credentials out of documentation, logs, commits, and chat; use environment configuration and verify local secrets handling before setup.

### Exercise catalog dataset (hasaneyldrm/exercises-dataset)

The shared `exercise_library` table now mixes the original coach rows (`source = 'catalog'`, Spanish names) with imported dataset rows (`source = 'dataset'`). Migration `migrations/009_exercise_dataset.sql` adds the muscle taxonomy, Spanish instructions and media file columns; it is additive and idempotent.

- `node run-migration-009.js` applies the migration to `DATABASE_URL` after snapshotting the table into `exercise_library_backup_20261106`. `--production` targets `PRODUCTION_DATABASE_URL` and additionally requires `CONFIRM_PROD_MIGRATION=YES`.
- `node scripts/exercise-dataset/import.js --dry-run` builds the match plan and writes `frontend/data/DATASET_MATCH_REVIEW.md`; `--verify` replays the plan inside a transaction and rolls it back; `--apply` writes the enrichments (UPDATE) and the new dataset rows (INSERT with `source = 'dataset'`).
- `scripts/exercise-dataset/match-overrides.json` (`{ "exclude": ["0454"], "include": { "CURL ARAÑA": "0454", "CAMINADORA": "3666", "ESCALADORA": "2311" } }`) lets us veto or force a match without touching the matcher in `scripts/exercise-dataset/lib.js`. The matcher is deliberately conservative: it requires the movement and the equipment the Spanish name asks for, rejects unsolicited variations (`reverse`, `deficit`, `one arm`…) and then prefers the plainest dataset name.
- `node run-migration-010.js` applies `migrations/010_caminadora_escaladora.sql`, the cardio label repair: the matcher used to send `CAMINADORA` to dataset 2311 ("walking on stepmill"), so the treadmill showed a stair-climber GIF and `ESCALADORA` did not exist. The migration creates `ESCALADORA` from 2311 and re-points `CAMINADORA` at dataset 3666 ("walking on incline treadmill"). It only touches those two rows and is idempotent.
- The movement rules now separate the two machines (`caminadora|trotadora|cinta de correr → treadmill`, `escaladora|escalador|escalones|stepmill → stepmill`) and the import still skips a dataset record that a catalog row already owns by `dataset_id`, so re-running `--apply` will not add English duplicates of them.
- `node scripts/exercise-dataset/sync-media.js` verifies the dataset media and writes `manifest.json` + `README.md` into the separate media repository; add `--copy` to copy the GIFs (≈123 MB) and thumbnails (≈9 MB).
- The API serves media through `EXERCISE_MEDIA_BASE` (server) and `NEXT_PUBLIC_EXERCISE_MEDIA_BASE` (web fallback). Both default to the public media repository through jsDelivr, pinned to commit `d3e64b9f1e1dab64150e81b845f0e30e88dd719a`: `https://cdn.jsdelivr.net/gh/vcmxs/Dupla-exercises-media@d3e64b9f1e1dab64150e81b845f0e30e88dd719a`. The environment variables only override that default (for example after publishing a new media commit), so an unset variable no longer yields `gif_url: null`. `raw.githubusercontent.com/vcmxs/Dupla-exercises-media/<sha>/<path>` is the equivalent hot-link fallback.
- For local work the API can also serve the dataset folders straight from disk: set `EXERCISE_DATASET_DIR` (e.g. `C:/Users/admin/Documents/GitHub/exercises-dataset-main`) and `EXERCISE_MEDIA_BASE=http://localhost:3001/media`. `server.js` mounts `<dir>/videos` as `/media/gif` and `<dir>/images` as `/media/thumb` before the rate limiter, so `gif_url`/`thumb_url` resolve locally without any upload.
- The web app keeps the GIF for the exercise dialog and uses the lighter JPG still for the card thumbnails and the picker lists (`ExerciseReferenceButton` `thumb`/`compact` variants and the shared `ExerciseThumb` component). Each `ExerciseReferenceButton` loads its `/exercises/lookup` record on mount (cached per name), so the card already shows the dataset still before the dialog is opened.
- The dialog does not embed YouTube any more: the media panel plays the dataset GIF (square 240 px frame) and the `YouTube` chip opens the reference video in a new tab. Exercises with neither GIF nor still show the "no reference image" message plus a YouTube search link.
- `GET /api/v1/exercises` returns a light list with real server-side search (`?search=`, accent-insensitive AND tokens), optional `?category=`, `?source=`, `?limit=`, `?offset=`; `GET /api/v1/exercises/lookup?name=` returns the full record for the exercise dialog.

### Production rollout (2026-11-09)

The exercise-dataset work was promoted to production: Railway API
(`https://api-mvp-production.up.railway.app`), web on Vercel (`https://duplagym.vercel.app`),
database `mainline.proxy.rlwy.net:56505/railway`. **Order matters:** the deployed
`GET /api/v1/exercises` selects `dataset_id`, `gif_file` and `thumb_file`, so pushing the
code before migrating makes that endpoint return 500 for both the web and the mobile app.

1. `CONFIRM_PROD_MIGRATION=YES node run-migration-009.js --production` — adds the 15 dataset
   columns, backfills `name_norm` and snapshots the table into `exercise_library_backup_20261106`
   (164 rows).
2. `DATABASE_URL=<production> node scripts/exercise-dataset/import.js --apply` — 78 catalog rows
   enriched in place and 1238 dataset rows inserted; production went from 164 to 1403 rows.
   The same dry run first (`--dry-run`) shows the identical enrichment/conflict buckets as staging.
3. `CONFIRM_PROD_MIGRATION=YES node run-migration-010.js --production` — `CAMINADORA` (id 142) →
   dataset 3666, `ESCALADORA` created as id 1417 from dataset 2311.
4. Media: `node scripts/exercise-dataset/sync-media.js --copy` writes `gif/`, `thumb/`,
   `manifest.json` and `README.md` into `C:\Users\admin\Documents\GitHub\Dupla-exercises-media`
   (1324 GIFs + 1324 thumbnails, 131 MB), published as the public repo
   `https://github.com/vcmxs/Dupla-exercises-media` (commit
   `d3e64b9f1e1dab64150e81b845f0e30e88dd719a`). The single 131 MB pack was rejected by GitHub
   ("remote end hung up"), so the history is eleven ~250-file commits pushed one by one; the final
   commit holds the complete tree. Both CDNs were verified against that SHA:
   `https://cdn.jsdelivr.net/gh/vcmxs/Dupla-exercises-media@d3e64b9f1e1dab64150e81b845f0e30e88dd719a/gif/0001-2gPfomN.gif`
   (206 `image/gif`) and `https://raw.githubusercontent.com/vcmxs/Dupla-exercises-media/d3e64b9/gif/0001-2gPfomN.gif`.
5. `EXERCISE_MEDIA_BASE` is what turns the stored `gif_file`/`thumb_file` into the absolute
   `gif_url`/`thumb_url` that both the web dialog and the picker consume. `server.js` and
   `frontend/lib/exercise-media.ts` now default to the pinned jsDelivr URL above, so media works
   even before the environment variable is set; set it (Railway) and
   `NEXT_PUBLIC_EXERCISE_MEDIA_BASE` (Vercel, fallback only) whenever the CDN or the commit changes.
6. Push to `main`; Railway and Vercel redeploy automatically.

Verified live on 2026-11-09 after the push of `e1a721f`:

- `GET /api/v1/exercises/lookup?name=caminadora` → `200`, dataset `3666`, `gif_url`
  `…@d3e64b9…/gif/3666-rjiM4L3.gif` and `thumb_url` `…/thumb/3666-rjiM4L3.jpg`; both URLs answer
  `206` (`image/gif`, `image/jpeg`) through jsDelivr.
- `GET /api/v1/exercises/lookup?name=ESCALADORA` → dataset `2311` (the stair-climber record).
- `GET /api/v1/exercises?source=dataset&limit=5` → 5 rows, all with `gif_url`;
  `?search=curl barra` → `CURL DE BÍCEPS CON BARRA Z`; `/api/v1/exercises/categories` → 19 buckets.
- The Vercel bundle for `/dashboard` carries `NEXT_PUBLIC_EXERCISE_MEDIA_BASE || "…Dupla-exercises-media@d3e64b9…"`,
  so the deployed web build includes the media changes.
- Media coverage of the live table: 165 catalog rows (79 with a GIF — the 78 enriched matches plus
  `ESCALADORA`) and 1238 dataset rows (all with a GIF), 1403 in total. The remaining catalog rows keep
  the YouTube reference fallback.


Rollback: inside the database
`DELETE FROM exercise_library; INSERT INTO exercise_library SELECT * FROM exercise_library_backup_20261106;`
restores the original 164 rows; an extra off-database JSON snapshot of those rows is kept in the
git-ignored `backups/` folder.


## Web app (`frontend/`)

- Next.js App Router with TypeScript and React. The exact versions are declared in `frontend/package.json`; styling/UI uses Tailwind CSS and Radix/shadcn-style components.
- `frontend/app/` contains public/auth pages, dashboard, admin, and policy/account pages. Dashboard UI components live under `frontend/components/`.
- `frontend/lib/api.ts` defines the API URL and `apiFetch()` helper. Web auth currently stores the JWT and user object in browser `localStorage` (`userToken` and `userInfo`) and attaches the bearer token to API requests.
- For local web testing, `frontend/.env.local` should set `NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1`, so the frontend talks to the local API rather than its production default. This file is git-ignored; restart `next dev` after changing it.
- Product areas visible in the dashboard include coach and trainee experiences, trainee management, workouts/set logging, programs and plans, nutrition, progression/insights, messaging, referrals, notifications, settings, and coach revenue/finance. The `/admin` area includes user/subscription management, finance, referrals, and audit information.
- `frontend/lib/i18n.tsx` and `frontend/locales/` contain English/Spanish localization.

Useful starting points: `frontend/app/layout.tsx`, `frontend/app/dashboard/`, `frontend/app/admin/`, `frontend/components/dashboard/`, `frontend/components/admin/`, and `frontend/lib/api.ts`.

### Local staging workflow

1. Keep the API root `.env` `DATABASE_URL` pointed at the isolated Railway staging DB. `PRODUCTION_DATABASE_URL` is only used as the source for the guarded schema-only copy command.
2. Start the API from the repository root with `npm run dev`. The existing DB bootstrap runs at startup and seeds sample exercise data/demo users into the configured database; never use it while `DATABASE_URL` targets production.
3. Auth routes import the Resend email SDK, which currently requires `RESEND_API_KEY` just to start the API. For local work that does not need email, provide a temporary placeholder only in the API process environment; verification/reset emails will not send. Do not put placeholders or production mail keys into source-controlled files.
4. Start the frontend from `frontend/` with `npm run dev`; open `http://localhost:3000`. The local API is configured on port 3001. Stop either process with Ctrl+C in its terminal when finished.
5. Before testing registration or email flows, decide whether to configure a safe test mail provider/key or implement a development-only mail mock. Avoid sending test messages to real customers.

For new web additions that may need a mobile counterpart, record the work and mobile decision in [WEB_TO_MOBILE.md](WEB_TO_MOBILE.md). Add entries as features are implemented; the initial ledger intentionally does not compare the existing apps.

## Mobile app (`../Dupla-mobile`)

- Expo / React Native JavaScript application using React Navigation, TanStack React Query, Axios, Socket.IO client, Expo notifications, and SecureStore. Dependencies and scripts are listed in the mobile repository's `package.json`.
- `App.js` is the navigation and provider entry point. It selects auth, admin, coach, or trainee navigation based on the current session/profile. Mobile role routing is user-interface behavior; the server must independently authorize protected data and operations.
- `src/context/AuthContext.js` manages login, Google login, secure token/profile storage, startup profile refresh, and push-token registration/removal.
- `src/config/api.js` selects the API base URL. `src/config/queryClient.js` persists the React Query cache to AsyncStorage. `src/utils/offlineSync.js` stores queued mutations in AsyncStorage, and `src/hooks/useOfflineSync.js` handles synchronization.
- Coach screens cover trainee management, workout creation/assignment, plans/programs, revenue, and insights. Trainee screens cover assigned workouts, exercise logging, progression, nutrition, and profile. Shared areas include notifications, social/chat, referrals, and programs. Admin screens include dashboard, user details, and payouts.
- `app.json` contains the Expo app identity, Android package/version code, permissions, deep link, and build configuration. `eas.json` contains EAS build profiles. Verify release values against the actual Play Store listing and the server's app-version configuration before publishing.

The mobile repo has its own `README.md`; it contains a roadmap and a mixture of completed/planned notes, so verify implementation in source before treating a checklist item as current behavior.

## Cross-platform behavior to trace when making changes

1. Find the API route in `routes/`, then its middleware and controller. Check how it identifies the caller and resource owner, and how the response is shaped.
2. Find each client call site. The web API helper is `frontend/lib/api.ts`; mobile API calls are often direct Axios calls rather than one shared authenticated client.
3. For trainee training access, verify both the client lock/empty state and the server-side authorization/data query. Check old and new assigned training, not only dashboard presentation.
4. For coach subscriptions, trace admin changes, API checks, cron expiry behavior, and client status/limits together.
5. For realtime or push changes, inspect both the server event/route and client registration/listener behavior. Source code alone does not confirm the deployed Railway service or push-provider setup.
6. For mobile persistence changes, consider SecureStore, the persisted React Query cache, the offline mutation queue, logout, and switching between accounts on one device.

## Review checklist (verification items, not incident claims)

These are areas to verify during maintenance; their inclusion does **not** mean an incident has occurred.

- **API authorization and ownership:** check authentication and per-resource ownership for every sensitive route, especially where IDs arrive in URL parameters or request bodies. Client role checks do not replace server checks.
- **Credentials and authentication:** review password storage/comparison and error logging, JWT-secret configuration, and local secret handling. Avoid printing tokens, passwords, signing keys, or environment files.
- **Subscription enforcement:** define and test the single expected behavior for coach plan expiry versus trainee payment expiry, including access to existing routines, direct API access, UI state, and renewals.
- **Database safety:** verify the intended schema/bootstrap and migration order; review scripts before running them, especially against production. Confirm backup/restore procedures.
- **Mobile account isolation/offline sync:** verify persisted query data and queued mutations cannot leak or replay under a different account; confirm logout/account switching clears or safely partitions the relevant data and credentials.
- **Android release signing:** check whether signing files/credentials are tracked or exposed, and confirm the controlled recovery/rotation plan if they were shared. Do not copy their contents into this guide.
- **Push, sockets, and deployment configuration:** verify deployed route availability, origin policy, user-room authorization, token registration/removal, and actual notification delivery. Compare checked-in configuration with Railway, Expo/EAS, and Play Store settings.
- **Versioning and account deletion:** confirm the app-version check matches the released app and test the account-deletion flow end to end against the applicable store requirements and retention rules.
- **Documentation and tests:** add/maintain reproducible setup and verification instructions. The current backend package has no automated test script, so identify a safe test strategy before changing critical auth, billing, or access behavior.

## Known unknowns to confirm as we work

- Which setup/bootstrap and migration procedure is the current supported one, and which root scripts are still used?
- Is `server-new.js` obsolete, or does any environment still use it?
- Which API routes/contracts are relied on by the released clients, particularly trainee access, payments, chat, shared workout sessions, deletion, and push notifications?
- What is the intended policy for mobile offline work during logout, account switching, subscription expiry, or a failed sync?
- Are the version currently declared in mobile source and the backend's minimum/latest-version settings aligned with the Play Store release?

When a future task involves production data or publishing a build, confirm the relevant deployment, backup, credentials, and release process first. This guide is an orientation document, not a deployment runbook or authorization to change production.