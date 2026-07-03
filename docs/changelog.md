# Changelog

One entry per milestone, in the order built. Each entry covers what shipped and the
architecture-relevant decisions specific to that milestone — the "why," not a line-by-line diff
(git history is the diff; this is the narrative). Started at Milestone 6; earlier entries are
reconstructed from the codebase where the historical detail is unambiguous, and kept brief where
it isn't.

## Milestone 6 — Habit Tracker (2026-07-03)

Production-ready habit tracking: backend `Habit`/`HabitLog` module (11 endpoints, including
`today`/`summary`/`history` views beyond plain CRUD) and a full frontend feature (List/Detail/
Today/History pages; Create/Edit/Log dialogs; six new reusable components including a progress
ring and a GitHub-style calendar heatmap). Dashboard gained three live habit stat cards and a
Quick Complete panel.

Key decisions:
- `targetFrequency`(DAILY/WEEKLY/MONTHLY)/`targetCount` replaces the original database design's
  `isQuantifiable`/`unit` pair — one mechanism covers both boolean and quantifiable habits.
- No completion/streak columns — `completionPercent`/`currentPeriodCount`/`todayCount`/
  `completedToday` are computed from `HabitLog` on every read, same "derived, not stored"
  principle the database design already applies to `Streak`. Actual streak tracking is explicitly
  deferred to Milestone 7.
- `HabitLog` mutations identify the target row by date (defaulting to today) rather than by log
  ID — a habit has at most one log per date (DB-enforced), so the frontend never needs to track
  log IDs just to log "today."
- Found and fixed a real timezone bug during test-writing: `Date.toISOString().slice(0, 10)`
  converts to UTC first, silently shifting the calendar date backward by one for any positive UTC
  offset. Replaced with a local-calendar-date formatter (`toLocalDateString`) used consistently
  across the heatmap, history-range queries, and the log dialog.
- See `docs/06-database-design.md`'s note on Habit and `docs/07-folder-structure.md`'s notes on
  `modules/habits/`/`features/habits/` for full rationale.

## Milestone 5 — Routine Engine (2026-07-02)

Reusable Routine Engine: `Routine`/`RoutineStep` backend module (12 endpoints, including nested
step CRUD/reorder/duplicate) and a frontend feature with drag-and-drop step ordering (Angular
CDK). Dashboard gained a Current/Next routine + time-elapsed completion % panel.

Key decisions:
- Modeled as first-class relational tables instead of the original database design's
  `ScheduleTemplate.blocksJson` — better suited to per-step CRUD/reordering than editing inside a
  JSON blob.
- `RoutineStep.startTime` is a plain `"HH:mm"` string, not a `DateTime` — a routine has no
  calendar date of its own.
- Hard delete (unlike Task) — a routine is recreatable structural configuration, not the
  irreplaceable content the soft-delete principle protects.
- No completion-tracking table — the dashboard's completion % is time-elapsed progress through
  today's steps, computed client-side, not persisted per-day state.

## Milestone 4 — Task Management (2026-07-02)

Production-ready task management: `Task` backend module (6 endpoints, soft delete, pagination/
filter/sort) and a frontend feature (List/Detail pages, Create/Edit dialog, search/filter/sort/
pagination, priority/status badges, due-date indicators). Dashboard gained three live task stat
cards (Today's/Upcoming/Completed Today), computed via `GET /tasks`'s existing date-range filters
rather than a dedicated summary endpoint.

Key decisions:
- Field set follows the milestone brief's simplified shape (`LOW/MEDIUM/HIGH/CRITICAL` priority,
  `TODO/IN_PROGRESS/COMPLETED/CANCELLED` status, flat `tags: string[]`) rather than the original
  database design's fuller shape (`parentTaskId`, relational `Tag`, `recurrenceRule`) — those are
  deferred, not built unused.
- Soft delete, per the database design's principle naming Task explicitly.
- Established the ownership pattern every later user-owned resource reuses: every service method
  takes `userId`, scopes its query with it, and returns 404 (not 403) for another user's resource.

## Milestone 3 — App Shell & Navigation

Authenticated app shell: sidenav, breadcrumbs, dashboard placeholder, and route structure with
per-section lazy loading. Established the placeholder-route pattern later milestones replace one
feature at a time (`shared/components/feature-placeholder/`).

## Milestone 2 — Authentication

Email/password auth: JWT access tokens (short-lived) + rotating refresh tokens (hashed at rest,
delivered via httpOnly cookie), registration, login, refresh, logout, and the `JwtAuthGuard` /
`@CurrentUser()` pattern every later authenticated module reuses.

## Milestone 1 — Foundation

Monorepo scaffold (`apps/frontend`, `apps/backend`, `packages/shared-types`), Prisma/PostgreSQL
setup, and base CI.
