# 5. Recommended Software Architecture

## Guiding constraints

- The PRD already prescribes the stack (Angular 20, NestJS, Prisma/PostgreSQL, Redis/BullMQ, Claude+OpenAI, Docker/Railway/Cloudflare/Neon/Upstash) — this architecture works within that, rather than proposing an alternative stack.
- Stated development principles: build feature-by-feature, SOLID, feature-based architecture, reusable components, design for scalability from the start. That points toward a **modular monolith**, not microservices — microservices would violate "build feature by feature" by forcing premature service-boundary and deployment decisions before the product's real scaling bottlenecks are known.

## High-level system diagram

```
┌─────────────────────────────┐        ┌──────────────────────────────────┐
│  Angular 20 PWA (web)        │        │  Capacitor-wrapped iOS/Android    │
│  Cloudflare Pages            │        │  app (same Angular build)         │
└───────────────┬──────────────┘        └───────────────┬──────────────────┘
                │              HTTPS / REST (JSON) + WS         │
                └───────────────────────┬────────────────────────┘
                                         ▼
                          ┌───────────────────────────────┐
                          │   NestJS API (Railway)          │
                          │   Modular monolith               │
                          │   - REST controllers per module  │
                          │   - Auth guards, DTO validation   │
                          │   - Domain event emitter (in-proc)│
                          └───────┬───────────────┬──────────┘
                                  │               │
                     ┌────────────▼───┐   ┌───────▼─────────────┐
                     │ PostgreSQL      │   │ Redis (Upstash/Railway)│
                     │ (Neon), via     │   │ cache, rate-limits,     │
                     │ Prisma ORM      │   │ BullMQ queues           │
                     └─────────────────┘   └───────┬─────────────┘
                                                     │
                                        ┌────────────▼─────────────┐
                                        │ NestJS Worker process     │
                                        │ (Railway, same codebase)  │
                                        │ BullMQ consumers:          │
                                        │  - notifications            │
                                        │  - AI schedule generation   │
                                        │  - streak rollover (cron)   │
                                        │  - analytics aggregation    │
                                        │  - email sending            │
                                        └────────────┬─────────────┘
                                                      │
                                   ┌──────────────────┼───────────────────┐
                                   ▼                  ▼                   ▼
                            ┌────────────┐   ┌────────────────┐  ┌──────────────┐
                            │ Claude API │   │ OpenAI API      │  │ Push/Email    │
                            │ (primary)  │   │ (secondary)     │  │ providers     │
                            └────────────┘   └─────────────────┘  └──────────────┘
```

## Backend: modular monolith, not microservices

One NestJS deployable (plus a worker process sharing the same codebase and Prisma client) with strict module boundaries:

