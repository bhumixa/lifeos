# Changelog

One entry per milestone, in the order built. Each entry covers what shipped and the
architecture-relevant decisions specific to that milestone — the "why," not a line-by-line diff
(git history is the diff; this is the narrative). Started at Milestone 6; earlier entries are
reconstructed from the codebase where the historical detail is unambiguous, and kept brief where
it isn't.

## Milestone 13 — AI Coach & Personal Insights (2026-07-05)

Strictly read-only AI Coach: backend `modules/ai` (7 endpoints — insights list/get/generate, chat,
conversations list/get/create) composing Tasks/Habits/Planner/Streaks/Goals/Journal/Notifications'
own existing read-only methods into six kinds of insight (Productivity, Habits, Goals, Planner,
Journal, Streaks), plus a turn-by-turn AI Chat backed by the same provider seam. A full frontend
feature (AI Dashboard, AI Insights, AI Chat; 8 components — Insight Card, Insight Feed, Confidence
Badge, Recommendation Card, Chat Window, Chat Message, Conversation List, Insight Filters), and four
new Dashboard widgets (AI Summary/Productivity Trend stat cards, Top Recommendation, Risk Alerts) —
all derived from the existing `GET /ai/insights` call, no dashboard-specific endpoint.

Key decisions:
- **The provider/adapter pattern Calendar (Milestone 11) and Notifications (Milestone 12) already
  established is reused exactly, for its third time**: `AiProvider` (`generateInsight`/
  `analyzeHabits`/`analyzeGoals`/`analyzePlanner`/`analyzeJournal`/`chat`) is the interface every
  backend implements; `MockAiProvider` is the one that does anything real (the same role
  `LocalCalendarProvider`/`InAppChannel` already play among their own siblings), formatting the
  metrics `AiAnalysisService` computed into readable text via `utils/insight-templates.util.ts`.
  `OpenAiProvider`/`AnthropicProvider`/`GoogleAiProvider` all extend a shared
  `PlaceholderAiProvider` base that returns an explicit `NOT_IMPLEMENTED` result — never a thrown
  exception, never a silent no-op — the exact shape `RemoteCalendarProvider`/
  `PlaceholderNotificationChannel` already set. `AiProviderRegistry.getActive()` is hardcoded to
  `MOCK`, per this milestone's explicit "do not connect to a real OpenAI/Anthropic/Google API"
  instruction — no env-driven provider selection exists yet.
- **"AI Coach never modifies data" is enforced by omission, not by a runtime guard**:
  `AiAnalysisService` only ever calls a sibling service's own read-only methods —
  `TasksService.findAll`/`countCompleted`, `HabitsService.summary`, `PlannerService.today`,
  `StreaksService.getOverview`/`getToday`, `GoalsService.findAll`, `JournalService.history`,
  `NotificationsService.findUnread` — and deliberately *never* `StreaksService.getStatistics` or
  `GoalsService.getProgress`, since both of those have a persisting side effect (achievement
  unlocking; a refreshed, written-back `currentValue`) that would make an insight-generation request
  an indirect write. Every metric this milestone needs that no existing method exposes (week-over-
  week completion-rate trends, weekday/hour-of-day distributions, goal schedule-risk) is computed via
  direct, read-only `PrismaService` queries scoped by `userId` inside `AiAnalysisService` itself —
  the same "raw read for a cross-cutting query that doesn't belong to one sibling module's own read
  shape" reasoning Journal/Calendar/Notifications already established for their own optional-link
  ownership checks, applied here to analytics instead of ownership.
- **`StreaksModule`/`GoalsModule` each gained a one-line additive `exports: [...Service]`** — the
  only change to already-shipped modules this milestone makes, and purely additive (no existing
  behavior, test, or consumer changes) — so `AiModule` can import them the same "reuse services,
  don't duplicate the query" way every prior fan-in module (Planner/Streaks/Goals) already does.
  Every other module `AiAnalysisService` reuses (Tasks/Habits/Planner/Journal/Notifications) already
  exported its service for exactly this kind of future reuse.
- **`InsightType` splits into two routing groups**: HABITS/GOALS/PLANNER/JOURNAL each get a
  dedicated `AiProvider` method (matching one owning domain 1:1); PRODUCTIVITY/STREAKS/SYSTEM share
  the general-purpose `generateInsight`, since they're cross-cutting analyses with no single owning
  module. `POST /ai/insights/generate` with no `type` generates one insight for each of the first
  six (SYSTEM excluded — it's a general coaching note reserved for a future explicit use, not
  something auto-generated today).
