# Dupla Web App — Development Changelog

> Tracks all development sessions and changes made to the `Api-MVP` frontend project.

---

## Session 5 — 2026-04-22

### Admin Dashboard Migration
- **Removed AdminDashboard** from the legacy mobile React app (`gym-training-fronten`)
  - Deleted `AdminDashboard.js` component file
  - Replaced admin route in `App.js` with a redirect message telling admin users to use the Web Platform
- **Planned Web Admin Dashboard** implementation with:
  - User Management (full list, block/unblock, delete, subscription override)
  - Financial Statistics (MRR, ARR, revenue by tier, churn rate, net profit)
  - Referral / Commission Payout Management
  - Usage & Engagement Metrics (DAU/MAU, global workout activity)
  - Advanced controls (impersonate user, audit logs, global announcements)
- **Architecture Decision:** Admin Dashboard will live in the Next.js web app at `/admin` route, kept separate from Coach/Trainee dashboards via RBAC

### Bug Fix — Workout Set Logging Flicker
- **Root cause:** Logging a set called `fetchDetail()` which triggered the `loading = true` state, causing the entire exercise list to temporarily disappear and scroll position to reset
- **Fix:** Added a `silent: boolean = false` parameter to `fetchDetail()` in `WorkoutDetailSheet`
  - Initial sheet open → normal loading spinner
  - Set log/uncheck → silent background refresh (no loading state change)
- **File changed:** `frontend/components/dashboard/workouts-view.tsx`

### Logo Update
- Replaced v0 auto-generated logo/favicon with Dupla brand assets
- Copied `favicon.ico`, `apple-touch-icon.png`, `logo192.png`, `logo512.png` from `gym-training-fronten/public` into `frontend/public`
- Updated `frontend/app/layout.tsx`:
  - Removed `generator: 'v0.app'` metadata field
  - Updated `icons` to point to `/favicon.ico` and `/apple-touch-icon.png`
  - Removed old `icon.svg`, `icon-light-32x32.png`, `icon-dark-32x32.png`, `apple-icon.png`

---

## Session 4 — 2026-04-21

### Login Page — Username Support
- Copied `login/page.tsx` from the Dupla web app into `frontend/app/login/`
- Allowed users to log in with **username** in addition to email on the web app

---

## Session 3 — 2026-04-20 to 2026-04-21

### Trainee Dashboard Migration
- Migrated Trainee Dashboard components into the Next.js monorepo
- Implemented **role-based navigation** in the sidebar:
  - Trainee nav: Overview, Workouts, Messages, Nutrition, Progression, Notifications
  - Coach nav: full set including Trainees, Programs, Insights, Revenue, Win-Win
- Implemented **subscription expiration locking logic** for trainees:
  - Locked workout cards shown with blur overlay and lock icon if subscription expired
  - Coach trainee list correctly displays expired subscription statuses
- Resolved **TypeScript errors** in `trainee-overview.tsx` and `workouts-view.tsx`
- Fixed **Vercel Analytics** environment configuration (only loads when `VERCEL === '1'`)
- Debugged **nutrition log food search** functionality

---

## Session 2 — 2026-04-19 to 2026-04-20

### Application Migration & Repository Setup
- Migrated application to `vcmxs/Api-MVP` repository
- Configured remote Git origin and pushed all local commits
- Migrated and restored legacy auth pages:
  - Landing Page
  - Login Page
  - Registration Page
- Fixed import issues related to the `api` utility module
- Ensured full **internationalization (i18n)** support on auth pages
- Stabilized production-ready build

---

## Session 1 — 2026-04-19

### Initial Repository Push
- Established the `Api-MVP` GitHub repository
- Pushed initial Next.js monorepo codebase
- Set up project structure:
  - `frontend/` — Next.js 14 app (Coach + Trainee dashboards)
  - `gym-training-fronten/` — Legacy React app (mobile-first)
  - Backend API routes in `routes/`, `controllers/`, `models/`

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + Vanilla CSS |
| UI Components | shadcn/ui + Lucide Icons |
| Auth | JWT tokens via `apiFetch` utility |
| Analytics | Vercel Analytics (conditional) |
| Charts | Recharts (planned for Admin Dashboard) |
| Language | TypeScript |
| Legacy Mobile App | React (Create React App) |
| Backend | Node.js + Express |
| Database | MySQL |

---

## Pending / Next Steps

- [ ] Build Admin Dashboard at `/admin` route in the Next.js web app
  - [x] Overview stats (total users, coaches, trainees, subscriptions)
  - [ ] User management table (view, block/unblock, delete, change plan)
  - [ ] Financial charts (MRR, revenue by tier, churn)
  - [ ] Referral & commission payout management
  - [ ] Audit logs
- [x] Install `recharts` for data visualization in Admin and Insights views
- [x] Protect `/admin` route with server-side role guard (admin only)
