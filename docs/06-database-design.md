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

> **Added in Milestone 11 — Calendar & External Integrations (not originally in this doc as its
> own entity — this doc's original `ScheduleBlock` sketch above was the closest existing concept
> for "external calendar sync," but Milestone 7 built that concept's actual replacement as
> `PlannerDay`/`PlannerBlock` instead, per the note above; `ScheduleBlock` itself was never
> implemented):** as implemented:
>
> ```
> Calendar
>   id                uuid PK
>   userId            FK -> User
>   name              string
>   provider          enum(LOCAL, GOOGLE, MICROSOFT, APPLE, ICAL), default LOCAL
>   color             string
>   timezone          string, default "UTC"   -- independent of User.timezone
>   enabled           boolean, default true
>   createdAt / updatedAt
>
> CalendarEvent
>   id                uuid PK
>   calendarId        FK -> Calendar
>   plannerBlockId    FK -> PlannerBlock, nullable, onDelete SetNull
>   taskId            FK -> Task, nullable, onDelete SetNull
>   goalId            FK -> Goal, nullable, onDelete SetNull
>   journalEntryId    FK -> JournalEntry, nullable, onDelete SetNull
>   externalId        string, nullable   -- an external provider's own event id; always null today
>   title             string
>   description       string, nullable
>   startTime / endTime  timestamp
>   allDay            boolean, default false
>   location          string, nullable
>   source            enum(LOCAL, SYNCED), default LOCAL
>   status            enum(ACTIVE, DISABLED), default ACTIVE
>   createdAt / updatedAt
>
> CalendarSync
>   id                uuid PK
>   calendarId        FK -> Calendar
>   lastSync          timestamp, nullable   -- null for a FAILED attempt (every non-LOCAL provider today)
>   status            string   -- "PENDING" | "SUCCESS" | "FAILED"; no dedicated enum (see below)
>   errorMessage      string, nullable
>   createdAt
> ```
>
> - **A new, independent entity — not a repurposing of `PlannerBlock`.** `Calendar` is a plain
>   user-owned container (the same role Routine/Habit/Goal play as "a thing a user creates and
>   configures"), separate from Planner's own per-user-per-date `PlannerDay`/`PlannerBlock` model;
>   this milestone's own brief asks Calendar to *integrate* Planner (an optional `plannerBlockId`
>   link, "Planner blocks may create calendar events"), not absorb or replace it.
> - **The four optional cross-links on `CalendarEvent`** follow exactly the pattern
>   Task/Habit/Routine/PlannerBlock already established for `goalId` in Milestone 9, and
>   JournalEntry for `goalId`/`plannerDayId` in Milestone 10: nullable FK, `onDelete: SetNull`,
>   ownership validated via a raw Prisma existence check in `CalendarEventsService` rather than an
>   injected service. `onDelete: SetNull` is what makes this milestone's own "deleting linked
>   objects should never delete calendar history automatically" rule true at the database level.
>   Journal entries are, per that same rule, read-only references — no write path back into
>   Journal exists, the same "display-only, no new `GoalTargetType`" treatment `JournalEntry.goalId`
>   already got in Milestone 10.
> - **Hard delete on `Calendar`/`CalendarEvent`, like Routine/PlannerBlock** — both are disposable
>   configuration/scheduling data, not the irreplaceable content the soft-delete principle
>   protects. Deleting a `Calendar` cascades to its own `CalendarEvent`/`CalendarSync` rows (that's
>   the calendar's *own* history) — a different thing entirely from a linked Task/Goal/
>   PlannerBlock/JournalEntry being deleted, which only detaches (`SetNull`), never cascades.
> - **`CalendarSync` is append-only** — one row per sync *attempt*, not a single mutable
>   "last-known-state" row overwritten in place, so a calendar's sync history stays inspectable
>   (e.g. a future "sync history" panel), the same "durable fact, not a mutable status flag"
>   treatment `UserAchievement.unlockedAt` already gets. `status` is a plain string rather than a
>   new enum — the milestone's own Enums section names only `CalendarProvider`/`CalendarSource`/
>   `CalendarStatus`, so (matching the exact precedent `Goal.category` and
>   `JournalEntry.productivity` already set) an enum isn't invented for a field the brief didn't
>   ask to be one.
> - **No recurrence field** — this milestone's own Testing section asks only for "recurring event
>   preparation," not a working recurrence engine (see `modules/calendar/utils/recurrence.util.ts`,
>   covered by unit tests including both 2026 DST transitions, but never called automatically).
> - **`conflictsWith` (an event's overlapping-sibling ids) is computed on every read, not stored** —
>   the same "derived, not persisted" principle Habit/Routine/Goal already apply to their own
>   completion percentages, reusing `planner/utils/scheduler.util.ts`'s overlap helpers directly.
> - **Provider architecture is real, working code** — `ICalendarProvider`/`CalendarProviderRegistry`
>   /`LocalCalendarProvider`/`RemoteCalendarProvider` (and its four subclasses) are the first actual
>   implementation of the interface-plus-adapter shape `docs/05-architecture.md` has anticipated
>   for `AiProvider`/`NotificationChannel` since early milestones — see that doc's own Milestone 11
>   note for the full rationale.

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

> **As implemented (Milestone 10 — Journal, Reflection & Life Timeline):** the actual
> `JournalEntry` model follows that milestone's own field list — a deliberately wide single table
> covering all three `JournalType` variants (MORNING/EVENING/FREEFORM) with nullable type-specific
> columns — rather than this doc's original four-type sketch:
>
> ```
> JournalEntry
>   id                uuid PK
>   userId            FK -> User
>   date              date   -- in the user's own timezone, same convention as PlannerDay.date
>   type              enum(MORNING, EVENING, FREEFORM)
>   title             string, nullable
>   content            string, nullable
>   mood              enum(VERY_BAD, BAD, NEUTRAL, GOOD, EXCELLENT), nullable
>   energy            enum(VERY_LOW, LOW, NORMAL, HIGH, VERY_HIGH), nullable
>   productivity       int, nullable   -- self-rated 1-5
>   gratitude         string[]
>   wins              string[]
>   lessons           string, nullable
>   tomorrowPlan      string, nullable
>   tags              string[]
>   weather           string, nullable
>   location          string, nullable
>   -- Morning-only:
>   intention           string, nullable
>   topPriorities       string[]
>   affirmation         string, nullable
>   visualization       string, nullable
>   expectedChallenges  string, nullable
>   -- Evening-only:
>   wentWell           string, nullable
>   wentWrong          string, nullable
>   plannerReflection  string, nullable
>   habitReflection    string, nullable
>   goalReflection     string, nullable
>   -- Milestone 9-style optional cross-links:
>   goalId             FK -> Goal, nullable, onDelete: SetNull
>   plannerDayId       FK -> PlannerDay, nullable, onDelete: SetNull
>   createdAt / updatedAt / deletedAt
> ```
>
> - **One wide table, not four per-type tables or a JSON blob** — a morning/evening reflection and
>   a freeform diary entry share the same identity/date/mood/energy/tags/attachments shape and the
>   same list/search/history endpoints; `mood`/`energy`/`tags`/`goalId` need to be indexed and
>   filtered on directly (`GET /journal/search`), which JSON would make a per-query JSON-path
>   expression instead of a plain `WHERE` clause — the same reasoning this doc's own note on Routine
>   already gives for choosing relational columns over `ScheduleTemplate.blocksJson`.
> - **`type` is `MORNING/EVENING/FREEFORM`**, not this doc's original four-value enum — the
>   milestone brief's own Enums section defines exactly these three, with Gratitude folded into
>   Evening's own `gratitude` field rather than being a fourth top-level type.
> - **No field-level encryption is implemented** for `content`/`mood`, despite this doc's own
>   design principle naming `JournalEntry.content`/`mood` explicitly for encryption at rest, and
>   despite `docs/03-assumptions.md`/`docs/04-improvements.md` flagging journal content as
>   especially sensitive. The Milestone 10 brief's own Database/Backend/Business Rules sections
>   don't ask for `pgcrypto` or application-level AES-GCM, and introducing either is a real
>   architectural decision (key management, a migration story for already-written plaintext rows)
>   beyond "Only build the Journal system." This is a genuine, honestly-documented gap, not an
>   oversight — the natural place to add it is a dedicated encryption-at-rest milestone before this
>   feature is exposed to real user data, not a silent extra bundled into this one.
> - **One-morning/one-evening-per-day is a service-layer rule, not a DB constraint** — see
>   `docs/API.md`'s Journal section for why a partial unique index isn't used.
> - **`goalId`/`plannerDayId`** are additive, optional FKs, `onDelete: SetNull` — the same pattern
>   Task/Habit/Routine/PlannerBlock already established for `goalId` in Milestone 9. Journal gains
>   no new `GoalTargetType`; a Goal's "related journal entries" is a display-only query, not a
>   progress input.
> - **Soft delete**, per the milestone brief's own "Journal is never deleted automatically" rule —
>   the same principle this doc already applies to Task/Habit/Goal.
> - **`JournalAttachment`** (`id`, `journalId` FK, `fileName`, `fileType`, `fileSize`, `url`,
>   `createdAt`) is metadata for an already-hosted file, not binary storage — no object-storage
>   provider (S3, Cloudinary, or even local-disk multer) exists anywhere else in this codebase, and
>   introducing one is out of scope for this milestone. Hard delete, like `RoutineStep`/
>   `GoalMilestone` — disposable metadata reached only through its parent.
> - **`JournalPrompt`** (`id`, `code` — one field beyond the milestone's own literal list, added
>   for a stable upsert key exactly like `Achievement.code` — `type`, `question`, `placeholder`,
>   `order`, `active`, `createdAt`) is a data-driven catalog upserted from one TypeScript array at
>   boot, the same pattern this doc's note on `Achievement` already established for Milestone 8.
> - **Indexes**: `(userId, date)` and `(userId, type)` on `JournalEntry` (the dominant "this user's
>   entries in a date range / of a type" query pattern this doc's own Indexing Notes section
>   already anticipates for `JournalEntry`), plus `(userId, date, type)` backing the one-per-day
>   uniqueness check, `(goalId)`, and `(plannerDayId)`. `(journalId)` on `JournalAttachment`;
>   `(type, order)` on `JournalPrompt`.

> **As implemented (Milestone 9 — Goals & Goal Tracking):** the actual `Goal`/`GoalMilestone`
> models follow that milestone's given field list rather than the shape sketched above:
>
> ```
> Goal
>   id                uuid PK
>   userId            FK -> User
>   title             string
>   description        string, nullable
>   icon              string   -- Material icon name, same convention as Habit/Routine
>   color             string   -- hex or design-token name, same convention as Habit/Routine
>   category          string, nullable   -- free text, not an enum — see below
>   priority          enum(LOW, MEDIUM, HIGH, CRITICAL)
>   targetType        enum(TASK_COUNT, HABIT_COMPLETION, ROUTINE_COMPLETION, FOCUS_TIME, CUSTOM)
>   targetValue       int
>   currentValue      int, default 0
>   startDate         date, nullable
>   targetDate        date, nullable
>   status            enum(NOT_STARTED, ACTIVE, PAUSED, COMPLETED, CANCELLED)
>   archived          boolean, default false
>   createdAt / updatedAt / deletedAt
>
> GoalMilestone
>   id                uuid PK
>   goalId            FK -> Goal
>   title             string
>   description        string, nullable
>   dueDate           date, nullable
>   completed         boolean, default false
>   completedAt       timestamp, nullable
>   order             int
>   createdAt / updatedAt
> ```
>
> - **`category` is a free-text string, not this doc's original `GoalCategory` enum** — the
>   milestone brief's own Enums section defines `GoalStatus`/`GoalPriority`/`TargetType` but no
>   category enum, so this follows `Habit.category`'s precedent instead.
> - **`priority`/`targetType`/`targetValue`/`currentValue`/`icon`/`color`/`archived` are all new
>   fields beyond this doc's original sketch** — the milestone brief's given field list for `Goal`
>   is fuller than this doc anticipated, closer in shape to `Habit`'s own field list
>   (icon/color/targetCount-like fields) than to a plain reflection-adjacent record.
> - **`currentValue` is a real, persisted column — not fully derived on every read**, unlike
>   `Streak` (Milestone 8's "do not store, recompute on every read" principle). The milestone
>   brief lists `currentValue` explicitly and allows manual progress updates for `CUSTOM` goals, so
>   `GET /goals`/`GET /goals/:id` return whatever's currently stored, and only
>   `GET /goals/:id/progress` recomputes it from `Task`/`Habit`/`Routine`/`PlannerBlock` source
>   data (for the four automatic `targetType`s) and persists the refresh. See the comment on `Goal`
>   in `prisma/schema.prisma` and `docs/05-architecture.md`'s Milestone 9 note for the full
>   rationale, including why this is a deliberate widening of Milestone 8's principle rather than a
>   reversal of it.
> - **Soft delete, like Task/Habit**: this doc's design principle names `Goal` explicitly, so
>   `deletedAt` is kept — unlike `GoalMilestone`, which follows `RoutineStep`'s hard-delete
>   precedent instead (disposable, recreatable checkpoint content, not named in the soft-delete
>   list, reached only through its parent).
> - **`order` on `GoalMilestone`, not in this doc's original sketch** — the same manual sort key
>   `RoutineStep.order`/`PlannerBlock.order` already use, since a goal's milestones are naturally
>   an ordered checklist. No bulk reorder endpoint exists (unlike Routine's steps) — the milestone
>   brief's given endpoint list doesn't include one, so reordering happens by setting individual
>   `order` values via `PATCH /goals/milestones/:id`.
> - **`Task`/`Habit`/`Routine`/`PlannerBlock` each gained an optional `goalId` FK** (not in this
>   doc's original sketch at all, since Goal's relationship to other entities wasn't scoped until
>   this milestone) — `onDelete: SetNull`, so deleting a Goal detaches its linked items rather than
>   cascading. Each is indexed on `goalId` for the progress-aggregation queries. See
>   `docs/05-architecture.md`'s Milestone 9 note and `docs/API.md`'s Goals section for the full
>   per-`targetType` mapping from these links to `currentValue`.

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

> **As implemented (Milestone 12 — Notification Engine):** `Notification`'s actual field list and
> `NotificationType` enum follow that milestone's own brief rather than this doc's original sketch,
> and `NotificationPreference`/`NotificationQueue` are wholly new tables not sketched here at all:
>
> ```
> Notification
>   id                uuid PK
>   userId            FK -> User
>   title             string
>   message           string
>   type              enum(TASK, HABIT, PLANNER, GOAL, JOURNAL, CALENDAR, STREAK, ACHIEVEMENT, SYSTEM)
>   priority          enum(LOW, NORMAL, HIGH, CRITICAL), default NORMAL
>   status            enum(PENDING, QUEUED, SENT, FAILED, READ, DISMISSED), default PENDING
>   scheduledFor      timestamp
>   deliveredAt       timestamp, nullable
>   readAt            timestamp, nullable
>   payload           json, nullable
>   createdAt / updatedAt
>
> NotificationPreference
>   id                 uuid PK
>   userId             FK -> User, unique (1:1)
>   quietHoursStart    string, nullable   -- "HH:mm", same convention as Habit.reminderTime
>   quietHoursEnd      string, nullable
>   timezone           string, default "UTC"
>   enableTasks/Habits/Planner/Goals/Journal/Calendar/Streaks/Achievements   boolean, default true
>   enableEmail        boolean, default false
>   enablePush         boolean, default false
>   enableInApp        boolean, default true
>   createdAt / updatedAt
>
> NotificationQueue
>   id                uuid PK
>   notificationId    FK -> Notification, unique (1:1)
>   attempts          int, default 0
>   nextAttempt       timestamp, nullable
>   lastError         string, nullable
>   status            string, default "PENDING"   -- plain string, not a new enum; see below
>   createdAt / updatedAt
> ```
>
> - **`NotificationType` is scoped to this codebase's own feature/module set**
>   (TASK/HABIT/PLANNER/GOAL/JOURNAL/CALENDAR/STREAK/ACHIEVEMENT/SYSTEM), not this doc's original
>   reminder-category sketch (WAKE/WATER/MEAL/EXERCISE/PRAYER/MEDITATION/MEETING/TASK/SLEEP/
>   AI_DIGEST) — the milestone brief's own event sources (Tasks/Habits/Planner/Goals/Journal/
>   Calendar/Streaks/Achievements) are what a Notification's `type` needs to distinguish, since
>   `NotificationPreferencesService.isCategoryEnabled` gates creation per-type. A future reminder
>   scheduler (wake/water/meal/etc., still unbuilt) would most naturally map onto the existing
>   `SYSTEM` type or a future additive enum value, not require a schema redesign.
> - **No `channel` column.** This doc's original sketch stored one channel per Notification;
>   Milestone 12 instead resolves channels *at dispatch time* from the user's own
>   `NotificationPreference` (`NotificationDispatcherService.resolveChannels` — always `IN_APP`, plus
>   `EMAIL`/`PUSH` when their own flag is on), since a single Notification can legitimately go out
>   over more than one channel at once, and which channels apply is a per-user setting, not a
>   per-notification fact worth storing redundantly on every row.
> - **`sentAt` renamed `deliveredAt`, plus a new `readAt`** — the milestone's own field list asks for
>   both a delivery instant and a read instant, since `status` alone (which folds delivery lifecycle
>   and read/dismiss state into one field — see the class doc on `Notification` in
>   `prisma/schema.prisma`) doesn't carry timestamps for either transition.
> - **`title`/`message` are new, required fields** — this doc's original sketch had neither;
>   `NotificationTemplateService` builds them from whichever domain event fired, and every list/
>   read/unread endpoint returns them directly rather than requiring the client to synthesize display
>   text from `type`/`payload` itself.
> - **Hard delete, like Routine/PlannerBlock/Calendar** — not named in this doc's soft-delete list;
>   a notification is disposable, re-derivable content (the source event's own record — a Task, a
>   HabitLog, etc. — remains the record of truth), not the irreplaceable content that principle
>   protects.
> - **`NotificationPreference` auto-creates with defaults on first access** (the same "find-or-create
>   on first read" convention `PlannerDay`/`HabitLog` already establish for their own per-user rows),
>   not provisioned at registration — nothing needed it before this milestone. `timezone` is seeded
>   from `User.timezone` at that moment and is its own independent column from then on, the same
>   shape `Calendar.timezone` already uses.
> - **`NotificationQueue` is a single mutable row per Notification, not an append-only log** — unlike
>   `CalendarSync`'s deliberately append-only "one row per sync attempt" design, `attempts`/
>   `nextAttempt`/`lastError`/`status` describe one ongoing retry process for one Notification, so
>   `NotificationQueueService.processDue` rewrites the same row in place across retries rather than
>   inserting a new one each time.
> - **`NotificationQueue.status` is a plain string, not a new enum** — the milestone's own Enums
>   section names only `NotificationType`/`NotificationPriority`/`NotificationStatus` (all three
>   already modeled directly on `Notification`), so, matching the exact precedent `CalendarSync.status`
>   already set, a fourth enum isn't invented for a field the brief didn't ask to be one;
>   `NotificationQueueService` writes and validates one of "PENDING"/"SENT"/"FAILED" on every row.
> - **Indexes**: `(userId, status)`, `(userId, scheduledFor)`, and `(userId, readAt)` on
>   `Notification` — the dominant "this user's notifications, filtered/sorted by delivery or read
>   state" query patterns `NotificationsService.findAll`/`findUnread` run. `(status, nextAttempt)` on
>   `NotificationQueue` backs `NotificationQueueService.processDue`'s own "what's due right now"
>   query.

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
- As implemented (Milestone 9): `Goal` carries `(userId, status)` and `(userId, archived)`; `GoalMilestone` carries `(goalId, order)` for its own list ordering, the same role `RoutineStep`'s `(routineId, order)` plays. `Task`/`Habit`/`Routine`/`PlannerBlock` each gained a plain `(goalId)` index backing the progress-aggregation queries `GoalsService` runs per `targetType`.
- As implemented (Milestone 11): `Calendar` carries `(userId, enabled)`. `CalendarEvent` carries `(calendarId, startTime)` for the Month/Week/Day views' range queries, plus a plain index on each of its four optional cross-link columns (`plannerBlockId`, `taskId`, `goalId`, `journalEntryId`) — the same "index every optional cross-link" convention `goalId` already gets everywhere else. `CalendarSync` carries `(calendarId, createdAt)` for "most recent sync attempt" lookups.
- As implemented (Milestone 12): `Notification` carries `(userId, status)`, `(userId, scheduledFor)`, and `(userId, readAt)` for `NotificationsService.findAll`/`findUnread`'s own filter/sort patterns. `NotificationQueue` carries a unique `(notificationId)` (its 1:1 relation to `Notification`) plus `(status, nextAttempt)` backing `NotificationQueueService.processDue`'s "what's due right now" query. `NotificationPreference` carries a unique `(userId)` for its own 1:1 relation.

## Why this shape

- **Streak is derived state, not the source of truth** — `HabitLog` is the ledger; `Streak` is a maintained rollup updated by the `streak-rollover` job (see architecture doc). This means streaks can always be recomputed/audited from logs if the rollup ever drifts.
- **`ScheduleBlock` is polymorphic-by-reference** (`sourceType`/`sourceId`) rather than duplicating task/habit data into the calendar — a completed task and its calendar block stay in sync automatically, and the calendar can render tasks, habits, and free-standing events uniformly. As implemented (Milestone 7): `PlannerBlock.referenceId` carries this forward exactly, split into `PlannerDay`/`PlannerBlock` — see the note on PlannerDay above.
- **`AiInteraction` doubles as cost telemetry and the "AI engagement rate" metric source** — no separate analytics pipeline needed for that specific success metric.