- **`AiInsight.sourceData` is the metrics payload verbatim, not just a debugging aid** — every
  template function returns `{title, summary, content, confidence}` derived from a `sourceData`
  shape that's also persisted on the row, so the Dashboard's Productivity Trend/Risk Alerts widgets
  read structured numbers (`deltaPercent`, `flags`) directly instead of parsing `content`'s prose.
  `flags: ['risk']` is the one generic, cross-type signal every template sets consistently — the
  Risk Alerts widget filters on it without a dedicated boolean column or per-type parsing rule.
- **`generatedAt` is a separate column from `createdAt`**, even though `MockAiProvider` always
  writes the same instant to both today — a future async real-provider integration could create the
  row when the request is accepted but only set `generatedAt` once the provider actually responds,
  the same reason `Notification` keeps `scheduledFor` distinct from `createdAt`.
- **No delete/dismiss/archive endpoint exists yet** — `InsightStatus` (ACTIVE/ARCHIVED/DISMISSED) is
  modeled and `GET /ai/insights` can filter on it, but nothing in this milestone ever writes
  ARCHIVED/DISMISSED; a documented, not-yet-built seam, the same shape Calendar's
  `recurrence.util.ts`/Notification's `CalendarEventStartingEvent` already established elsewhere.
- **Chat has no persisted system prompt** — `AiPromptService.buildChatSystemPrompt` builds the
  safety/advisory framing fresh on every call and prepends it to the trailing history
  (`AiConversationService`'s own `CHAT_HISTORY_LIMIT`, 20 messages) rather than storing it as an
  `AiMessage` row; `AiRole.SYSTEM` is modeled on the schema for a future provider that might want one
  stored, but nothing writes it today. `MockAiProvider.chat` never claims to have taken an action —
  every reply explicitly frames itself as advisory, per this milestone's "no autonomous actions"
  business rule.
- **Frontend AI Dashboard/Insights/Chat reuse the `AI Coach` nav item already in Milestone 3's
  original list** — like Habits/Journal before it, no nav change was needed, just swapping the
  `FeaturePlaceholder` for a real `loadChildren`. `InsightCard`'s "View details" expands the card in
  place to show `content` alongside `summary` rather than routing to a separate detail page — no
  other consumer of `GET /ai/insights/:id` exists yet to justify one. The Dashboard's
  `AiInsightsPanel` composes AI Coach's own `RecommendationCard` directly (cross-feature component
  reuse, the same precedent Notifications' `NotificationBell` already set for the app shell) rather
  than a second recommendation-rendering implementation.
- **Verification**: 63 new backend unit tests (metrics/template utils, provider registry and
  placeholder-provider behavior, analysis-service business-rule enforcement and cross-user scoping,
  insights-service generate/list/filter/cross-user isolation, conversation-service chat/history/
  cross-user isolation, controller delegation) plus the existing 472 all pass (535 total); 20 new
  frontend unit tests (API service, both stores, display utils, dashboard service) plus the existing
  318 all pass (338 total). Backend and frontend builds, Prisma migration, and Swagger generation all
  verified clean. Live end-to-end verification (Playwright against the running app): registered a
  user, generated all six insights from a blank account (each rendered a graceful "not enough data
  yet" message), logged and completed a habit and regenerated Habits/Streaks insights (correctly
  detected the before-10-AM completion and the new 1-day streak), started and continued an AI Chat
  conversation, confirmed cross-user isolation (a second user gets a 404 on the first user's
  conversation/insights, not a 403), and confirmed the Dashboard's four new AI widgets render with
  real data.
- **Remaining work**: real OpenAI/Anthropic/Google AI provider integrations (all three are
  documented `NOT_IMPLEMENTED` placeholders by design this milestone); a dismiss/archive endpoint for
  `AiInsight` (the `InsightStatus` enum and list-side filtering exist, but nothing writes
  ARCHIVED/DISMISSED yet); an insight-expiry sweep job that actually acts on `expiresAt` (the column
  is written and returned, but no job reads it — `GET /ai/insights` doesn't exclude expired rows
  automatically); the AI Chat page doesn't yet update its own URL to the newly-created conversation
  id after the first message in a brand-new conversation (the conversation itself is created and
  usable, just not reflected in the address bar until the next navigation).

## Milestone 12 — Notification Engine (2026-07-04)

Production-ready, event-driven Notification Engine: backend `modules/notifications` (8 endpoints —
list/unread/preferences get+patch/read/read-all/dismiss/delete) plus a real `EventEmitter2` event
bus (`@nestjs/event-emitter`, the first milestone to actually install and wire it after every prior
milestone since Planner anticipated but declined to), and a full frontend feature (Notification
Center, Notification Settings; 8 components — Bell, Badge, List, Card, Filter, Preferences,
Timeline, Unread Counter). The Navbar's placeholder "No notifications yet." menu is now the real
NotificationBell, and the Dashboard gained two new stat cards (Unread Notifications, Upcoming
Reminders) plus a real Recent Activity feed, replacing its last empty-state-only placeholder.

Key decisions:
- **`EventEmitter2` is finally installed and globally registered** (`EventEmitterModule.forRoot()`
  in `AppModule`) — every milestone since Planner (Milestone 7) flagged "Streaks/Goals reacting to
  a write elsewhere" as the natural first use case, then chose a pull/read-time or raw-Prisma-read
  model instead specifically to avoid modifying already-shipped modules. This milestone makes the
  opposite, and only defensible, call for the same reason those declined: a Notification Engine
  with no real domain-event source would be architecture without substance. The diff to each
  existing service is deliberately the smallest possible — one new constructor parameter
  (`EventEmitter2`), one `this.eventEmitter.emit(...)` call at the point the milestone brief's own
  named event already occurs — with no change to any existing method's return value, validation, or
  side effects. `TasksService.complete`, `HabitsService.createLog`, `PlannerService.complete`
  (guarded to the true-going `completed` transition only), `GoalsService.update` (guarded to the
  explicit transition into `GoalStatus.COMPLETED` only), `JournalService.create`, and
  `AchievementsService.evaluateAndUnlock` (once per newly-unlocked achievement) each gained exactly
  one such emission; every existing test for those services keeps passing unchanged once its own
  `TestingModule` providers array gets the same one-line `{ provide: EventEmitter2, useValue: {
  emit: jest.fn() } }` addition.
- **`CalendarEventStartingEvent` is the one event that stays unemitted** — "a calendar event is
  starting soon" is a time-based condition, not a reaction to a write, so there's no natural call
  site to hang an emission off. The event class, `NotificationSchedulerService`'s `@OnEvent`
  listener for it, and a real, unit-tested `scanUpcomingCalendarEvents` scan method all exist; none
  of it runs automatically yet, the same "documented, tested, never automatically invoked" shape
  Calendar's own `recurrence.util.ts` already established for "recurring event preparation" in
  Milestone 11.
- **Notifications are created exclusively by `NotificationSchedulerService`, never by a
  controller** — there is no `POST /notifications` endpoint at all, per the milestone's own "do not
  deliver notifications immediately inside controllers" rule. Every notification traces back to one
  of the six wired domain events.
- **Preferences gate creation entirely, not just delivery.** `NotificationPreferencesService
  .isCategoryEnabled` is checked before a `Notification` row is even created — a disabled category
  (e.g. `enableHabits: false`) means no row, no queue entry, nothing to ever mark read or dismiss,
  not merely a delivered-but-suppressed notification.
- **Quiet hours push `scheduledFor` later, computed timezone-aware** (`utils/quiet-hours.util.ts`,
  reusing `planner/utils/timezone.util.ts`'s zoned-time helpers directly — the same cross-module
  file-reuse precedent Streaks/Journal/Calendar already set for that file, plus one additive
  export, `getZonedTimeOfDay`, for minute-precision "HH:mm" boundary comparisons `getZonedHour`
  alone couldn't support). A same-day quiet window (e.g. 13:00-14:00) pushes to that same day's end;
  an overnight window (e.g. 22:00-07:00) correctly pushes to the *next* calendar day's end when
  "now" falls on the evening side of it. `start === end` is treated as disabled, not "quiet all day."
- **`NotificationPreference` auto-creates with defaults on first access**, the same "find-or-create
  on first read" convention `PlannerDay`/`HabitLog` already establish for their own per-user rows —
  not provisioned at registration, since nothing needed it before this milestone. `timezone` is
  seeded from `User.timezone` at that moment (an own, independent column from then on), the same
  shape `Calendar.timezone` already uses.
- **`NotificationQueue` is a single mutable row per Notification, not an append-only log** — unlike
  `CalendarSync`'s deliberately-append-only "one row per attempt" design, `attempts`/`nextAttempt`/
  `lastError`/`status` describe one ongoing retry process, so `NotificationQueueService.processDue`
  rewrites the same row in place. Exponential backoff (`utils/retry-backoff.util.ts`, 2 minutes
  doubling, capped at 60) runs for up to `MAX_DELIVERY_ATTEMPTS` (5, a documented placeholder,
  the same "product owner finalizes later" precedent `FreezeDaysService.FREEZE_DAYS_PER_MONTH`
  already sets) before both rows are marked terminally `FAILED`. `processDue` is fully implemented
  and unit-tested but never automatically scheduled — the seam a future `main.worker.ts` background
  process (anticipated since `docs/05-architecture.md`, still unbuilt) would call on an interval.
- **Channel architecture mirrors Calendar's provider pattern exactly** — `INotificationChannel`
  (one method, `send`) is the interface `NotificationDispatcherService` depends on exclusively;
  `InAppChannel` is real (a `Notification` row already *is* the in-app delivery — nothing external
  to do, the same reasoning `LocalCalendarProvider.sync` uses); `EmailChannel`/`PushChannel`/
  `SmsChannel`/`DesktopChannel` all extend a shared `PlaceholderNotificationChannel` base that
  always returns an explicit `NOT_IMPLEMENTED` result, never a thrown exception or silent no-op —
  the same shape `RemoteCalendarProvider` established for Google/Microsoft/Apple/iCal.
  `NotificationChannelRegistry` maps channel type to adapter, the same data-driven-catalog role
  `CalendarProviderRegistry` plays. `NotificationDispatcherService.resolveChannels` always attempts
  `IN_APP`, plus `EMAIL`/`PUSH` only when the user's own preference flag is on; `SMS`/`DESKTOP` have
  no corresponding preference flag in this milestone's literal field list, so they exist in the
  registry as a ready extensibility seam but nothing routes to them yet.
- **A single field (`Notification.status`) carries both the delivery lifecycle
  (PENDING/QUEUED/SENT/FAILED) and the user-driven post-delivery state (READ/DISMISSED)** — matching
  the milestone brief's own literal enum exactly rather than splitting into two columns.
  "Unread" (`GET /notifications/unread`, the unread count) means `readAt: null` *and* `status` not
  `DISMISSED` — a dismissed notification is deliberately hidden from both, the same "dismiss means
  stop showing me this, not I read it" distinction a notification feed needs.
- **Hard delete, like Routine/PlannerBlock/Calendar** — a notification is disposable, re-derivable
  content (the event/source record that produced it is still the record of truth), not named in
  `docs/06-database-design.md`'s soft-delete list.
- **Frontend: `NotificationsStore` is `providedIn: 'root'`, unlike GoalsStore's page-scoped
  equivalent** — it's the one feature store two independent parts of the shell need simultaneously
  (the Navbar's `NotificationBell` for unread count/preview, and the Notification Center page for
  the full filtered list), so a mark-read/dismiss from either place reflects in the other without a
  reload, the same "single source of truth, several consumers" role `AuthService`'s own signals
  already play app-wide.
- **`NotificationBell` lives in `features/notifications/`, not `shared/` or `layout/`, despite being
  mounted in the app shell's Navbar** — it needs live `NotificationsStore` state, so `Navbar`
  imports it directly, the same "layout composes a sibling feature's exported service/component"
  precedent `DashboardCalendarService` already set for cross-feature composition, just applied to
  the shell instead of another feature page.
- **`NotificationTimeline` groups Today/Yesterday/Earlier** — a hand-rolled grouped list (no
  charting/timeline library), matching the exact convention Goals' `GoalTimeline`/Journal's
  `JournalCalendar`/Calendar's `MiniCalendar` already established for this codebase's visuals.
  `NotificationList` is the shared rendering primitive both `NotificationTimeline`'s per-group
  sections and the Dashboard's `RecentActivity` compose (via its `compact` input), rather than two
  separate list implementations.
- **Dashboard's Recent Activity is real for the first time** — it was a pure empty-state placeholder
  since Milestone 3 ("a real activity feed needs the Tasks/Habits/Journal modules first"); now that
  every one of those modules' completions already flows into a Notification, the most recent few
  notifications (via the same `DashboardNotificationsService` composing `GET /notifications/unread`
  and two `GET /notifications` list calls) *are* recent activity across the whole app, with no new
  dashboard-specific endpoint — the same "derived via local composition" shape every prior Dashboard
  service already establishes.
- **Verification**: 73 new backend unit tests (quiet-hours/retry-backoff utils, channel registry and
  placeholder-channel behavior, preferences get-or-create/update/category-gating, queue enqueue and
  all three retry outcomes, core CRUD including cross-user isolation on every mutating endpoint,
  scheduler event-subscriber/preference-gating/quiet-hours/calendar-scan behavior, controller
  delegation) plus the existing 399 all pass (472 total); 27 new frontend unit tests (API service,
  store, display utils, dashboard service) plus the existing 281 all pass (308 total). Backend and
  frontend builds, Prisma migration, and Swagger generation all verified clean.
- **Remaining work**: real Email/Push/SMS/Desktop providers behind their respective channel
  adapters (all four are documented `NOT_IMPLEMENTED` placeholders by design this milestone); a
  background worker process (`main.worker.ts`, still unbuilt) to actually call
  `NotificationQueueService.processDue` and `NotificationSchedulerService
  .scanUpcomingCalendarEvents` on an interval — both are implemented and unit-tested but never
  automatically invoked; `SMS`/`DESKTOP` preference toggles (the channels exist in the registry, but
  no `enableSms`/`enableDesktop` field was added to `NotificationPreference`, since this milestone's
  literal field list doesn't include one).

## Milestone 11 — Calendar & External Integrations (2026-07-04)

Production-ready local Calendar module, architected as the scheduling layer integrating Planner,
Tasks, Goals, and Journal, with external providers built as pluggable adapters rather than actual
integrations: backend `modules/calendar` (11 endpoints — calendar CRUD, event CRUD, sync) plus a
provider-adapter architecture (`ICalendarProvider` interface, `LocalCalendarProvider` fully
functional, `GoogleCalendarProvider`/`MicrosoftCalendarProvider`/`AppleCalendarProvider`/
`IcalCalendarProvider` documented placeholders via a shared `RemoteCalendarProvider` base), and a
full frontend feature (Calendar Dashboard, Month/Week/Day Views, Calendar Settings; 9 components —
Calendar Grid, Event Card, Mini Calendar, Agenda View, Calendar Filters, Event Dialog, Timezone
Selector, Calendar Legend, Drag-and-Drop Event). The Dashboard gained four Calendar widgets
(Today's Events, Upcoming Events, Calendar Overview, Today's Schedule — the last one a merged
Planner-block/Calendar-event timeline reusing `GET /planner/today` directly rather than a new
endpoint).

Key decisions:
- **`Calendar`/`CalendarEvent`/`CalendarSync` are new tables, not a repurposing of `PlannerBlock`.**
  A `Calendar` is a plain user-owned container (the same role Routine/Habit/Goal play), independent
  of Planner's own per-user-per-date `PlannerDay`/`PlannerBlock` model — this milestone explicitly
  asks for Calendar to *integrate* Planner (via an optional `plannerBlockId` link), not replace or
  absorb it. `CalendarEvent` has no `userId` of its own (reached only through `calendar: { userId
  }`, the same pattern `PlannerBlock`/`RoutineStep` already establish); both `CalendarEvent` and
  `Calendar` are hard-deleted (disposable configuration/scheduling data, not the irreplaceable
  content the soft-delete principle protects), while `CalendarSync` is an append-only log — one row
  per sync *attempt*, not a mutable "last known state" row, so a calendar's sync history stays
  inspectable.
- **The four cross-links on `CalendarEvent`** (`plannerBlockId`/`taskId`/`goalId`/`journalEntryId`)
  are modeled identically to every prior optional cross-link in this codebase (Task/Habit/Routine/
  PlannerBlock's `goalId`, JournalEntry's `goalId`/`plannerDayId`): nullable FK, `onDelete: SetNull`,
  ownership validated in `CalendarEventsService` via a raw Prisma existence check rather than
  injecting `TasksService`/`GoalsService`/`PlannerService`/`JournalService` — `CalendarModule`
  imports no sibling feature module at all, the same "compose via raw checks, not DI, to avoid
  depending on a whole module for one id check" reasoning Journal (Milestone 10) already
  established. `onDelete: SetNull` is what makes "deleting linked objects should never delete
  calendar history automatically" true at the database level, not just in application code. Journal
  entries are, per the milestone's own business rule, read-only references — linking one adds no
  write path back into Journal, matching how Journal itself never gained a new `GoalTargetType` in
  Milestone 9.
- **Provider architecture is real code, not a design doc.** `ICalendarProvider` (one method,
  `sync`) is the seam `CalendarSyncService` depends on exclusively; `CalendarProviderRegistry` maps
  `CalendarProvider` (LOCAL/GOOGLE/MICROSOFT/APPLE/ICAL) to its adapter — the same data-driven,
  add-a-line-not-a-branch shape `AchievementsService`/`JournalService` already use for their own
  catalogs. `LocalCalendarProvider.sync` succeeds immediately (nothing external to reconcile); every
  other provider extends `RemoteCalendarProvider`, whose `sync` always returns a `FAILED` result
  with an explicit "not yet implemented" message — chosen over a silent no-op or an unhandled
  exception, so `POST /calendar/sync` against any provider always returns a clean, documented
  result. `IcalCalendarProvider` is one adapter beyond the three the milestone brief names
  explicitly (Google/Microsoft/Apple) — added because `CalendarProvider.ICAL` is a real, creatable
  enum value on `Calendar.provider`, and leaving it unhandled in the registry would mean a legal
  enum value with no adapter at all.
- **Conflict detection and recurrence preparation are the two "Testing" asks this milestone
  actually builds, deliberately scoped narrow.** `conflictsWith` is computed on every read (not
  stored — the same "derived, not persisted" principle Habit/Routine/Goal already apply to their
  own completion percentages), reusing `planner/utils/scheduler.util.ts`'s `hasOverlap`/`Interval`
  helpers directly rather than a second overlap implementation. `modules/calendar/utils/
  recurrence.util.ts`'s `prepareRecurringInstances` is timezone-aware "recurring event preparation"
  (DAILY/WEEKLY/MONTHLY instance expansion from a wall-clock date/time, reusing
  `planner/utils/timezone.util.ts`'s `zonedWallTimeToUtc`/`addDaysToDateString` directly) — not a
  full RRULE engine, since `CalendarEvent` has no persisted recurrence field and nothing calls it
  automatically yet. Both are covered by unit tests, including recurrence across both of
  America/New_York's 2026 DST transitions (March 8 spring-forward, November 1 fall-back).
- **Frontend feature isolation, mirroring Journal's own precedent for cross-feature reuse.**
  `DragDropEvent` is Calendar's own drag-to-move timeline component (CDK, vertical-only, 5-minute
  snapped) rather than importing Planner's `PlannerBlockComponent` — reaching into a sibling
  feature's private `components/` folder would violate `docs/07-folder-structure.md`'s "shared code
  belongs inside `shared/`" rule; cross-feature reuse on the frontend happens by composing a
  sibling's exported *service* (`DashboardCalendarService` calls `PlannerApiService.today()`
  directly for Today's Schedule), not its components. Month View is click-to-open (create/edit);
  Day View is where drag-and-drop actually lives — the same split Planner itself draws between its
  own read-mostly Week View and its richer, drag-enabled Day View, applied here for the same reason
  (Week View's 7 columns are too narrow for meaningful drag placement).
- **`EventDialog`'s "Advanced links" panel is three plain id fields, not full cross-feature
  search-selects** — matching `BlockDialog`'s own precedent of only building a real picker where a
  milestone brief specifically calls for one; this milestone's "Link planner block" verification
  step is already exercised end-to-end by a plain id field. `journalEntryId` is shown read-only when
  already set (per "Journal entries remain read-only references") and isn't offered as a
  create-time input.
- **Verification**: 48 new backend unit tests (calendar/event CRUD, cross-user isolation via
  `calendar: { userId }` joins, all four link-ownership checks, conflict detection including the
  DISABLED-never-conflicts rule, provider abstraction/registry resolving all five providers to
  distinct adapters, and recurrence preparation across both 2026 DST transitions) plus the existing
  351 all pass (399 total); 32 new frontend unit tests (API service, store, display utils,
  `DashboardCalendarService`) plus the existing 249 all pass (281 total). The running backend was
  exercised directly against a live Postgres database via curl — calendar CRUD, event CRUD with all
  four optional links (including 404s for another user's task/goal/planner-block/journal-entry),
  conflict detection on overlapping events, sync against a LOCAL calendar (SUCCESS) and a GOOGLE
  calendar (documented FAILED), and cross-user isolation (a second user gets 404 on another user's
  calendar/event, never their data) — see the Verification section of the milestone report for the
  full transcript.
- **Remaining work**: OAuth and real external API sync for Google/Microsoft/Apple/iCal (explicitly
  out of scope this milestone); push/email notifications for upcoming events (Notifications is its
  own unbuilt module); a persisted recurrence field/engine beyond the "preparation" utility;
  cross-feature search-select pickers in `EventDialog`'s Advanced Links panel (currently plain id
  fields).

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
