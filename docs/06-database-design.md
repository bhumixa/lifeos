# 6. Recommended Database Design

PostgreSQL via Prisma ORM, as specified in the PRD. This is a **design reference** (conceptual schema), not a file to be copied verbatim into `schema.prisma` — field types and constraints should be finalized during implementation of each milestone.

## Design principles

- **Single-tenant per user** for MVP: every user-owned table has a `userId` FK; no organization/workspace concept until Phase 2 team features are scoped (at which point a `Workspace` entity is introduced above `User`, not retrofitted into every table now).
- **Soft delete** (`deletedAt` nullable) on user-generated content tables (Task, Habit, JournalEntry, Goal, ScheduleBlock) so accidental deletes are recoverable and GDPR erasure can be a deliberate purge job rather than an irreversible cascading delete on every action.
- **Sensitive fields encrypted at rest**: `JournalEntry.content`, `JournalEntry.mood`.
- **Precomputed aggregates** (`DailyStat`) rather than computing analytics from raw logs on every dashboard load — computed nightly by the worker, keeping dashboard reads fast.

## Core entities

### Identity & access

```
User
  id                uuid PK
  email             string, unique
  passwordHash      string, nullable (null if OAuth-only)
  googleId          string, nullable, unique
  name              string
  avatarUrl         string, nullable
  role              enum(STANDARD, PREMIUM, ADMIN)
  timezone          string (IANA, e.g. "America/New_York")
  locale            string, default "en"
  emailVerifiedAt   timestamp, nullable
  isActive          boolean, default true
  createdAt / updatedAt / deletedAt

RefreshToken
  id                uuid PK
  userId            FK -> User
  tokenHash         string
  deviceInfo        string, nullable
  expiresAt         timestamp
  revokedAt         timestamp, nullable
  createdAt

UserSettings
  userId            FK -> User, unique (1:1)
  theme             enum(LIGHT, DARK, SYSTEM)
  wakeTime           time
  sleepTime          time
  notificationPrefs json   -- per-channel, per-type opt-in/out + quiet hours
```

### Planning

```
Task
  id                uuid PK
  userId            FK -> User
  parentTaskId      FK -> Task, nullable (subtasks)
  title             string
  description       text, nullable
  priority          enum(LOW, MEDIUM, HIGH, URGENT)
  category           string, nullable
  status            enum(TODO, IN_PROGRESS, DONE, CANCELLED)
  dueDate           timestamp, nullable
  recurrenceRule    string, nullable (RRULE format)
  completedAt       timestamp, nullable
  createdAt / updatedAt / deletedAt
```

> **As implemented (Milestone 4):** the actual `Task` model uses the simplified field set given in
> that milestone's brief rather than the shape above — `priority` is `LOW/MEDIUM/HIGH/CRITICAL`,
> `status` is `TODO/IN_PROGRESS/COMPLETED/CANCELLED`, and `tags` is a flat `string[]` rather than a
> relational `Tag`/`TaskTag` join. `estimatedMinutes` was added (not in this doc) to support the
> Dashboard's "Focus Time" concept later. `parentTaskId`, `category`, and `recurrenceRule` are
> deferred — not needed by any Milestone 4 endpoint — rather than built unused. `deletedAt` (soft
> delete) *was* kept, per this doc's design principle just below and because `Task` is named there
> explicitly. See `prisma/schema.prisma`'s comment on `Task` for the same rationale in context.

```
Tag
  id                uuid PK
  userId            FK -> User
  name              string
  color             string
  -- unique (userId, name)

TaskTag  (join table: Task <-> Tag, many-to-many)

ScheduleBlock
  id                uuid PK
  userId            FK -> User
  title             string
  type              enum(TASK, HABIT, EVENT, FOCUS_BLOCK)
  sourceType/sourceId  -- polymorphic link back to Task/Habit/Goal if applicable
  startTime / endTime  timestamp
  recurrenceRule    string, nullable
  color             string, nullable
  isAiGenerated     boolean, default false
  createdAt / updatedAt / deletedAt

ScheduleTemplate
  id                uuid PK
  userId            FK -> User, nullable (nullable = system/shared template, future marketplace-ready)
  name              string
  isPublic          boolean, default false   -- Phase 4 marketplace groundwork
  blocksJson        json   -- template block definitions (relative times, not absolute)
```