`auth`, `users`, `tasks`, `routines` (Morning/Evening/Custom routine templates — added in Milestone 5, see docs/06-database-design.md's note on Routine), `habits` (Habit/HabitLog — added in Milestone 6, see docs/06-database-design.md's note on Habit), `planner` (PlannerDay/PlannerBlock — added in Milestone 7, see docs/06-database-design.md's note on PlannerDay), `streaks`, `journal`, `goals`, `calendar`, `notifications`, `ai-coach`, `analytics`, `gamification`, `subscriptions`, `admin`.

**Why not microservices at MVP:** the product's modules are highly relational (a completed task affects streaks, which affects XP, which affects badges, which affects the dashboard) — splitting these into separate services now would mean distributed transactions and network calls for what are currently simple in-process operations. Extract a service only when a concrete scaling or team-ownership need appears (the AI-coach module, being the most latency/cost-sensitive, is the most plausible first candidate to extract later).

**Internal structure per module** (keeps SOLID/DIP, as the PRD's dev principles require):
- `*.controller.ts` — HTTP boundary, DTO validation (`class-validator`), no business logic.
- `*.service.ts` — business logic, orchestration.
- `*.repository.ts` (or direct Prisma in service for simple modules) — data access, isolated so the ORM can be mocked in tests.
- `interfaces/` — abstractions for anything swappable, most importantly an `AiProvider` interface with `ClaudeAdapter` and `OpenAiAdapter` implementations, and a `NotificationChannel` interface with `PushAdapter` / `EmailAdapter` implementations. This is what makes "Claude API + OpenAI API" and "push + email" pluggable without leaking provider specifics into business logic.

## Cross-module communication

Use NestJS's in-process `EventEmitter2` for domain events rather than direct service-to-service calls for side effects:

```
TaskCompletedEvent → streaks.service (update streak)
                    → gamification.service (award XP, check badges)
                    → analytics.service (increment daily stats)
```

This keeps `tasks` module ignorant of streaks/gamification (SOLID's dependency inversion), and makes each side effect independently testable. If any of these steps later need to be async/expensive, converting the listener to enqueue a BullMQ job is a small, localized change.

**Milestone 7's Planner module doesn't use this pattern, on purpose.** `EventEmitter2` still isn't
installed anywhere in the codebase — the pattern above describes future async *side effects*
(module A's write triggers module B's write), which Planner doesn't have: `POST /planner/generate`
needs a synchronous *read* of current Task/Routine/Habit state to build a schedule, not a reaction
to one of them changing. It gets that by importing `TasksModule`/`RoutinesModule`/`HabitsModule`
and injecting their exported services directly — the same "reuse services" rule this doc states
elsewhere, just applied to a read instead of a write. `EventEmitter2` remains the right tool for
whichever future module first needs an actual write-triggers-write side effect (Streaks reacting
to `HabitLog` changes is still the most likely first candidate — see docs/09-roadmap.md).

**Per-user timezone handling also starts here, for the first time.** `User.timezone` has existed
since Milestone 2 but nothing consumed it until Planner — Habit/Routine's own period/window logic
runs in server-local (effectively UTC) time (see their schema comments). `POST /planner/generate`
and `GET /planner/today` need "what day/instant is it for this user" to be genuinely
timezone-aware, since a naive UTC cutoff mis-schedules a user's day by their UTC offset. This is
done with `Intl.DateTimeFormat` (`modules/planner/utils/timezone.util.ts`) rather than adding a
date-library dependency (date-fns-tz, luxon) — the two operations Planner needs ("what's today in
zone X" and "what UTC instant is 9am local on this date") are narrow enough that the built-in
IANA-tz-aware `Intl` API covers them, verified against both of 2026's America/New_York DST
transitions in `timezone.util.spec.ts`.

**Milestone 8 (Streak Engine) reuses `planner/utils/timezone.util.ts` directly, plus one
additive export.** This is the second module needing per-user timezone math (the first genuine
reuse of that file across a module boundary via a plain file import, not through the owning
module's exported service — these are pure functions with no DI/state needs, so there's nothing
to inject). One new function was added to the same file, `getZonedHour`, so the Morning
Warrior/Night Owl achievements can classify a `HabitLog`'s local hour-of-day; every existing
export is untouched.

**Milestone 8 also does *not* introduce `EventEmitter2`, despite the paragraph above naming
"Streaks reacting to `HabitLog` changes" as the most likely first real candidate.** Wiring that up
would mean modifying `HabitsService`/`TasksService`/`PlannerService` to emit completion events —
a real (if small) change to already-shipped, approved modules, which this milestone's "do not
modify existing functionality unless absolutely necessary" instruction weighs against. Instead,
`StreaksService`/`AchievementsService` use a **pull, not push** model: `AchievementsService
.evaluateAndUnlock` runs as a side effect of `GET /streaks/statistics` (the one endpoint that
already computes every input every achievement condition needs — XP totals, longest streak,
perfect week/month, morning/night counts), persisting a `UserAchievement` row the first time a
condition is caught true. Every completion count needed for that (`TasksService.countCompleted`,
`PlannerService.countCompletedBlocks`) is a small additive export on the existing service, not a
new query path bypassing it — the same "reuse services" rule applied to a read rather than a
write, exactly like Planner's own precedent above. This is sufficient for every required GET
endpoint; the one trade-off is that achievements whose condition can go true-then-false again
(`PERFECT_WEEK`/`PERFECT_MONTH`) are only guaranteed to unlock if `GET /streaks/statistics`
happens to be called while the condition holds, rather than the instant it becomes true — an
acceptable best-effort result for a foundation milestone given the Dashboard already calls that
endpoint on every load. `EventEmitter2` remains un-installed; a future milestone wanting
instant, push-driven achievement-unlock notifications (e.g. a toast the moment a streak hits 7
days) is still the natural place to introduce it, exactly as this doc originally anticipated.

**`StreaksModule` does not import `HabitsModule`**, unlike Planner's imports of
Tasks/Routines/Habits. `Habit`/`HabitLog` are the Streak Engine's own primary domain — the
milestone brief is explicit that `HabitLog` is the system's source of truth — so `StreaksService`
queries them directly via `PrismaService`, the same way `HabitsService` itself does, rather than
through another service's read endpoints. None of `HabitsService`'s existing reads
(`today`/`summary`/`history`) expose the unbounded multi-day, multi-habit log range the
streak/consistency math needs; adding one whose only caller would be Streaks isn't any clearer
than Streaks owning its own narrow, read-only query over a table this milestone is specifically
about.

**Milestone 9 (Goals) imports `TasksModule`/`HabitsModule`/`RoutinesModule`/`PlannerModule` — all
four — the widest fan-in of any module so far**, since a Goal's progress can come from any of the
four "contributes automatically" sources named in the milestone brief. `GoalsService` follows the
exact same composition shape `StreaksService` already established: batch-fetch via each owning
service's own small, additive, ownership-scoped method
(`TasksService.countCompletedByGoal`, `HabitsService.countLogsByGoal`,
`RoutinesService.getStepIdsByGoal` + `PlannerService.countCompletedBlocksByReferenceIds` for
`ROUTINE_COMPLETION`'s two-hop lookup, `PlannerService.sumCompletedDurationByGoal`), never
Prisma-querying another module's table directly. Unlike Streaks, Goals' own domain (`Goal`/
`GoalMilestone`) has nothing *else* reusing it yet, so `GoalsModule` exports nothing.

**`Task`/`Habit`/`Routine`/`PlannerBlock` each gained a small, additive, optional `goalId` column**
so they can opt into contributing to a Goal — the reverse direction of the fan-in above. Validating
that a client-supplied `goalId` belongs to the requesting user happens as a **raw Prisma existence
check inside each of those four services** (`assertGoalOwnership`), not by injecting `GoalsService`
— `GoalsModule` already imports all four of theirs, so importing `GoalsModule` back into any of
them would be circular. This is the same "ownership check without owning the relationship" pattern
`PlannerBlock.referenceId` already uses for Task/RoutineStep/Habit ids (no FK constraint, since the
referenced table depends on context) — except `goalId` *is* a real FK here, because unlike
`referenceId` it only ever points at one table.

**Goals does not introduce `EventEmitter2` either, for the same reason Streaks didn't**: wiring
"Task completed → recompute linked Goal's progress" as a push event would mean modifying
`TasksService`/`HabitsService`/`RoutinesService`/`PlannerService` to emit completion events — a
real change to four already-shipped, approved modules. Instead, `GoalsService.getProgress` (`GET
/goals/:id/progress`) is an explicit **pull**, called on demand rather than triggered by a write
elsewhere. This is a deliberate step *beyond* Streaks' own pull model, though: Streaks recomputes
everything on every `GET`, fully derived and never stored; Goals persists `currentValue` and only
refreshes it when `/progress` is explicitly called (see the class doc on `Goal` in
`prisma/schema.prisma`) — cheaper for `GET /goals` list views, at the cost of `currentValue`
potentially lagging behind source data until the next explicit refresh. A future milestone wanting
Goals to stay live without an explicit refresh call is the natural next place to introduce
`EventEmitter2`, exactly as this doc has anticipated since Milestone 7.

**Milestone 10 (Journal) is the first module with zero sibling-module imports**, despite reading
from Habits/Streaks/Planner and linking to Goals — every prior fan-in module (Planner, Streaks,
Goals) imports the services it composes; Journal instead composes them **entirely on the
frontend**. The Evening Journal page calls `GET /habits/summary` and `GET /streaks/today` directly
via those features' own existing `HabitApiService`/`StreaksApiService` (already exported for their
own feature pages), the Planner Dashboard links straight to `/journal`, and Goal Detail's "related
journal entries" panel calls `GET /journal/search?goalId=` via `JournalApiService`. This is the
same "one/two endpoint(s), several derived widgets, no new dashboard-specific endpoint" shape the
Dashboard's own `DashboardGoalsService`/`DashboardRoutineSummaryService` already establish —
applied here to feature *pages* composing each other's APIs, not just the main Dashboard. It works
specifically because none of Journal's integrations need a *write* to cross a module boundary
(unlike Goals' `goalId` reverse-links, which are real FKs written by Task/Habit/Routine/PlannerBlock
themselves) — Journal only ever *reads* other modules' data or is *read by* them, so there's no
ownership-validation or circular-import concern to solve with backend composition at all. `goalId`/
`plannerDayId` on `JournalEntry` itself follow the established pattern exactly:
`assertGoalOwnership`/`assertPlannerDayOwnership` are raw Prisma existence checks inside
`JournalService`, not injected services, the same "ownership check without owning the relationship"
precedent Milestone 9 already set.

**`JournalModule` exports `JournalService`** despite having no current importer — a deliberate,
forward-looking seam for a future AI Coach module (the roadmap's own Phase 4, and this milestone's
explicit "build with future AI in mind, don't implement it" instruction) to inject and read a
user's journal history as coaching context, the same "export for reuse" convention Tasks/Routines/
Habits/Planner already established before anything actually imported some of them.

**No new `GoalTargetType` was added for Journal.** The milestone brief doesn't ask Journal entries
to count toward a Goal's automatic progress, so `JournalEntry.goalId` is display-only (Goal Detail
lists related entries) — symmetric with, but functionally simpler than, the four-source fan-in
Goals already has for Task/Habit/Routine/Planner.

**No field-level encryption for `JournalEntry.content`/`mood`** — flagged as a real, honest
deviation from `docs/06-database-design.md`'s own design principle naming those two fields for
encryption at rest, not an oversight. See that doc's Milestone 10 note for the full rationale.

**Milestone 11 (Calendar) imports no sibling module either — the second module, after Journal, to
compose entirely via raw ownership checks rather than backend DI.** `CalendarEventsService`
validates its four optional cross-links (`plannerBlockId`/`taskId`/`goalId`/`journalEntryId`) with
the same `assertGoalOwnership`-shaped raw Prisma existence check every prior optional link already
uses, not by injecting `TasksService`/`GoalsService`/`PlannerService`/`JournalService` — there's no
write crossing a module boundary here either (Calendar only *references* other modules' rows via
nullable FK, it never writes to them), so the same reasoning Journal's note above gives applies
unchanged. On the frontend, `DashboardCalendarService` composes `CalendarApiService` with
`PlannerApiService.today()` directly (reused, not re-implemented) for the Dashboard's "Today's
Schedule" widget — the same "compose a sibling's exported service, not its internal components"
rule, with one addition this milestone establishes: `DragDropEvent` is Calendar's own drag-to-move
component rather than an import of Planner's `PlannerBlockComponent`, since reaching into a sibling
feature's `components/` folder (as opposed to its exported service) would violate the folder
structure doc's feature-isolation rule below.

**Provider architecture — this codebase's first working interface+adapter pattern.**
`docs/05-architecture.md` (this section, historically) anticipated an `AiProvider`
(`ClaudeAdapter`/`OpenAiAdapter`) and a `NotificationChannel` (`PushAdapter`/`EmailAdapter`) using
this shape, but neither has been built yet. Calendar's `ICalendarProvider` (`LocalCalendarProvider`,
`GoogleCalendarProvider`/`MicrosoftCalendarProvider`/`AppleCalendarProvider`/`IcalCalendarProvider`
via a shared `RemoteCalendarProvider` base, resolved through `CalendarProviderRegistry`) is the
first of these three to actually exist in code — a template for how the AI/Notification providers
can be structured once those modules are built: one small interface, a registry keyed by an enum,
and adapters that are safe to call even when unimplemented (`RemoteCalendarProvider.sync` always
returns a documented `FAILED` result, never a thrown exception or a silent no-op).

**Milestone 12 (Notification Engine) is the second of these three providers to actually exist in
code, and the first module to genuinely need `EventEmitter2`.** `INotificationChannel`
(`InAppChannel` real; `EmailChannel`/`PushChannel`/`SmsChannel`/`DesktopChannel` all extending a
shared `PlaceholderNotificationChannel` base, resolved through `NotificationChannelRegistry`)
follows Calendar's own provider template exactly — see `modules/notifications/channels/` and
`docs/API.md`'s Notifications section for the full shape. `AiProvider` remains the one provider of
the original three still unbuilt.

**`EventEmitter2` is finally installed and globally registered** (`EventEmitterModule.forRoot()` in
`AppModule`) — every milestone since Planner (Milestone 7) named "a write elsewhere triggering a
reaction" as the natural first use case, then chose a pull-based read-time computation (Streaks'
`AchievementsService.evaluateAndUnlock`, Goals' explicit `/progress` refresh) or a raw-Prisma-read
composition (Journal, Calendar) instead, specifically to avoid modifying already-shipped modules for
a foundation milestone that didn't strictly need push-based events to satisfy its own required
endpoints. A Notification Engine is the first milestone whose *entire reason to exist* is reacting
to what other modules do — an event bus with nothing wired to emit into it would be architecture
without substance, so this is the one milestone where "modify existing modules" is the correct,
minimal-diff call rather than the one every predecessor correctly declined. The diff to each
existing service is deliberately the smallest possible: one new constructor parameter
(`EventEmitter2`), one `this.eventEmitter.emit(...)` call at the exact point the milestone brief's
own named event already occurs, no change to any existing method's return value or behavior.
`TasksService.complete`, `HabitsService.createLog`, `PlannerService.complete` (guarded to the
true-going `completed` transition), `GoalsService.update` (guarded to the explicit transition into
`GoalStatus.COMPLETED`), `JournalService.create`, and `AchievementsService.evaluateAndUnlock` (once
per newly-unlocked achievement) each gained exactly one such emission — see `docs/changelog.md`'s
Milestone 12 entry for the full list and why each call site was chosen. `CalendarEventStartingEvent`
is the one named event that stays unemitted: "an event is starting soon" is a time-based condition,
not a reaction to a write, so it has no natural call site — `NotificationSchedulerService
.scanUpcomingCalendarEvents` is a real, unit-tested method that would emit it on a periodic scan,
but nothing calls that method automatically yet (see the note on background processing below).

**Notifications are created exclusively by `NotificationSchedulerService`'s `@OnEvent` handlers,
never by a controller** — there is no `POST /notifications` endpoint, per this milestone's own "do
not deliver notifications immediately inside controllers" rule. Each handler: skips entirely if
`NotificationPreferencesService.isCategoryEnabled` says the user has that event's category disabled
(no row is created at all, not merely suppressed after the fact); computes `scheduledFor` via
`utils/quiet-hours.util.ts` (timezone-aware, reusing `planner/utils/timezone.util.ts`'s zoned-time
helpers directly, plus one additive export `getZonedTimeOfDay` for minute-precision comparisons);
then creates the `Notification` row and immediately enqueues it (`NotificationQueueService.enqueue`)
rather than delivering synchronously. `NotificationQueueService.processDue` — implemented and
unit-tested, draining due rows via `NotificationDispatcherService` with exponential backoff on
failure — is never invoked automatically in this milestone, the same "documented, tested,
not-yet-scheduled seam" shape Calendar's own `recurrence.util.ts` already established; see the note
on background processing immediately below for where it belongs once one exists.

**Milestone 13 (AI Coach & Personal Insights) is the third module to use the provider/adapter
shape this doc anticipated since early milestones, and the first one built as a strictly read-only
analysis layer rather than a feature that writes its own domain's data.** `AiProvider`
(`generateInsight`/`analyzeHabits`/`analyzeGoals`/`analyzePlanner`/`analyzeJournal`/`chat`) follows
`ICalendarProvider`/`INotificationChannel`'s exact template: one small interface, a registry
(`AiProviderRegistry`) keyed by name, and adapters safe to call even when unimplemented.
`MockAiProvider` is the one that does anything real — it never calls an external API; it
deterministically formats the metrics `AiAnalysisService` computed into readable text
(`utils/insight-templates.util.ts`), which is what this milestone's "analysis engine" actually is:
real statistical analysis over the user's own data, presented through a provider-shaped seam so a
real LLM can drop in later without `AiInsightsService`/`AiConversationService` changing at all.
`OpenAiProvider`/`AnthropicProvider`/`GoogleAiProvider` all extend a shared `PlaceholderAiProvider`
base (mirroring `PlaceholderNotificationChannel`/`RemoteCalendarProvider` exactly) that always
returns an explicit `NOT_IMPLEMENTED` result — never a thrown exception, never a silent no-op.
`AiProviderRegistry.getActive()` is hardcoded to `MOCK`, per this milestone's explicit instruction
not to connect to a real OpenAI/Anthropic/Google API; there is no env-driven provider selection.

**"AI Coach never modifies data" is enforced by what `AiAnalysisService` chooses to call, not by a
runtime guard.** It composes `TasksService`/`HabitsService`/`PlannerService`/`StreaksService`/
`GoalsService`/`JournalService`/`NotificationsService` — the seven domains this milestone's own
"generate insights from" list names — but only ever through each service's own read-only methods
(`findAll`, `summary`, `today`, `getOverview`, `getToday`, `history`, `findUnread`, `countCompleted`,
and similar). It deliberately never calls `StreaksService.getStatistics` (which evaluates and
persists newly-unlocked achievements as a side effect, per Milestone 8) or `GoalsService.getProgress`
(which persists a refreshed `currentValue`, per Milestone 9) — both are genuine reads from a
caller's perspective, but both write, and this milestone's own business rules rule out even an
*indirect* write from generating an insight. `StreaksModule`/`GoalsModule` each gained a one-line
additive `exports: [...Service]` — the only change to already-shipped modules this milestone makes,
purely additive with no behavior change for any existing consumer — so `AiModule` can import them
the same "reuse services, don't duplicate the query" way Planner/Streaks/Goals already do for each
other. Every metric this milestone needs that no existing service method exposes (week-over-week
completion-rate trends, weekday/hour-of-day distributions, a goal's schedule-risk relative to its
target date) is computed via direct, read-only `PrismaService` queries scoped by `userId` inside
`AiAnalysisService` itself — the same "raw read for a cross-cutting query that doesn't belong to
one sibling module's own read shape" reasoning Journal/Calendar/Notifications already established
for their own optional-link ownership checks, extended here from ownership checks to analytics.

**`InsightType` splits into two routing groups on `AiProvider`.** HABITS/GOALS/PLANNER/JOURNAL each
map 1:1 to a dedicated method; PRODUCTIVITY/STREAKS/SYSTEM are cross-cutting (no single owning
module) and share the general-purpose `generateInsight`. `AiInsightsService.generate` with no
`type` requested generates one insight for each of the first six — SYSTEM is excluded, reserved for
a future coach-level notice this milestone doesn't need.

**AI Chat reuses the same provider seam, not a separate one.** `AiConversationService.chat` resolves
or creates an `AiConversation`, persists the user's `AiMessage`, calls `provider.chat()` with the
trailing history (`AiPromptService.buildChatMessages` prepends a fresh SYSTEM-role safety/advisory
prompt on every call rather than persisting one), and persists the assistant's reply.
`MockAiProvider.chat` never claims to have taken an action on the user's behalf — every reply
explicitly frames itself as advisory only, per this milestone's "no autonomous actions" rule. The
only writes this whole module ever performs, in total, are to its own `AiInsight`/`AiConversation`/
`AiMessage` tables.

**Milestone 14 (Analytics, Reports & Life Insights) is the widest read-only fan-in in this
codebase, one wider than AI Coach's own seven, and the fourth module to use the provider/adapter
shape this doc has anticipated since Calendar.** `AnalyticsService` composes `HabitsService`/
`GoalsService`/`StreaksService`/`JournalService`/`NotificationsService`/`CalendarEventsService`/
`AiInsightsService` — every one already exported by its own module except Calendar/AI, which each
gained the same one-line additive `exports: [...]` Streaks/Goals already got for AI Coach (no other
existing behavior changed). `TasksModule`/`PlannerModule` are deliberately not imported:
`AnalyticsService` reads the `Task`/`PlannerBlock`/`PlannerDay` tables directly via the
globally-registered `PrismaService` for its own arbitrary-date-range time series — the same "raw
read for a cross-cutting query no existing method exposes" reasoning `AiAnalysisService` already
established for its own equivalents, extended here from a fixed 14-day trend window to any
DAY/WEEK/MONTH/YEAR range a caller requests. "Analytics never modifies data" is enforced the exact
same way AI Coach's own rule is: every sibling-service call is a plain read, never
`StreaksService.getStatistics`/`GoalsService.getProgress` (both persist a side effect) — the only
writes anywhere in this module are `AnalyticsSnapshotService`'s own cache rows and
`AnalyticsExportService`'s own `AnalyticsExport` rows.

**`AnalyticsSnapshot` is this milestone's implementation of the database-design doc's long-sketched,
never-built `DailyStat`** (see that doc's own note) — an optional read-through cache in front of
`AnalyticsService.computeTodayScores`, not a second source of truth: `AnalyticsSnapshotService
.getOrCreateToday` reads a row if present (cache hit, no aggregation runs) and otherwise computes
the same scores fresh and persists them (cache miss, then warm), so a missing/deleted row is never
a correctness bug, only a slower read — the same "derived, not stored, but may be cached" spirit
Milestone 8's Streak Engine established for its own numbers, applied here with an actual cache
table since Overview's aggregation (seven sibling-service calls) is meaningfully more expensive than
a single streak recomputation. A concurrent create/create race is caught (`P2002`) and resolved by
reading back the winning row rather than surfacing a 500 — the same "documented, accepted
concurrency edge case" spirit Journal's own one-entry-per-day check already accepts.

**Export pipeline is the fourth provider/adapter implementation** (`ICalendarProvider` →
`INotificationChannel` → `AiProvider` → `ExportGenerator`), resolved through
`ExportGeneratorRegistry` exactly like its predecessors: `CsvExportGenerator`/`JsonExportGenerator`
are the two that "do anything real"; `PdfExportGenerator` extends `PlaceholderExportGenerator`,
which always returns an explicit `NOT_IMPLEMENTED` result — never a thrown exception, never a
silent no-op — per this milestone's own "architecture only for PDF" instruction. A successful
CSV/JSON generation is written to this backend's local `exports/<userId>/` directory (no
S3/Cloudinary provider exists anywhere in this codebase, the same "don't add object storage
without justification" call `JournalAttachment` already made) and the same content is returned
inline in the `POST /analytics/export` response — there is no separate download endpoint in this
milestone's own literal endpoint list.

## Background processing (BullMQ + Redis)

A **separate worker process** (same repo, `main.worker.ts` entrypoint, deployed as a second Railway service) consumes queues so slow/scheduled work never blocks API request latency:

| Queue | Trigger | Job |
|---|---|---|
| `notifications` | scheduled reminders (wake/water/meals/exercise/prayer/meditation/meetings/tasks/sleep) | send push/email at the right time, per user timezone |
| `ai-schedule-gen` | user requests AI-generated schedule | call AI provider, persist result, notify client |
| `streak-rollover` | cron, per-user local midnight | evaluate missed days, update streak/recovery state |
| `analytics-rollup` | nightly cron | precompute daily/weekly/monthly aggregates |
| `email` | password reset, digests | transactional email send |

**Per-user local midnight** matters: a single global cron at UTC midnight will incorrectly roll over streaks for non-UTC users. The worker should schedule/evaluate rollover per user timezone (stored on `User`), not as one global job.

**As implemented (Milestone 12):** `main.worker.ts` and BullMQ/Redis-backed queues are still
unbuilt — no queue package is installed anywhere in this codebase yet. The `notifications` queue's
future job bodies already exist as plain, directly-callable, unit-tested methods rather than
speculative infrastructure: `NotificationQueueService.processDue` (drain due `NotificationQueue`
rows and dispatch each) and `NotificationSchedulerService.scanUpcomingCalendarEvents` (scan
`CalendarEvent` for ones starting soon and emit `CalendarEventStartingEvent` for each) are exactly
the two job bodies a future `notifications` BullMQ processor would call on an interval — see
`docs/API.md`'s Notifications section. Wiring an actual `@nestjs/schedule`/BullMQ cron trigger
around them is deliberately left to the milestone that introduces real background processing,
rather than bolted on speculatively here.

## Real-time updates (optional, MVP-light)

AI schedule generation and some background jobs are not instant. Recommend a NestJS WebSocket gateway (or Server-Sent Events) so the dashboard can reflect "AI is generating your schedule…" → "done" without polling. Simple polling is an acceptable MVP fallback if WS adds too much scope.

## Security architecture

- **Auth**: JWT access token (short-lived, ~15 min) + rotating refresh token (long-lived, stored hashed server-side so it can be revoked; delivered via httpOnly secure cookie on web, secure storage on mobile).
- **Rate limiting**: NestJS `ThrottlerModule` at the edge for all endpoints; a separate Redis token-bucket specifically for AI endpoints, scoped per user tier (Standard vs. Premium) — this is the primary defense against the "unlimited AI requests" cost risk.
- **Validation**: every controller uses DTOs with `class-validator`; global `ValidationPipe` with whitelist/forbidNonWhitelisted.
- **Sensitive data**: journal `content` and `mood` encrypted at rest (application-level AES-GCM with a key from a secrets manager, or Postgres `pgcrypto`) given how personal this data is.
- **Transport/headers**: `helmet`, strict CORS allow-listing the frontend origin(s) only.
- **Admin actions**: every admin mutation writes an `AdminAuditLog` row (who, what, on whom, when).

## Deployment topology

- **Frontend**: Angular build → static assets → Cloudflare Pages (web/PWA). Same Angular codebase built through Capacitor for iOS/Android app store artifacts.
- **Backend API + Worker**: two Railway services from one Docker image (different entrypoints/commands), so they scale independently — the API scales with request volume, the worker scales with queue depth.
- **Database**: Neon PostgreSQL (serverless Postgres — branching is useful for PR preview environments and safe migration testing).
- **Cache/queue**: Upstash Redis for caching and rate-limit counters. **Validate BullMQ compatibility early** — if Upstash's connection model doesn't support BullMQ's blocking commands reliably, run a small Railway-hosted Redis dedicated to queues instead, keeping Upstash for pure caching.
- **CI/CD**: GitHub Actions — lint + typecheck + unit tests + build on every PR; deploy to staging on merge to `main`; manual promotion to production.

## Observability

- Structured logging (Pino) in NestJS, correlation ID per request.
- Error tracking (Sentry) on both frontend and backend.
- AI usage/cost logged per request (provider, tokens, latency) into an `AiInteraction` table — this doubles as the data source for the "AI engagement rate" success metric and for cost auditing.
