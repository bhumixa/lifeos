# API Reference

Quick-reference index of every implemented endpoint, grouped by module. This file is a snapshot
maintained alongside each milestone — **Swagger (`/api/docs` on the running backend) is the
authoritative, always-current source** for request/response shapes, since it's generated directly
from the DTOs and never drifts out of sync with the code the way a hand-written doc can.

All endpoints except `auth/*` and `GET /health` require `Authorization: Bearer <access token>`
(`JwtAuthGuard`). Every user-owned resource is scoped to the requesting user; a resource that
exists but belongs to someone else returns `404`, not `403` (see `docs/05-architecture.md`).

## Health

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness/readiness check (DB connectivity). |

## Auth (`docs/`, Milestone 2)

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create an account; starts a session (access token in body, refresh token as an httpOnly cookie). |
| POST | `/auth/login` | Authenticate with email/password; starts a session. |
| POST | `/auth/refresh` | Exchange the refresh cookie for a new access/refresh pair (rotation). |
| POST | `/auth/logout` | Revoke the current refresh token; ends the session. |

## Users (Milestone 2)

| Method | Path | Description |
|---|---|---|
| GET | `/users/me` | The authenticated user's profile. |

## Tasks (Milestone 4)

| Method | Path | Description |
|---|---|---|
| GET | `/tasks` | Paginated list — filter by `status`/`priority`/`tag`/`search`/date ranges, sort, paginate. |
| GET | `/tasks/:id` | One task. |
| POST | `/tasks` | Create a task. |
| PATCH | `/tasks/:id` | Update a task. |
| DELETE | `/tasks/:id` | Soft-delete a task. |
| PATCH | `/tasks/:id/complete` | Mark a task complete (sets `status` and `completedAt`). |

## Routines (Milestone 5)

| Method | Path | Description |
|---|---|---|
| GET | `/routines` | List — optionally filter by `isActive`. |
| GET | `/routines/:id` | One routine, with its steps. |
| POST | `/routines` | Create a routine (optionally with an initial `steps` array, in one call). |
| PATCH | `/routines/:id` | Update a routine's own fields (not its steps). |
| DELETE | `/routines/:id` | Hard-delete a routine (steps cascade). |
| PATCH | `/routines/:id/activate` | Set `isActive: true`. |
| PATCH | `/routines/:id/deactivate` | Set `isActive: false`. |
| POST | `/routines/:id/duplicate` | Clone a routine and its steps (name suffixed "(Copy)"). |
| POST | `/routines/:id/steps` | Add a step (appended at the end). |
| PATCH | `/routines/:id/steps/reorder` | Reorder all of a routine's steps in one call. |
| PATCH | `/routines/:id/steps/:stepId` | Update one step. |
| DELETE | `/routines/:id/steps/:stepId` | Remove one step. |

## Habits (Milestone 6)

| Method | Path | Description |
|---|---|---|
| GET | `/habits` | Paginated list — filter by `isActive`/`targetFrequency`/`category`/`search`, sort (including by computed `completionPercent`). |
| GET | `/habits/today` | Every active habit, each with today's/current-period progress — powers Today's Habits and the Dashboard's Quick Complete panel. |
| GET | `/habits/summary` | `{ habitsCompletedToday, totalActiveHabits, completionPercentage }` — powers the Dashboard's habit stat cards. |
| GET | `/habits/history` | Paginated `HabitLog` timeline — optionally filter by `habitId`/`dateFrom`/`dateTo`. Powers Habit History and the Calendar Heatmap. |
| GET | `/habits/:id` | One habit, with computed progress. |
| POST | `/habits` | Create a habit (409 on a duplicate name for the same user). |
| PATCH | `/habits/:id` | Update a habit. |
| DELETE | `/habits/:id` | Soft-delete a habit. |
| POST | `/habits/:id/log` | Log a date (defaults to today; 409 if that date already has a log — use PATCH instead). |
| PATCH | `/habits/:id/log` | Update the log for a date (defaults to today; 404 if none exists). |
| DELETE | `/habits/:id/log` | Remove the log for a date (defaults to today; 404 if none exists). |

## Planner (Milestone 7)

| Method | Path | Description |
|---|---|---|
| GET | `/planner/today` | Today's plan (in the user's own timezone), auto-creating an empty day on first access. |
| GET | `/planner/:date` | One day's plan by `"YYYY-MM-DD"`, auto-creating an empty day on first access. |
| POST | `/planner/block` | Create a block (defaults `date` to today; `duration` is always derived from `startTime`/`endTime`, never trusted from the client). Returns the whole day. |
| PATCH | `/planner/block/:id` | Update a block (a block's `date` can't change — create a new one instead). Returns the whole day. |
| DELETE | `/planner/block/:id` | Hard-delete a block. |
| POST | `/planner/generate` | Deterministic (no AI) regeneration from current Task/Routine/Habit data — see the note below. Returns the day plus `unscheduledTaskIds`/`unscheduledHabitIds` for anything that didn't fit. |
| POST | `/planner/reorder` | Reorder a day's blocks — body is `{ date, blockIds }`, exactly that date's current block IDs in the desired order. |
| POST | `/planner/complete` | Toggle a block's own `completed` flag. Never writes to the Task/Habit a TASK/HABIT block references — see the note below. |