> **Added in Milestone 5 — Routine (not originally in this doc):** `ScheduleTemplate.blocksJson`
> was this doc's original placeholder for "reusable time-blocked templates," but Milestone 5 asked
> for first-class `Routine`/`RoutineStep` tables instead of a JSON blob — better suited to
> per-step CRUD, reordering, and duplication than editing inside a JSON document. As implemented:
>
> ```
> Routine
>   id                uuid PK
>   userId            FK -> User
>   name              string
>   icon              string   -- Material icon name
>   color             string   -- hex or design-token name
>   description        string, nullable
>   isActive          boolean, default true
>   createdAt / updatedAt
>
> RoutineStep
>   id                     uuid PK
>   routineId              FK -> Routine
>   title                  string
>   startTime              string   -- "HH:mm", 24-hour, local time-of-day (not a timestamp — see below)
>   durationMinutes        int
>   order                  int
>   reminderMinutesBefore  int, nullable
>   isRequired             boolean, default true
> ```
>
> - **`startTime` is a plain string, not a `DateTime`**: a Routine is a repeatable daily template
>   with no calendar date of its own, so there's no date for a timestamp to belong to.
> - **No completion-tracking field or table.** Neither entity's given field list includes one, so
>   the Milestone 5 dashboard's "Routine completion %" is computed as *time-elapsed progress*
>   through the current routine's steps (frontend-only, comparing each step's `startTime` to the
>   current time), not persisted per-day completion state. A `RoutineStepCompletion` table (id,
>   routineStepId, date, completedAt) would be the natural next step if genuine user-confirmed
>   completion tracking is wanted later — deliberately not built now since it wasn't asked for.
> - **Hard delete, unlike Task**: a routine is structural configuration a user recreates easily,
>   not the kind of irreplaceable content the soft-delete principle below is protecting.

### Habits & streaks

```
Habit
  id                uuid PK
  userId            FK -> User
  name              string
  category          string, nullable
  targetFrequency   enum(DAILY, WEEKLY, CUSTOM) + json rule for CUSTOM
  isQuantifiable    boolean  -- e.g. water intake tracked as a number, not boolean
  unit              string, nullable  -- "glasses", "minutes"
  isArchived        boolean, default false
  createdAt / updatedAt / deletedAt

HabitLog
  id                uuid PK
  habitId           FK -> Habit
  date              date
  completed         boolean
  value             numeric, nullable  -- for quantifiable habits
  note              text, nullable
  -- unique (habitId, date)

Streak
  id                uuid PK
  habitId           FK -> Habit, unique (1:1)
  currentStreak     int, default 0
  longestStreak     int, default 0
  lastCompletedDate date, nullable
  missedDays        int, default 0
  freezesAvailable  int   -- "recovery streak" mechanic (see 03-assumptions.md)
  freezesUsed       int
  milestonesReached int[]  -- e.g. [7, 30, 100]
  updatedAt
```

