# Changelog

One entry per milestone, in the order built. Each entry covers what shipped and the
architecture-relevant decisions specific to that milestone — the "why," not a line-by-line diff
(git history is the diff; this is the narrative). Started at Milestone 6; earlier entries are
reconstructed from the codebase where the historical detail is unambiguous, and kept brief where
it isn't.

## Milestone 7 — Daily Planner & Time Blocking (2026-07-03)

Production-ready Daily Planner: backend `PlannerDay`/`PlannerBlock` module (8 endpoints, including
a deterministic — no AI — schedule generator) and a full frontend feature (Planner Dashboard, Day
View with a drag-to-move/resize timeline and an Agenda list view, Week View; a Block Dialog with
Task/Habit pickers; Focus Timer, Conflict Warning, Break Indicator, Current Time Indicator). The
main Dashboard's Focus Time placeholder is now real, and it gained a Today's Timeline widget plus
Next Activity/Remaining Time/Completed Blocks stat cards, all computed from one `GET
/planner/today` call.

Key decisions:
- **Split into `PlannerDay` (a thin per-date container) + `PlannerBlock`**, rather than one flat
  table or reusing `docs/06-database-design.md`'s `ScheduleBlock` — every endpoint operates "for
  this user, on this date" first and block-by-block second, and `PlannerDay.notes` belongs to the
  day, not any one block. `ScheduleBlock` itself was never implemented, so there's no migration
  concern in choosing this shape over that one.
- **`duration` is always derived from `startTime`/`endTime` server-side**, never trusted from the
  client, per `docs/05-architecture.md`'s "derived values should be calculated whenever
  practical" rule — the same principle Habit/Routine already apply to their own computed fields.
- **Generate is idempotent, not additive**: TASK/ROUTINE/HABIT-type blocks are deleted and rebuilt
  from current Task/Routine/Habit state on every call; FOCUS/BREAK/CUSTOM blocks are always
  user-authored and are never touched by generation. This reuses the `type` column already on the
  schema rather than adding a separate `isGenerated` flag.
- **Completing a block never writes back to the Task/Habit it references** — an explicit business
  rule from the milestone brief ("Planner should never modify Tasks or Habits automatically"), not
  an oversight. Verified directly: `PlannerService.spec.ts`'s complete() test asserts
  `TasksService.update`/`HabitsService.createLog` are never called.
- **Per-user-timezone date/time handling, for the first time in this codebase.** Habit/Routine
  predate this entirely (see their own schema comments); Planner is the first module where "what
  day is it" and "what UTC instant is 9am" have to be computed from `User.timezone` rather than
  server-local time — done via `Intl.DateTimeFormat`, not a new date-library dependency (see
  `docs/05-architecture.md`'s timezone note). Property-style tests cover both DST transitions in
  2026 (America/New_York's March 8 spring-forward and November 1 fall-back).
- **Overlap handling is split by source**: the generator actively avoids overlapping its own
  output (routine steps keep fixed anchor times; tasks/habits greedily fill free gaps, respecting
  a configurable buffer), but manually-created/edited blocks are allowed to overlap — the backend
  doesn't reject it. A pure `detectConflicts` client-side utility (covered by its own unit tests)
  flags overlaps for the Conflict Warning banner and a highlighted outline in the Timeline, rather
  than the backend hard-blocking a state a real calendar app has to tolerate.
- **Drag-and-drop scope**: the Timeline supports free-position drag-to-move (vertical, 5-minute
  snapped, via Angular CDK) and edge-handle resize (native Pointer Events — CDK has no resize
  primitive). A separate Agenda list view reuses the exact CDK list-reorder pattern
  `RoutineEditorPage` already established, and is what actually exercises `POST /planner/reorder`
  — the Timeline positions blocks by time and has no use for a manual order index.
- **`TasksModule`/`RoutinesModule`/`HabitsModule` now export their services** so `PlannerService`
  can reuse them for the generator (today's due tasks, active routine steps, not-yet-completed
  habits) instead of querying their tables directly — see `docs/05-architecture.md`'s "reuse
  services" rule. A new `PlannerBlockActionsService` on the frontend centralizes the
  dialog/confirm/store/snackbar orchestration shared by the Planner Dashboard and Day View pages,
  for the same reason.
- **Verification**: in addition to 174 backend and 161 frontend unit tests (all passing), the
  running backend was exercised directly against a live Postgres database with 15 curl-driven
  checks covering block CRUD, generate's fixed-block preservation, reorder validation, and
  cross-user 404-not-403 security — see the Verification section of the milestone report for the
  full list. Full in-browser UI verification wasn't possible in this environment (the sandboxed
  macOS host blocks Playwright's downloaded Chromium via Gatekeeper); the build, lint, and full
  test suites all pass, and manual verification steps were handed off.

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