**Generate is idempotent, not additive.** TASK/ROUTINE/HABIT-type blocks are the ones this
endpoint owns end-to-end — every call deletes and rebuilds exactly those from current source data.
FOCUS/BREAK/CUSTOM blocks are always user-authored; generation treats them as fixed obstacles and
never deletes, moves, or overlaps them. Placement is greedy and priority-ordered (routines at
their fixed anchor times first, then tasks by priority, then not-yet-completed-today habits),
within a fixed `07:00`–`22:00` window and a configurable buffer — see `PlannerService.generate` and
`docs/05-architecture.md`.

**Completing a block never touches the resource it references.** This is a deliberate business
rule, not an oversight: a TASK block's `completed` flag is independent of the underlying Task's
`status`. A user who wants the Task itself marked done does so from the Tasks feature directly.

## Streaks (Milestone 8)

| Method | Path | Description |
|---|---|---|
| GET | `/streaks` | Overall current/longest streak across active DAILY habits, plus a per-habit streak summary for every active habit. |
| GET | `/streaks/today` | Today's streak-relevant snapshot — completed/remaining daily habits, whether today is already successful, freeze status. |
| GET | `/streaks/statistics` | The Dashboard/Streak Dashboard's one-call source: streaks, weekly/monthly consistency, success rate, perfect week/month, XP, totals, freeze-day summary, and a trailing daily history for the heatmaps. **Also the endpoint that evaluates and unlocks achievements** — see the note below. |
| GET | `/streaks/habits/:habitId` | One habit's own streak — day-level for DAILY habits, calendar-week/month-level for WEEKLY/MONTHLY, plus its recent period history. |

## Achievements (Milestone 8)

| Method | Path | Description |
|---|---|---|
| GET | `/achievements` | The full, data-driven achievement catalog, each with the requesting user's own `unlocked`/`unlockedAt`. |
| GET | `/achievements/unlocked` | Just the achievements this user has unlocked. |

**Achievements unlock as a side effect of `GET /streaks/statistics`**, not a live event
subscription — see `docs/05-architecture.md`. `PERFECT_WEEK`/`PERFECT_MONTH` are the one pair whose
condition can go true-then-false again as the week/month moves on, so they're only guaranteed to
unlock if that endpoint happens to be called while the condition holds; every other achievement
(streak/completion-count-based) only ever grows toward its threshold, so a later call always
"catches" it.

## Freeze Days (Milestone 8)

| Method | Path | Description |
|---|---|---|
| POST | `/freeze-days/use` | Spends one of a small monthly quota (2, a documented placeholder) of "streak freeze" days to protect a calendar date (defaults to today) from breaking the day-level consistency streak. 409 if that date is already frozen or the month's quota is exhausted; 400 for a future date. |

## Goals (Milestone 9)