> **As implemented (Milestone 6 — Habit Tracker):** `Habit`/`HabitLog` follow that milestone's
> simplified field set rather than the shape above:
>
> ```
> Habit
>   id                uuid PK
>   userId            FK -> User
>   name              string
>   description        string, nullable
>   icon              string   -- Material icon name
>   color             string   -- hex or design-token name
>   targetFrequency   enum(DAILY, WEEKLY, MONTHLY)
>   targetCount       int, default 1   -- "do this N times per period" — covers boolean habits
>                                       -- (targetCount: 1) and quantifiable ones alike
>   category          string, nullable
>   reminderTime      string, nullable   -- "HH:mm", same convention as RoutineStep.startTime
>   isActive          boolean, default true
>   createdAt / updatedAt / deletedAt
>   -- unique (userId, name)
>
> HabitLog
>   id                uuid PK
>   habitId           FK -> Habit
>   date              date   -- at most one log per habit per date
>   completedCount    int, default 1
>   notes             string, nullable
>   createdAt
>   -- unique (habitId, date)
> ```
>
> - **`targetFrequency`/`targetCount` replace `isQuantifiable`/`unit`**: this milestone's brief
>   specified `DAILY | WEEKLY | MONTHLY` (not this doc's `DAILY, WEEKLY, CUSTOM` + JSON rule) and a
>   `targetCount`, so "8 glasses of water" is `targetCount: 8` over `DAILY` and "gym 3x" is
>   `targetCount: 3` over `WEEKLY` — one field pair instead of two, with no CUSTOM-rule JSON blob.
> - **`HabitLog.completedCount`/`notes` replace `completed`/`value`**: a single numeric field
>   covers both "did it" (completedCount: 1) and "how much" (completedCount: 8) without a separate
>   boolean, matching the milestone's given field list exactly.
> - **Soft delete, like Task**: this doc's design principle names Habit explicitly, so `deletedAt`
>   is kept (unlike Routine, which isn't named and uses a hard delete).
> - **No completion/streak columns on Habit or HabitLog.** "Today's completion status" and every
>   completion percentage the API returns (`currentPeriodCount`, `completionPercent`,
>   `todayCount`, `completedToday`) are computed from `HabitLog` on every read, not stored — the
>   same "computed, not persisted" choice Milestone 5 made for Routine's completion %, and
>   consistent with this doc's own principle that `Streak` is a derived rollup over the log, never
>   a source of truth. Actual streak *tracking* — `Streak`, `currentStreak`/`longestStreak`,
>   freeze/recovery — remained explicitly out of scope at the time (Milestone 7 turned out to be
>   the Daily Planner, not the Streak Engine this note originally assumed it would be). Milestone 8
>   is that Streak Engine — see the note below the PlannerDay/PlannerBlock block for what it adds,
>   and note that it *doesn't* add a `Streak` table at all: every number this section anticipated
>   storing stays derived, computed fresh from `HabitLog` on every read instead.
> - **`(userId, name)` uniqueness** backs "validate duplicate habit names per user": `HabitsService`
>   checks it first (a friendly 409) with the DB constraint as a last-resort backstop against a
>   create/create race.
> - **`(habitId, date)` uniqueness** backs "prevent multiple logs for the same habit/date" at the
>   database level — `POST /habits/:id/log` rejects a second log for a date that already has one
>   (409, pointing at `PATCH` instead) rather than silently overwriting it.

> **Added in Milestone 7 — PlannerDay/PlannerBlock (not originally in this doc):** this doc's
> closest existing concept was `ScheduleBlock` above, but Milestone 7 asked for a day container
> plus blocks rather than one flat table. As implemented:
>
> ```
> PlannerDay
>   id                uuid PK
>   userId            FK -> User
>   date              date   -- one row per (userId, date); auto-created on first GET/POST
>   notes             string, nullable
>   createdAt / updatedAt
>
> PlannerBlock
>   id                uuid PK
>   plannerDayId      FK -> PlannerDay
>   type              enum(TASK, ROUTINE, HABIT, FOCUS, BREAK, CUSTOM)
>   referenceId       string, nullable   -- Task.id / RoutineStep.id / Habit.id; no FK constraint
>   title             string
>   description       string, nullable
>   startTime / endTime  timestamp
>   duration          int   -- minutes; always derived from (endTime - startTime), never trusted
>                            -- from the client (see docs/05-architecture.md's database rules)
>   color             string, nullable
>   completed         boolean, default false
>   order             int   -- manual sort key, independent of chronological startTime
>   createdAt / updatedAt
> ```
>
> - **Two models, not one**, unlike `ScheduleBlock`'s flat shape: every Planner endpoint operates
>   "for this user, on this date" first and block-by-block second, and `notes` belongs to the day
>   itself, not any one block. `ScheduleBlock` was never implemented, so there's no migration
>   concern in diverging from that original shape.
> - **`referenceId` is polymorphic-by-reference**, the same pattern `ScheduleBlock`'s
>   `sourceType`/`sourceId` already specified — null for FOCUS/BREAK/CUSTOM, which have no backing
>   source record.
> - **No `isAiGenerated` flag** (unlike `ScheduleBlock`): the milestone brief is explicit that
>   generation is deterministic, not AI-driven, so that flag has no meaning here. The existing
>   `type` column already distinguishes generator-owned blocks (TASK/ROUTINE/HABIT — replaced on
>   every `POST /planner/generate`) from user-authored ones (FOCUS/BREAK/CUSTOM — never touched by
>   generation), so no separate column was added to track that distinction either.
> - **Hard delete on PlannerBlock, like RoutineStep**: a block is disposable scheduling, not the
>   irreplaceable content the soft-delete principle protects. `PlannerDay` has no delete endpoint
>   at all — it accumulates as a per-date historical record, the same role `DailyStat` plays.
> - **`(userId, date)` uniqueness on PlannerDay** backs "auto-create on first access": `GET
>   /planner/today` and `GET /planner/:date` find-or-create against this constraint rather than
>   requiring a separate provisioning step, the same convention `HabitLog`'s `(habitId, date)`
>   uniqueness supports for its own upsert-like reads.

> **Added in Milestone 8 — Streak Engine & Gamification Foundation (not originally in this
> doc — the closest existing concepts are `Streak` above and `GamificationProfile`/`Badge`/
> `UserBadge`/`Challenge`/`UserChallenge` below):**
>
> ```
> Achievement
>   id                uuid PK
>   code              string, unique   -- e.g. "FIRST_HABIT", "STREAK_7"
>   title             string
>   description        string
>   icon              string   -- Material icon name
>   xpReward          int
>   createdAt
>
> UserAchievement
>   id                uuid PK
>   userId            FK -> User
>   achievementId     FK -> Achievement
>   unlockedAt        timestamp
>   -- unique (userId, achievementId)
>
> FreezeDay
>   id                uuid PK
>   userId            FK -> User
>   date              date   -- the calendar date being protected, not when it was spent
>   consumed          boolean, default true
>   createdAt
>   -- unique (userId, date)
> ```
>
> - **No `Streak` table, matching this milestone's own brief** ("Do NOT store streak values
>   permanently. HabitLog remains the source of truth") — `currentStreak`/`longestStreak` and every
>   consistency/success-rate/XP number this doc's `Streak`/`GamificationProfile` sketched as stored
>   columns are instead recomputed on every `GET /streaks*` read from `HabitLog` (plus `Task`/
>   `PlannerBlock` completion counts, for XP), the same "derived, not persisted" principle
>   Habit/Routine already established for their own completion percentages. See
>   `docs/05-architecture.md` and `modules/streaks/streaks.service.ts` for the full computation.
> - **`Achievement` replaces this doc's `Badge`**, and `UserAchievement` replaces `UserBadge` —
>   different names for the same shape (a catalog + a per-user unlock join), chosen to match the
>   milestone brief's own vocabulary ("Achievement Gallery," not "Badge Gallery"). `xpReward` lives
>   on the catalog row (not computed) since it's a fixed, data-driven property of the achievement
>   itself, unlike the streak/consistency numbers above.
> - **`Challenge`/`UserChallenge` remain unbuilt** — daily/weekly challenges are a distinct concept
>   from the fixed Achievement catalog this milestone implements, and weren't asked for.
> - **`FreezeDay` has no `habitId`** — it's a flat, user-wide mechanic (spending one protects
>   *every* active daily habit's streak for that date, not a single habit's), matching the
>   milestone's own given field list (`id`, `userId`, `date`, `consumed`) exactly. `createdAt` was
>   added beyond that literal list, consistent with every other model in this schema always
>   tracking one.
> - **`consumed` defaults `true`**: this milestone has no "reserve a freeze for later" concept —
>   the only codepath that creates a row (`POST /freeze-days/use`) does so at the moment of use —
>   but the column is real (not merely implied by the row's existence) so a future "auto-apply my
>   remaining freezes" job could pre-grant an un-consumed row without a schema change.
> - **`(userId, achievementId)` / `(userId, date)` uniqueness** back "unlock each achievement at
>   most once" and "spend at most one freeze per calendar date" respectively, the same
>   idempotent-upsert convention `HabitLog`'s `(habitId, date)` and `PlannerDay`'s `(userId, date)`
>   already use.

### Reflection & goals

```
JournalEntry
  id                uuid PK
  userId            FK -> User
  date              date
  type              enum(MORNING_INTENTION, EVENING_REFLECTION, GRATITUDE, FREEFORM)
  content            text  -- ENCRYPTED
  mood              int, nullable  -- ENCRYPTED, e.g. 1-5 scale
  createdAt / updatedAt / deletedAt

Goal
  id                uuid PK
  userId            FK -> User
  title             string
  category           enum(PERSONAL, CAREER, HEALTH, FINANCIAL, LEARNING, SPIRITUAL)
  targetDate        date, nullable
  status             enum(ACTIVE, COMPLETED, ABANDONED)
  progressPercent   int, default 0
  createdAt / updatedAt / deletedAt

GoalMilestone
  id                uuid PK
  goalId            FK -> Goal
  title             string
  targetDate        date, nullable
  completedAt       timestamp, nullable
```

### AI & notifications

```
AiInteraction
  id                uuid PK
  userId            FK -> User
  type              enum(MORNING_BRIEFING, EVENING_REVIEW, SCHEDULE_GEN, REMINDER, CHAT, WEEKLY_INSIGHT)
  provider          enum(CLAUDE, OPENAI)
  promptTokens      int
  completionTokens  int
  estimatedCostUsd  decimal
  latencyMs         int
  createdAt
  -- request/response payloads NOT stored long-term by default (privacy); short TTL cache in Redis instead if needed for debugging

Notification
  id                uuid PK
  userId            FK -> User
  type              enum(WAKE, WATER, MEAL, EXERCISE, PRAYER, MEDITATION, MEETING, TASK, SLEEP, AI_DIGEST)
  channel           enum(PUSH, EMAIL, IN_APP)
  scheduledFor      timestamp
  sentAt            timestamp, nullable
  status            enum(PENDING, SENT, FAILED, CANCELLED)
  payload           json
```

### Analytics & gamification

> **Superseded in part by Milestone 8** — see the note under "Habits & streaks" above.
> `GamificationProfile.xp`/`Badge`/`UserBadge` are replaced there by `Achievement`/
> `UserAchievement` plus an on-read-computed XP total (no stored `xp`/`level` columns —
> "prepare the foundation, don't build levels yet" per that milestone's brief). `DailyStat` and
> `Challenge`/`UserChallenge` below remain exactly as sketched here — unbuilt.

```
DailyStat   -- precomputed nightly per user
  id                uuid PK
  userId            FK -> User
  date              date
  productivityScore int   -- formula TBD; see 02-missing-requirements.md
  tasksPlanned      int
  tasksCompleted    int
  habitsCompleted   int
  focusMinutes      int
  learningMinutes   int
  -- unique (userId, date)

GamificationProfile
  userId            FK -> User, unique (1:1)
  xp                int, default 0
  level             int, default 1

Badge
  id                uuid PK
  key               string, unique  -- "7_day_streak", "early_bird"
  name              string
  description        string
  iconUrl           string

UserBadge
  userId            FK -> User
  badgeId           FK -> Badge
  earnedAt          timestamp
  -- unique (userId, badgeId)

Challenge
  id                uuid PK
  type              enum(DAILY, WEEKLY)
  title             string
  criteriaJson      json
  startDate / endDate

UserChallenge
  userId            FK -> User
  challengeId       FK -> Challenge
  progress          int
  completedAt       timestamp, nullable
```

### Billing & admin

```
Subscription
  id                    uuid PK
  userId                FK -> User, unique (1:1)
  plan                  enum(FREE, PREMIUM)
  provider              enum(STRIPE)
  externalCustomerId    string, nullable
  externalSubscriptionId string, nullable
  status                enum(ACTIVE, TRIALING, PAST_DUE, CANCELLED)
  currentPeriodEnd      timestamp, nullable

AdminAuditLog
  id                uuid PK
  adminUserId       FK -> User
  action            string
  targetUserId      FK -> User, nullable
  metadata          json
  createdAt
```

## Indexing notes

- `(userId, date)` composite indexes on `HabitLog`, `JournalEntry`, `DailyStat` — the dominant query pattern is "this user's data in a date range."
- `(userId, status)` on `Task` for the task list/dashboard queries.
- `(userId, startTime)` on `ScheduleBlock` for calendar range queries. As implemented (Milestone 7): `PlannerDay` carries `(userId, date)` (unique + indexed) instead, since every Planner query starts from "this user's day," and `PlannerBlock` carries `(plannerDayId, order)` and `(plannerDayId, startTime)` for its own list/timeline ordering.
- Unique constraints: `User.email`, `User.googleId`, `(HabitId, date)` on `HabitLog`, `(userId, date)` on `DailyStat`, `(userId, badgeId)` on `UserBadge`. As implemented: also `(userId, date)` on `PlannerDay` (Milestone 7) and `(userId, name)` on `Habit` (Milestone 6).

## Why this shape

- **Streak is derived state, not the source of truth** — `HabitLog` is the ledger; `Streak` is a maintained rollup updated by the `streak-rollover` job (see architecture doc). This means streaks can always be recomputed/audited from logs if the rollup ever drifts.
- **`ScheduleBlock` is polymorphic-by-reference** (`sourceType`/`sourceId`) rather than duplicating task/habit data into the calendar — a completed task and its calendar block stay in sync automatically, and the calendar can render tasks, habits, and free-standing events uniformly. As implemented (Milestone 7): `PlannerBlock.referenceId` carries this forward exactly, split into `PlannerDay`/`PlannerBlock` — see the note on PlannerDay above.
- **`AiInteraction` doubles as cost telemetry and the "AI engagement rate" metric source** — no separate analytics pipeline needed for that specific success metric.
