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
- `(userId, startTime)` on `ScheduleBlock` for calendar range queries.
- Unique constraints: `User.email`, `User.googleId`, `(HabitId, date)` on `HabitLog`, `(userId, date)` on `DailyStat`, `(userId, badgeId)` on `UserBadge`.

## Why this shape

- **Streak is derived state, not the source of truth** — `HabitLog` is the ledger; `Streak` is a maintained rollup updated by the `streak-rollover` job (see architecture doc). This means streaks can always be recomputed/audited from logs if the rollup ever drifts.
- **`ScheduleBlock` is polymorphic-by-reference** (`sourceType`/`sourceId`) rather than duplicating task/habit data into the calendar — a completed task and its calendar block stay in sync automatically, and the calendar can render tasks, habits, and free-standing events uniformly.
- **`AiInteraction` doubles as cost telemetry and the "AI engagement rate" metric source** — no separate analytics pipeline needed for that specific success metric.