| Method | Path | Description |
|---|---|---|
| GET | `/goals` | Paginated list — filter by `status`/`priority`/`targetType`/`category`/`search`/`archived` (defaults to excluding archived), sort (including by computed `progressPercent`). |
| GET | `/goals/:id` | One goal, with its milestones. Returns whatever `currentValue` is currently stored — see the note below on `/progress`. |
| POST | `/goals` | Create a goal. `currentValue` defaults to 0; only meaningful to set explicitly for a `CUSTOM` `targetType`. |
| PATCH | `/goals/:id` | Update a goal. A `currentValue` in the body is applied only if the goal's (possibly also-updated) `targetType` is `CUSTOM` — silently ignored for the four automatic types, the same "never trust frontend data for a derived field" rule Planner's `duration` already follows. |
| DELETE | `/goals/:id` | Soft-delete a goal. |
| POST | `/goals/:id/archive` | Set `archived: true`. Excluded from `GET /goals` by default; not a delete. |
| POST | `/goals/:id/unarchive` | Set `archived: false`. |
| GET | `/goals/:id/progress` | Recomputes `currentValue` from source data for the four automatic `targetType`s (see the note below), persists the refreshed value, and returns it alongside `progressPercent`/`remainingValue`/`isComplete`. CUSTOM goals just reflect whatever was last set via `PATCH`. |
| POST | `/goals/:id/milestones` | Add a milestone (appended at the end unless `order` is given). |
| PATCH | `/goals/milestones/:id` | Update one milestone — **not** nested under a goal id in the URL (unlike Routine's steps); ownership is still enforced by joining through the milestone's parent goal. Toggling `completed` stamps/clears `completedAt` to match. |
| DELETE | `/goals/milestones/:id` | Hard-delete a milestone. |

**Task, Habit, Routine, and PlannerBlock can each optionally link to a Goal** via an additive,
optional `goalId` field on their own create/update DTOs (a Goal in the request body must belong to
the same user — 404 otherwise, the same ownership check every other cross-resource reference in
this API uses). `GET`/list responses for all four now include `goalId` alongside their existing
fields.

**`GET /goals/:id/progress` is the only endpoint that recomputes `currentValue`** — `GET /goals`
and `GET /goals/:id` return whatever's currently stored, so listing goals never re-scans
Task/Habit/Routine/PlannerBlock data. Each automatic `targetType` maps to exactly one of those
four "contributes automatically" sources, via that source's own `goalId`:

| `targetType` | Recomputed from |
|---|---|
| `TASK_COUNT` | Count of this user's completed Tasks with `goalId` = this goal. |
| `HABIT_COMPLETION` | Count of `HabitLog` rows for this user's Habits with `goalId` = this goal. |
| `ROUTINE_COMPLETION` | Count of completed `ROUTINE`-type `PlannerBlock`s referencing a `RoutineStep` that belongs to one of this user's Routines with `goalId` = this goal. |
| `FOCUS_TIME` | Sum of `duration` (minutes) across this user's completed `PlannerBlock`s with `goalId` = this goal directly (independent of `type`/`referenceId`). |
| `CUSTOM` | Nothing — `currentValue` only changes via `PATCH /goals/:id`. |

## Journal (Milestone 10)

| Method | Path | Description |
|---|---|---|
| GET | `/journal` | Paginated list — filter by `type`, sort by `date`/`createdAt`. The plain "browse everything" listing; see `/journal/search` for the richer filter set. |
| GET | `/journal/history` | Paginated timeline — filter by `type`/`dateFrom`/`dateTo`, newest first. Same shape as `GET /habits/history`. |
| GET | `/journal/search` | Rich filter search — `keyword` (title/content, case-insensitive), `mood`, `energy`, `tag`, `goalId`, `type`, `dateFrom`/`dateTo`, sort. |
| GET | `/journal/prompts` | The reflection-prompt catalog, optionally filtered by `type`. Data-driven — see the note below. |
| GET | `/journal/:date` | Every entry for one calendar date (`"YYYY-MM-DD"`) — 0-2 MORNING/EVENING plus any number of FREEFORM. Never auto-creates anything; an empty `entries` array is valid. |
| POST | `/journal` | Create an entry. `date` defaults to today in the user's own timezone. MORNING/EVENING are limited to one per calendar day (409 on a second attempt); FREEFORM has no limit. |
| PATCH | `/journal/:id` | Update an entry. `type`/`date` can't change — create a new entry instead. |
| DELETE | `/journal/:id` | Soft-delete an entry. Journal entries are never deleted automatically. |
| POST | `/journal/attachments` | Registers metadata (`fileName`/`fileType`/`fileSize`/`url`) for a file the client already hosted elsewhere — not a binary upload endpoint (no object-storage provider exists anywhere in this codebase yet). |
| DELETE | `/journal/attachments/:id` | Hard-deletes an attachment record. |

**One Morning/Evening journal per day, unlimited Freeform** is enforced in `JournalService`
(a `findFirst` check before create, 409 on a match) rather than a database constraint — the rule
is conditional on `type`, which Postgres can only express as a *partial* unique index, a feature
Prisma's schema DSL has no declarative syntax for without hand-written migration SQL. This is a
documented, accepted limitation (see the class doc on `JournalEntry` in `prisma/schema.prisma`),
not a bug.

**`goalId`/`plannerDayId`** are optional, one-directional links (same `assertGoalOwnership`
pattern every other module's optional `goalId` already uses, plus a symmetric
`assertPlannerDayOwnership`) — a value in the request body must belong to the same user, 404
otherwise. Journal does **not** gain a new `GoalTargetType` (e.g. a hypothetical
`JOURNAL_COUNT`) — a Goal's "related journal entries" (Goal Detail) is a plain
`GET /journal/search?goalId=` query, not a progress input.

**The reflection-prompt catalog (`JournalPrompt`)** is upserted from one TypeScript array
(`modules/journal/utils/journal-prompt-definitions.ts`) at boot, the same pattern
`AchievementsService` already established for the achievement catalog (Milestone 8) — one source
of truth instead of a separate seed script.

**Cross-feature integration is composed on the frontend**, not via backend module imports: Habit
completion summary and current streak (shown on the Evening Journal page) reuse Habits'/Streaks'
own existing `GET /habits/summary`/`GET /streaks/today` endpoints directly; Planner's "open
today's journal" is a plain link to `/journal`; Goal Detail's "related journal entries" calls
`GET /journal/search?goalId=`. `JournalModule` itself imports nothing from any sibling module —
see `docs/05-architecture.md`'s Milestone 10 note for the full rationale.

## Not yet implemented

Calendar, Notifications, AI Coach, Analytics, Subscriptions, Admin — see `docs/09-roadmap.md` for
milestone sequencing. XP/achievements are the beginning of "Gamification," per that roadmap's
Phase 3, but a level system, badges beyond the fixed `Achievement` catalog, and daily/weekly
Challenges remain unbuilt (see the note on Milestone 8 in `docs/changelog.md`). `JournalService` is
exported by `JournalModule` specifically so a future AI Coach module can reuse it as a read source
for coaching context — no AI code exists yet.
