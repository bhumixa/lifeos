# Changelog

One entry per milestone, in the order built. Each entry covers what shipped and the
architecture-relevant decisions specific to that milestone — the "why," not a line-by-line diff
(git history is the diff; this is the narrative). Started at Milestone 6; earlier entries are
reconstructed from the codebase where the historical detail is unambiguous, and kept brief where
it isn't.

## Milestone 10 — Journal, Reflection & Life Timeline (2026-07-04)

Production-ready Journal system: backend `modules/journal` (10 endpoints — list/history/search/
prompts/getByDate, create/update/soft-delete, attachment create/delete) and a full frontend
feature (Journal Dashboard, Morning Journal, Evening Journal, Journal Detail, Journal History,
Search Journals; 12 components including a mood selector, energy meter, hand-rolled markdown-lite
rich text editor, and a hand-rolled month calendar). The Dashboard's remaining placeholder-free
gap (Journal) is now real with six widgets, and Goal Detail/Planner Dashboard each gained a small
Journal integration point.

Key decisions:
- **`JournalEntry` is a single wide table covering all three `JournalType`s (MORNING/EVENING/
  FREEFORM)**, not per-type tables or a JSON blob — `mood`/`energy`/`tags`/`goalId` need direct
  indexing/filtering for `GET /journal/search`, which a per-type-table or JSON design would turn
  into a `UNION` or per-query JSON-path expression instead of a plain `WHERE` clause. Every
  type-specific column (Morning's `intention`/`topPriorities`/`affirmation`/`visualization`/
  `expectedChallenges`; Evening's `wentWell`/`wentWrong`/`plannerReflection`/`habitReflection`/
  `goalReflection`) is simply left null by whichever type doesn't use it — see the class doc on
  `JournalEntry` in `prisma/schema.prisma`.
- **One Morning/Evening journal per day, unlimited Freeform, is a service-layer rule (a `findFirst`
  check + 409), not a database constraint.** The rule is conditional on `type`, which Postgres can
  only express as a *partial* unique index — a feature Prisma's schema DSL has no declarative
  syntax for without hand-written migration SQL, which this project's "never edit generated
  migration files" rule weighs against. This is a documented, accepted limitation (a concurrent
  double-submit could in principle race past the check), the same "known, documented trade-off"
  spirit as Milestone 8/9's own accepted gaps.
- **`goalId`/`plannerDayId` are optional, one-directional links**, following exactly the pattern
  Task/Habit/Routine/PlannerBlock already established for `goalId` in Milestone 9 —
  `assertGoalOwnership`/`assertPlannerDayOwnership` are raw Prisma existence checks inside
  `JournalService`, not injected services. Journal gains **no new `GoalTargetType`**: a Goal's
  "related journal entries" (shown on Goal Detail) is a plain `GET /journal/search?goalId=` query,
  not a progress input — the milestone brief never asked Journal to count toward a Goal's automatic
  progress.
- **`JournalModule` imports no sibling module — the first fan-in-adjacent module to compose
  entirely on the frontend instead.** Every prior module that read across boundaries (Planner,
  Streaks, Goals) did so via backend service injection; Journal's Habits/Streaks/Planner
  integration (Evening Journal's habit-completion-summary and current-streak panels, Planner
  Dashboard's "open today's journal" link) is composed on the frontend by calling those features'
  own already-exported API services directly, the same "one/two endpoint(s), several derived
  widgets, no new backend endpoint" shape the Dashboard's own `DashboardGoalsService` already
  establishes — just applied to feature pages instead of only the main Dashboard. This works
  because every Journal integration is a *read*, never a *write* crossing a module boundary (unlike
  Goals' `goalId` reverse-links, which are real FKs another module writes) — see
  `docs/05-architecture.md`'s Milestone 10 note for the full rationale.
- **The reflection-prompt catalog (`JournalPrompt`) is upserted from one TypeScript array
  (`journal-prompt-definitions.ts`) at boot**, the exact pattern `AchievementsService.onModuleInit`
  already established for the achievement catalog — 16 prompts across the three types, each with a
  stable `code` (one field beyond the milestone's own literal `JournalPrompt` field list, added for
  the same "stable upsert key" reason `Achievement.code` exists).
- **`JournalService` is exported despite having no current importer** — a deliberate seam for a
  future AI Coach module (this milestone's own "build with future AI in mind, don't implement it"
  instruction) to read a user's journal history as coaching context, matching how Tasks/Routines/
  Habits/Planner already exported their services ahead of Streaks/Goals actually needing them.
- **No field-level encryption for `content`/`mood`** — a real, honestly-documented deviation from
  `docs/06-database-design.md`'s own design principle naming those two `JournalEntry` fields for
  encryption at rest. The milestone brief's own Database/Business Rules sections don't ask for
  `pgcrypto` or application-level AES-GCM, and introducing either (key management, a migration
  story for already-written plaintext rows) is a real architectural decision beyond "Only build the
  Journal system" — flagged as a gap to close in a dedicated encryption milestone before this
  feature holds real user data, not silently bundled into this one.
- **`POST /journal/attachments` registers metadata for an already-hosted file, not a binary
  upload** — no object-storage provider (S3, Cloudinary, even local-disk multer) exists anywhere
  else in this codebase, and adding one is exactly the kind of dependency-without-justification
  CLAUDE.md's "Things to Avoid" weighs against for this milestone. The frontend component list
  reflects this: no dedicated "Attachment" upload component was built, matching the milestone's own
  literal component list, which doesn't include one either.
- **Journal Detail is addressed by `:date/:id`, not a plain `:id`** — `GET /journal/:date` already
  returns the whole day's entries (mirroring `PlannerDayResponseDto`'s own "whole day" shape), so
  the frontend finds the requested entry within that response rather than needing a dedicated
  by-id backend endpoint. The one place this doesn't fully reach is Journal History's calendar
  view, which has no dedicated "day view" page to link to (only 6 pages were in scope) — clicking a
  calendar date jumps straight to that day's first entry instead.
- **`features/journal/utils/journal-form.ts` factors the seven fields every `JournalType` shares**
  (title/content/mood/energy/tags/weather/location/goalId) into one `commonEntryControls(fb)`
  helper, so Morning/Evening/Journal Detail's own reactive forms each add only their type-specific
  fields on top rather than repeating those seven three times.
- **`RichTextEditor` is a hand-rolled markdown-lite textarea** (a toolbar wraps the selection in
  `**bold**`/`*italic*` or inserts a `- ` list item; a Preview toggle renders that subset back as
  HTML) — no third-party rich-text dependency exists anywhere in this codebase. The preview
  HTML-escapes the raw text before applying markdown replacements, and Angular's own `[innerHTML]`
  sanitizer is a second layer of defense on top of that, so no user-authored journal content can
  inject markup. `JournalCalendar` is likewise hand-rolled (a month grid with mood-emoji/dot
  markers), matching the "no charting library" convention Goals' own `GoalTimeline` already set.
- **Verification**: 39 new backend unit tests (uniqueness rules for both MORNING and EVENING,
  goal/planner-day linking and ownership validation, search filters, history date-range filtering,
  soft delete, cross-user isolation, attachments, pagination) plus the existing 312 all pass (351
  total); 28 new frontend unit tests (API service, store, display utils) plus a new
  `DashboardJournalService` spec (4 tests) plus the existing 217 all pass (249 total). The running
  backend was exercised directly against a live Postgres database via curl — the full
  Morning/Evening/Freeform uniqueness matrix, search by mood/keyword/tag, history by date range,
  Goal and PlannerDay linking (including 404s for another user's goal/planner day), attachment
  create/delete, update, soft delete (confirmed gone from a subsequent `GET /journal/:date`), and a
  full cross-user isolation check (second user sees zero entries and gets 404 on PATCH/DELETE for
  the first user's data) — and the frontend was driven end-to-end with a headless Chromium session
  (register → Dashboard's Journal stats → Journal Dashboard → Morning Journal create → Evening
  Journal create with a Gratitude chip → Journal Detail edit → Journal History timeline and
  calendar views → Search Journals → back to Dashboard confirming "Both done"), confirming real
  data renders throughout with no genuine console errors (the one observed 401 is the same
  pre-login auth-probe every prior milestone's verification also sees).
- **Remaining work**: field-level encryption for `content`/`mood` (flagged above, not implemented
  this milestone); a dedicated Journal Day-view page (the calendar's date-click currently jumps to
  that day's first entry rather than a full day list, since only 6 pages were in this milestone's
  scope); binary attachment upload (currently metadata-only registration).

## Milestone 9 — Goals & Goal Tracking (2026-07-03)

Production-ready Goal Management System: backend `modules/goals` (11 endpoints — CRUD, archive/
unarchive, progress recompute, milestone CRUD) and a full frontend feature (Goals Dashboard, Goal
Detail, Goal Editor, Goal Milestones; 8 components including a progress ring, a linear timeline,
and a milestone form dialog). Goals is now the highest-level entity in LifeOS: Task, Habit,
Routine, and PlannerBlock each gained an optional `goalId` link, and the Dashboard's last four
placeholder-free slots (Active Goals, Today's Goal Progress, Goal Completion %, Nearest Goal
Deadline) are now real.

Key decisions:
- **`currentValue` is a real, persisted column — unlike Streak's fully-derived-on-read model.**
  The milestone brief lists it as a schema field and explicitly allows manual progress updates for
  CUSTOM goals, so `GET /goals`/`GET /goals/:id` return whatever's currently stored (cheap — no
  source-table scan per goal in a list, keeping "avoid N+1 queries" true even for a large goal
  list), and only `GET /goals/:id/progress` actually walks Task/Habit/Routine/PlannerBlock source
  data for the four automatic target types and writes the refreshed value back. This is a
  deliberate widening of Milestone 8's "derived, not stored" principle, not a reversal of it — see
  the class doc on `Goal` in `prisma/schema.prisma` and on `GoalsService` for the full rationale,
  including the same "known, documented staleness" trade-off Milestone 8 already accepted for
  PlannerBlock-derived XP (a goal's `currentValue` is only as fresh as the last time its own
  `/progress` endpoint ran).
- **Each automatic `targetType` maps 1:1 to one of the milestone's four "contributes
  automatically" sources** (Tasks/Habits/Routine/Planner → `TASK_COUNT`/`HABIT_COMPLETION`/
  `ROUTINE_COMPLETION`/`FOCUS_TIME`), via that source's own new optional `goalId` column —
  `TASK_COUNT` counts completed Tasks linked to the goal, `HABIT_COMPLETION` counts `HabitLog`
  rows for linked Habits, `ROUTINE_COMPLETION` asks Routines for the step ids of linked Routines
  then asks Planner how many of those are completed (the same two-service composition
  `PlannerService` itself already does for generation), and `FOCUS_TIME` sums the duration of the
  goal's own directly-linked completed `PlannerBlock`s. `CUSTOM` has no automatic source at all.
- **`goalId` on Task/Habit/Routine/PlannerBlock is additive only** — a small optional column plus
  an ownership-checked field on each module's existing create/update DTOs, reusing the "reuse
  services, small new exported methods" pattern Streaks (Milestone 8) already established
  (`TasksService.countCompletedByGoal`, `HabitsService.countLogsByGoal`,
  `RoutinesService.getStepIdsByGoal`, `PlannerService.countCompletedBlocksByReferenceIds` /
  `.sumCompletedDurationByGoal`). Goal ownership validation inside those four services is a raw
  Prisma existence check rather than injecting `GoalsService`, since `GoalsModule` already imports
  all four of theirs for progress aggregation and importing back would be circular. Existing
  frontend forms for Task/Habit/Routine/Planner were **not** wired up with a "link to goal" picker
  UI in this milestone — the backend supports it, but only Goals' own pages currently set it; see
  Remaining Work.
- **`GoalMilestone` follows `RoutineStep`'s precedent exactly**: no owner column of its own
  (reached only through its parent Goal, ownership enforced by joining `goal: { userId }`), hard
  delete (disposable, recreatable content, not named in `docs/06-database-design.md`'s soft-delete
  list — unlike `Goal` itself, which *is* named there and stays soft-deleted like Task/Habit), and
  a manual `order` sort key with append-on-create. Milestone completion (`completed`/
  `completedAt`) is deliberately **not** wired into `Goal.currentValue` — the brief's "contribute
  automatically" rules name only Task/Habit/Routine/PlannerBlock completions, so a milestone is a
  user-tracked checkpoint alongside a goal's progress, not another progress input.
- **`PATCH /goals/milestones/:id` and `DELETE /goals/milestones/:id` are not nested under a goal
  id**, per the milestone's own given endpoint list — the controller declares them before the
  generic `PATCH/DELETE /goals/:id` routes (same literal-before-param rule
  `habits.controller.ts`/`routines.controller.ts` already document) so a request to
  `/goals/milestones/abc` is never swallowed by `:id` matching `"milestones"`. Ownership is still
  enforced by joining through the milestone's parent goal, not a URL-embedded goal id.
- **`category` stays a free-text string, not an enum** — the milestone brief's Enums section
  defines `GoalStatus`/`GoalPriority`/`GoalTargetType` but no category enum, so `Goal.category`
  follows `Habit.category`'s own precedent instead of `docs/06-database-design.md`'s original
  `GoalCategory` enum sketch.
- **Frontend "Goal Editor" is a page, not a dialog** — the brief lists it as a page, matching
  `RoutineEditorPage`'s precedent (Milestone 5) rather than Task/Habit's form-dialog pattern.
  "Goal Timeline" has no existing linear-timeline component to reuse (Planner's time-grid is a
  different, hour-by-hour shape), so it's a new small presentational component, hand-rolled
  CSS/SVG like every other visual in this codebase (no charting library). "Progress Ring" wraps
  `HabitProgressRing` the same way Streaks' `ConsistencyRing` already does. "Archive Dialog" is
  **not** a new component — it's the shared `ConfirmDialog`, reused with non-destructive copy, the
  same "don't duplicate an existing shared component" call Milestone 6 made for its own "Habit
  Empty State."
- **Dashboard's four Goal widgets are computed client-side from one `GET /goals` call**
  (`DashboardGoalsService`), the same "derived via local computation" shape
  `DashboardRoutineSummaryService` already establishes — no new backend summary endpoint, per
  `docs/05-architecture.md`'s "avoid creating unnecessary dashboard-specific endpoints" rule.
- **Verification**: 64 new backend unit tests (goal-progress util, `GoalsService`/
  `GoalsController`, plus additive coverage on Tasks/Habits/Routines/Planner for their new
  `goalId` ownership checks and `countCompletedByGoal`/`countLogsByGoal`/`getStepIdsByGoal`/
  `countCompletedBlocksByReferenceIds`/`sumCompletedDurationByGoal` methods) plus the existing 248
  all pass (312 total); 23 new frontend unit tests (API service/store/display-util/dashboard
  service) plus the existing 194 all pass (217 total). The running backend was exercised directly
  against a live Postgres database via curl — goal creation, milestone add/update via the
  non-nested `/goals/milestones/:id` route, linking a Task to a goal and completing it,
  `GET /goals/:id/progress` correctly recomputing `currentValue` (0 → 1 of 3, 33%), archive/
  unarchive, and a cross-user `GET /goals/:id` returning 404 — and the frontend was driven
  end-to-end with a headless Chromium session (register → Dashboard's Goal stats → Goals Dashboard
  → create a goal via the Editor page → Goal Detail → Goal Milestones → add a milestone → back to
  the Goals Dashboard showing the new goal), confirming real data renders throughout with no
  genuine console errors (the one observed 401 is the pre-login auth-probe every other milestone's
  verification also sees, unrelated to Goals).

## Milestone 8 — Streak Engine & Gamification Foundation (2026-07-03)

Production-ready consistency/motivation layer: backend `modules/streaks` (7 endpoints across
Streaks/Achievements/Freeze Days) and a full frontend feature (Streak Dashboard, Achievement
Gallery, nine presentational components). The main Dashboard's last placeholder stat ("Best Habit
Streak") is now real, joined by six more (Longest Streak, XP Earned, Achievements, Weekly/Monthly
Success, Consistency).

Key decisions:
- **No streak values are stored anywhere** — the milestone brief is explicit ("Do NOT store
  streak values permanently. HabitLog remains the source of truth"), and this milestone extends
  that same "derived, not stored" principle (already used for Habit/Routine completion %) to XP
  and every consistency metric too. Everything is recomputed from `HabitLog` (plus `Task`/
  `PlannerBlock` completion counts, for XP) on every `GET` request, bounded by a documented ~13
  month lookback window (`STREAK_LOOKBACK_DAYS`) rather than an unbounded historical scan.
- **`Achievement`/`UserAchievement`/`FreezeDay` are the three tables actually created** — a
  catalog, a per-user unlock record, and a per-user-per-date freeze usage log. The catalog is
  upserted from one TypeScript array (`utils/achievement-definitions.ts`) at boot
  (`AchievementsService.onModuleInit`) rather than via a separate `prisma db seed` script, so
  there's one source of truth for the achievement list instead of two that could drift.
- **Achievement unlocking is evaluated on read, not via a live domain event.**
  `docs/05-architecture.md` had flagged "Streaks reacting to HabitLog changes" as the likely first
  use of `EventEmitter2` — but wiring that up would mean modifying Habits/Tasks/Planner to emit
  completion events, which this milestone's "do not modify existing functionality unless
  absolutely necessary" instruction weighs against for a foundation milestone. Instead,
  `AchievementsService.evaluateAndUnlock` runs as a side effect of `GET /streaks/statistics` — the
  one endpoint that already computes every input every achievement condition needs — and persists
  a `UserAchievement` row the first time a condition is caught true. `EventEmitter2` remains
  un-installed; this milestone's pull-based evaluation is sufficient for the required GET
  endpoints, and is a smaller, safer footprint than wiring up push-based events would have been.
  See the class doc on `AchievementsService` for the known trade-off this creates for
  `PERFECT_WEEK`/`PERFECT_MONTH` specifically (they can go true-then-false again, so are only
  guaranteed to unlock if `GET /streaks/statistics` happens to be called while true — which the
  Dashboard's own load does, in practice, every visit).
- **Freeze days are a flat, user-wide mechanic, not per-habit** — `FreezeDay` has no `habitId`
  column (matching the milestone's own given field list), so spending one protects *every* active
  daily habit's streak for that date at once, not a single habit's. A placeholder quota of 2 per
  calendar month (`FREEZE_DAYS_PER_MONTH`) follows the same "documented placeholder, product owner
  finalizes later" precedent `docs/03-assumptions.md` (#4) already sets.
- **Overall consistency/streak/Perfect Day/Perfect Week/Perfect Month only consider active
  DAILY-frequency habits.** WEEKLY/MONTHLY habits still earn their own per-habit period streak
  (`GET /streaks/habits/:habitId`) and still count toward XP on every log, but a "did you succeed
  today" flag doesn't mean anything for a habit that isn't due daily — folding them into the daily
  metric would be either vacuously true or unfairly punitive. A user with zero active daily habits
  gets `hasDailyHabits: false` and zeroed fields rather than a misleading `0`.
- **XP is derived from completion *counts*, not a live event stream**: Task-completed × 10,
  Habit-logged × 5, Routine-block-completed × 15 (routine steps themselves have no completion
  field — see the note on Routine in `docs/06-database-design.md` — so this counts completed
  `PlannerBlock` rows of type `ROUTINE` instead, the only completion signal that exists for
  routines at all), Perfect-day × 50. No level system is built — the brief is explicit
  ("prepare the foundation, don't build levels yet") — just a running total.
- **A known, documented limitation**: `PlannerBlock` rows are deleted and rebuilt on every
  `POST /planner/generate` (an existing, approved Milestone 7 behavior this milestone does not
  change), so a regenerated day's prior completions no longer count toward Routine-completion XP
  or the "Planner Master" achievement after that day is regenerated. Flagged for a future
  dedicated completion-event ledger rather than worked around by changing Planner's behavior.
- **Reused, not duplicated**: `PlannerService.countCompletedBlocks`/`TasksService.countCompleted`
  are small additive exports (no existing behavior changed) that `StreaksService` reuses for
  XP/achievement totals, per `docs/05-architecture.md`'s "reuse services" rule.
  `planner/utils/timezone.util.ts` (Milestone 7) is reused as-is for every date/timezone
  computation in Streaks, plus one additive export (`getZonedHour`, for the Morning
  Warrior/Night Owl achievements) — the first time a util file is shared across module
  boundaries via direct import rather than through the owning module's exported service, since
  these are pure functions with no DI/state needs.
- **Verification**: 68 new backend unit tests (streak-calculator/xp-calculator/achievement
  definitions/FreezeDaysService/AchievementsService/StreaksService/all three controllers) plus the
  existing 248 all pass; 16 new frontend unit tests (API service/store/display-util) plus the
  existing 178 all pass. The running backend was exercised directly against a live Postgres
  database via curl (habit creation → log → streak/statistics/achievements/freeze-day endpoints,
  including a 409 on double-freezing a date and a 404-not-403 cross-user check), and the frontend
  was driven end-to-end with a headless Chromium session (register → create + log a habit →
  Streak Dashboard → Achievement Gallery → Dashboard), confirming real data renders in all four
  places with no console errors.

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
