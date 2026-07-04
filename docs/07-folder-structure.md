# 7. Recommended Folder Structure

## Repository layout: monorepo

Recommend a single monorepo (Nx or Turborepo — either works; Nx has stronger Angular/NestJS generator support) with a shared package for cross-cutting TypeScript types, since both frontend and backend are TypeScript and will share DTOs (Task, Habit, Goal shapes, etc.) that should not drift out of sync.

```
lifeos/
├── apps/
│   ├── frontend/         # Angular 20 app
│   ├── backend/          # NestJS API + worker
├── packages/
│   └── shared-types/     # DTOs/interfaces shared FE <-> BE
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── docs/                 # this documentation
├── docker-compose.yml    # local Postgres + Redis for dev
├── .github/workflows/    # CI/CD
└── package.json          # workspace root
```

If a monorepo tool is overkill for the team size, two separate repos (`lifeos-frontend`, `lifeos-backend`) with a manually-published or copy-synced shared types package is an acceptable fallback — but the shared-types boundary should exist either way.

## Frontend (`apps/frontend/`) — Angular 20, feature-based

```
src/
├── app/
│   ├── core/                    # app-wide singletons, loaded once
│   │   ├── auth/                 # auth guard, guest guard, token interceptor, auth state (signals)
│   │   ├── layout/                # shell-wide UI state: sidenav/drawer signals, breadcrumb builder
│   │   └── services/             # api-client base, config, health check
│   ├── shared/                   # reusable, presentational only — no feature logic
│   │   ├── components/           # breadcrumb, stat-card, feature-placeholder, ...
│   │   ├── directives/
│   │   ├── pipes/
│   │   └── ui/                   # design-system wrapper around Angular Material + Tailwind tokens
│   ├── layout/                   # shell, navbar, sidenav, auth-layout, mobile drawer
│   ├── features/
│   │   ├── auth/                 # login, register, password reset (UI-only), google oauth callback
│   │   ├── dashboard/
│   │   ├── planner/               # daily/weekly/monthly planning, time blocking, templates
│   │   ├── tasks/
│   │   ├── routines/               # Morning/Evening/Custom routines, drag-and-drop step ordering
│   │   ├── habits/
│   │   ├── streaks/
│   │   ├── journal/
│   │   ├── goals/
│   │   ├── calendar/
│   │   ├── notifications/
│   │   ├── ai-coach/
│   │   ├── analytics/
│   │   ├── gamification/
│   │   ├── settings/
│   │   └── admin/                 # admin-only, separately lazy-loaded + role-guarded
│   ├── app.routes.ts              # top-level routes, each feature lazy-loaded
│   └── app.config.ts
├── assets/
├── environments/
└── styles/                        # Tailwind config, theme tokens (light/dark)
```

**Deviations from the plan above, made during implementation:**
- `core/interceptors/` was folded into `core/auth/` — the only interceptor built so far (attaching/refreshing the access token) is inherently auth-specific, not a generic cross-cutting concern. A true cross-cutting interceptor (e.g. a future global error-toast) would still get its own `core/interceptors/`.
- `core/layout/` was added (not in the original plan) once shell-wide state (sidenav collapse, mobile drawer, breadcrumbs) needed a home distinct from `core/services/`'s generic API clients.
- **Placeholder pattern**: nav sections whose feature module doesn't exist yet (Tasks, Routines, Habits, Schedule, Streaks, Goals, Journal, and Calendar have since been built; AI Coach, Analytics, Settings remain placeholders as of Milestone 11) route to one shared `shared/components/feature-placeholder/`, driven by route `data`, rather than each getting an empty `features/<name>/` folder. Each gets its real feature folder (matching the per-feature convention below) when its milestone starts.
- **Milestone 5 (Routines)** added a nav item (`Routines`, in `layout/sidenav/nav-items.ts`) that wasn't part of the original 8-item nav list from Milestone 3 — the module wasn't planned for at that point. Its `features/routines/` follows the per-feature convention below, plus a `components/routine-step-form-dialog/` (add/edit a single step — presentation-only, no API calls of its own) alongside the list/detail/editor pages.
- **Milestone 6 (Habits)** reused the `Habits` nav item that was already in Milestone 3's original list (unlike Routines, no nav change was needed). `features/habits/` follows the per-feature convention below with four pages (list/detail/today/history — see the backend section's note on `modules/habits/` for why "today" and "history" are dedicated endpoints rather than client-side filters) and six new reusable components (`habit-card`, `habit-progress-ring`, `habit-calendar-heatmap`, `habit-completion-button`, `habit-statistics-card`, `habit-filter-panel`); a seventh from the brief, "Habit Empty State", is deliberately *not* a new component — it reuses `shared/components/empty-state/empty-state`, per this milestone's explicit "do not duplicate code" instruction, since Task/Routine already established that shared component as the presentational empty-state pattern.
- **Milestone 8 (Streaks)** added a new nav item (`Streaks`, like Routines before it — no pre-existing placeholder pointed at `/streaks`). `features/streaks/` follows the per-feature convention below with two pages (Streak Dashboard at `''`, Achievement Gallery at `achievements`) and nine presentational components (`streak-card`, `current-streak`, `longest-streak`, `achievement-card`, `xp-progress`, `weekly-heatmap`, `monthly-heatmap`, `success-meter`, `consistency-ring`). `weekly-heatmap`/`monthly-heatmap` are thin wrappers around Habits' own `habit-calendar-heatmap` (different data window, same grid-rendering component — cross-feature component reuse, the same precedent the Dashboard already set by importing Planner/Routine utils) rather than a second heatmap implementation; `consistency-ring` likewise wraps Habits' `habit-progress-ring`. `utils/streak-display.ts` reuses Habits' own `heatmapLevel` grading function for the same reason. The main Dashboard (`features/dashboard/`) gained `services/dashboard-streaks.service.ts`, following the same "one endpoint, several derived widgets" shape `DashboardHabitStatsService`/`DashboardPlannerService` already established, replacing its last placeholder stat card with seven real ones.
- **Milestone 7 (Daily Planner)** also reused an existing nav item — `Schedule`, already in Milestone 3's original list pointing at the placeholder — rather than adding a new `Planner` one, so `features/planner/`'s routes mount at the pre-existing `/schedule` URL. Its three pages (Planner Dashboard, Day View, Week View) and nine components go beyond the per-feature convention below with a `state/` `PlannerStore` (one currently-viewed day, not a list) and a `services/planner-block-actions.service.ts` — a second service alongside the usual thin API wrapper, holding the dialog/confirm/store/snackbar orchestration every planner-consuming page needs (Planner Dashboard, Day View, and the main app Dashboard's own planner widgets), so that logic isn't duplicated per page. The main Dashboard (`features/dashboard/`) also gained a `components/planner-timeline-card/` and `services/dashboard-planner.service.ts`, following the same "one endpoint, several derived widgets" shape `DashboardHabitStatsService` already established for `GET /habits/summary`.
- **Milestone 9 (Goals)** added a new nav item (`Goals`, like Streaks before it — no pre-existing placeholder pointed at `/goals`). `features/goals/` follows the per-feature convention below with four pages (Goals Dashboard at `''`, Goal Detail at `:id`, Goal Editor at `new`/`:id/edit`, Goal Milestones at `:id/milestones`) and eight components (`goal-card`, `goal-progress-ring`, `goal-timeline`, `milestone-list`, `goal-statistics`, `goal-filters`, `goal-progress-widget`, `goal-milestone-form-dialog`). `goal-progress-ring` wraps Habits' own `habit-progress-ring` the same way Streaks' `consistency-ring` already does (cross-feature component reuse, not a new ring implementation); `goal-milestone-form-dialog` mirrors Routines' `routine-step-form-dialog` (a parent-owned child list item's own add/edit dialog — not in the milestone brief's literal component list, added for the same functional reason Routines added its own). A ninth brief item, "Archive Dialog", is deliberately *not* a new component — it reuses `shared/components/confirm-dialog/confirm-dialog` with non-destructive copy, the same "do not duplicate an existing shared component" call Milestone 6 made for its own "Habit Empty State". `goal-timeline` has no existing linear-timeline precedent to reuse (Planner's time-grid is a different, hour-by-hour shape), so it's a small new hand-rolled CSS component, matching the "no charting library" convention every other visual in this codebase already follows. `features/goals/` also gained an optional `goalId` field on Task/Habit/Routine/PlannerBlock's own shared-types (`@lifeos/shared-types`), consumed only by Goals' own pages in this milestone — the Task/Habit/Routine/Planner *feature* forms were not given a "link to goal" picker UI (see `docs/09-roadmap.md`/changelog remaining-work note). The main Dashboard (`features/dashboard/`) gained `services/dashboard-goals.service.ts`, deriving all four required widgets (Active Goals, Today's Goal Progress, Goal Completion %, Nearest Goal Deadline) client-side from one `GET /goals` call — the same "derived via local computation" shape `DashboardRoutineSummaryService` already established, since Goals has no dedicated summary endpoint.

- **Milestone 10 (Journal)** reused the `Journal` nav item already in Milestone 3's original list (like Habits before it — no nav change needed, just swapping its placeholder for `loadChildren`). `features/journal/` follows the per-feature convention below with six pages (Journal Dashboard at `''`, Morning Journal at `morning`, Evening Journal at `evening`, Journal History at `history`, Search Journals at `search`, Journal Detail at `:date/:id` — addressed by date+id rather than a plain `:id`, since `GET /journal/:date` already returns the whole day's entries the same way `PlannerDayResponseDto` does for its own day) and twelve components (`mood-selector`, `energy-meter`, `journal-card`, `journal-timeline`, `reflection-questions`, `gratitude-widget`, `tags-input`, `search-filters`, `journal-calendar`, `statistics-card`, `prompt-card`, `rich-text-editor`). `rich-text-editor` is a hand-rolled markdown-lite textarea (bold/italic/list toolbar + a sanitized-preview toggle), not a third-party editor — no rich-text dependency (ngx-quill/CKEditor) exists anywhere in this codebase, and CLAUDE.md weighs against adding one without justification. `journal-calendar` is a hand-rolled month grid, matching the "no charting library" convention Goals' own `goal-timeline` already established. No dedicated "Attachment" component exists — the milestone's own component list doesn't include one, and `POST /journal/attachments` registers already-hosted file metadata rather than accepting an upload, so there's no upload UI to build. `features/journal/utils/journal-form.ts` factors the seven fields every `JournalType` shares (title/content/mood/energy/tags/weather/location/goalId) into one `commonEntryControls(fb)` helper, so Morning/Evening/Journal Detail's own reactive forms each add only their type-specific fields rather than repeating those seven three times. The main Dashboard (`features/dashboard/`) gained `services/dashboard-journal.service.ts`, deriving all six required widgets (Today's Journal Status, Morning/Evening Reflection, Current Mood, Last Gratitude, Latest Reflection) from `GET /journal/:date` (today) plus one `GET /journal/history` call (most recent entry overall) — the same "derived via local computation, no dedicated backend endpoint" shape `DashboardGoalsService` already established. Cross-feature integration is frontend-only composition, not a backend module import: Goal Detail imports `JournalTimeline`/`JournalApiService` directly to show related entries (`GET /journal/search?goalId=`), the Planner Dashboard gained a plain link to `/journal`, and the Evening Journal page composes Habits'/Streaks' own `HabitApiService.summary()`/`StreaksApiService.today()` alongside its own Journal calls — see `docs/05-architecture.md`'s Milestone 10 note for why this differs from every prior fan-in module's backend-level service reuse.
- **Milestone 11 (Calendar)** added a new nav item (`Calendar`, like Streaks/Goals before it — no pre-existing placeholder pointed at `/calendar`). `features/calendar/` follows the per-feature convention below with five pages (Calendar Dashboard at `''`, Month View at `month`, Week View at `week`, Day View at `day`/`day/:date`, Calendar Settings at `settings`) and nine components (`calendar-grid`, `event-card`, `mini-calendar`, `agenda-view`, `calendar-filters`, `event-dialog`, `timezone-selector`, `calendar-legend`, `drag-drop-event`). `mini-calendar` and `calendar-grid` are hand-rolled month grids following `journal-calendar`'s own precedent exactly (this codebase's "no charting/calendar library" convention), not a copy of it — `journal-calendar` lives inside `features/journal/components/` and isn't imported across the feature boundary, matching the isolation rule this section states below. `drag-drop-event` is likewise Calendar's own CDK drag-to-move component, not an import of Planner's `planner-block` — cross-feature reuse on the frontend happens by composing a sibling feature's exported *service*, not reaching into its `components/` folder (see the note below on `state/`/`services/`). Month View is click-to-open (create/edit); Week View is a read-mostly 7-day overview whose day cells link into Day View; Day View is the one with drag-and-drop — the same complexity split Planner itself draws between its own read-mostly Week View and richer, drag-enabled Day View (Week's 7 columns are too narrow for meaningful drag placement). `event-dialog`'s "Advanced links" panel exposes `taskId`/`goalId`/`plannerBlockId` as plain id fields rather than full cross-feature search-selects, mirroring `block-dialog`'s own precedent of only building a real picker where a milestone brief specifically calls for one. The main Dashboard (`features/dashboard/`) gained `services/dashboard-calendar.service.ts` and `components/calendar-schedule-card/`, deriving Today's Events/Upcoming Events/Calendar Overview from `GET /calendar`/`GET /calendar/events` and Today's Schedule by merging those with `GET /planner/today` (reused directly via `PlannerApiService`, per this milestone's own "reuse existing Planner APIs where practical" instruction) — the same "one/two endpoint(s), several derived widgets" shape every prior Dashboard service already establishes.

**Per-feature folder convention** (e.g., `features/habits/`):
```
habits/
├── habits.routes.ts        # lazy-loaded child routes
├── components/              # feature-specific presentational components
├── pages/                   # route-level container components
├── services/                 # feature API client + business logic
├── state/                    # signal-based store for this feature's state
└── models/                   # feature-local types (imports from shared-types for API contracts)
```

**Why feature-based over type-based (all-components-together, all-services-together):** matches the PRD's explicit development principle ("use feature-based architecture," "keep components reusable") and keeps each feature independently lazy-loadable, which matters for a product with this many distinct modules — no user needs the admin bundle or the AI-coach bundle downloaded on first paint.

## Backend (`apps/backend/`) — NestJS, modular

```
src/
├── main.ts                 # API entrypoint
├── main.worker.ts          # BullMQ worker entrypoint (separate deployable, same codebase)
├── app.module.ts
├── common/
│   ├── decorators/           # @CurrentUser(), @Roles()
│   ├── guards/                # JwtAuthGuard, RolesGuard
│   ├── filters/                # global exception filter
│   ├── interceptors/           # logging, transform response
│   ├── interfaces/             # AuthenticatedUser, PaginatedResult<T>
│   └── dto/                    # PaginationQueryDto, PaginationMetaDto
├── config/                    # env validation (zod/joi), typed config module
├── database/
│   └── prisma/                # PrismaService, PrismaModule
├── modules/
│   ├── auth/
│   ├── users/
│   ├── tasks/
│   ├── routines/                # Morning/Evening/Custom routines + steps — see docs/06-database-design.md
│   ├── planner/
│   ├── habits/
│   ├── streaks/
│   ├── journal/
│   ├── goals/
│   ├── calendar/
│   ├── notifications/
│   ├── ai-coach/
│   │   ├── adapters/            # claude.adapter.ts, openai.adapter.ts
│   │   └── interfaces/          # ai-provider.interface.ts
│   ├── analytics/
│   ├── gamification/
│   ├── subscriptions/           # Stripe integration, webhooks
│   └── admin/
├── jobs/                       # BullMQ processors, one per queue
│   ├── notifications.processor.ts
│   ├── ai-schedule-gen.processor.ts
│   ├── streak-rollover.processor.ts
│   ├── analytics-rollup.processor.ts
│   └── email.processor.ts
└── events/                      # domain event definitions (TaskCompletedEvent, etc.)
```

**Per-module convention** (e.g., `modules/habits/`):
```
habits/
├── habits.module.ts
├── habits.controller.ts
├── habits.service.ts
├── dto/                  # create-habit.dto.ts, update-habit.dto.ts
├── entities/             # (if not using Prisma types directly)
└── habits.service.spec.ts
```

**As implemented (Milestone 4 — `modules/tasks/`):** follows this convention with no `entities/`
(TasksService returns the Prisma `Task` type directly — no hidden fields to map away, unlike
`User`/`passwordHash`) and an added `tasks.controller.spec.ts` alongside the service spec.
Frontend `features/tasks/` follows the per-feature convention above (`pages/`, `components/`,
`services/`, `state/`) plus a `utils/` for pure display-formatting helpers (priority/status
label+color maps, due-date-indicator logic) — small enough not to warrant `models/`, since
`@lifeos/shared-types` already covers the API contract types.

**As implemented (Milestone 5 — `modules/routines/`):** same convention as `tasks/`, but
`RoutinesService` *does* build its own response shape (`RoutineResponseDto`) rather than
returning the Prisma type directly — `totalDurationMinutes` is computed (sum of step durations),
not a column. The nested step endpoints (`/routines/:id/steps`, `.../reorder`) live in the same
controller/service rather than a separate `modules/routine-steps/` — a `RoutineStep` has no
meaning outside its parent `Routine`, unlike, say, `Task` and `User` which are independently
addressable resources. Frontend `features/routines/` mirrors `features/tasks/`'s shape, with one
difference driven by the backend not having a "replace all steps" bulk endpoint: the Routine
Editor page persists each step add/edit/delete/reorder immediately in edit mode, but batches
everything into one `POST /routines` call in create mode (see the comment atop
`routine-editor-page.ts`).

**As implemented (Milestone 6 — `modules/habits/`):** same convention as `tasks/`/`routines/`,
also building its own response shape (`HabitResponseDto`) since `currentPeriodCount`/
`completionPercent`/`todayCount`/`completedToday` are computed from `HabitLog` on every read (see
`docs/06-database-design.md`'s note on Habit). Three read endpoints beyond plain CRUD —
`GET /habits/today`, `GET /habits/summary`, `GET /habits/history` — live in the same
controller/service rather than separate modules, mirroring how Routine's nested step endpoints
stay in `RoutinesController`: each is a different *view* over the same Habit/HabitLog data (an
actionable-today list, a dashboard aggregate, and a paginated log timeline for the Habit History
page and Calendar Heatmap), not an independently addressable resource. `HabitLog` mutations
(`POST`/`PATCH`/`DELETE /habits/:id/log`) identify the target row by date rather than by log ID —
a habit has at most one log per date (enforced by a DB unique constraint), so the date alone is
enough, and it keeps the frontend from having to track log IDs just to log "today."

**As implemented (Milestone 7 — `modules/planner/`):** same top-level convention as the others,
plus a `utils/` (not listed in the per-module convention below, but the same idea as the frontend
features' own `utils/`) holding `timezone.util.ts` and `scheduler.util.ts` — pure functions kept
framework-free on purpose so the DST/overlap/buffer logic they contain is unit-testable without
mocking Prisma or Nest's DI, plus a small `ParseDateParamPipe` (the `:date` path-param equivalent
of the common `ParseUUIDPipe` used for `:id` elsewhere). `PlannerService` builds its own response
shape (`PlannerDayResponseDto`), the same reason `RoutinesService`/`HabitsService` do. This is also
the first module to import three sibling modules' services (`TasksModule`/`RoutinesModule`/
`HabitsModule`, each now exporting its service) rather than only touching its own tables — see
`docs/05-architecture.md`'s note on why this is a synchronous read-composition, not the
`EventEmitter2` side-effect pattern the architecture doc describes for future modules. The
`jobs/`/`events/` folders this doc's original plan listed at the `src/` root remain unbuilt: they
were speculative infrastructure for BullMQ-based background processing, which Milestone 7's
generator doesn't need (it's a synchronous request/response operation, not a queued job).

**As implemented (Milestone 8 — `modules/streaks/`):** one module, three controllers
(`StreaksController` at `/streaks`, `AchievementsController` at `/achievements`,
`FreezeDaysController` at `/freeze-days`) and three services (`StreaksService`,
`AchievementsService`, `FreezeDaysService`) — grouped together because Achievements and Freeze
Days are the Streak Engine's own supporting concepts, not independent product modules, the same
reasoning that keeps Routine's nested step endpoints inside `RoutinesController` rather than a
separate `modules/routine-steps/`. A `utils/` (same "framework-free, unit-testable" idea as
Planner's) holds `streak-calculator.util.ts` (day/period-level consistency math — current/longest
streak, weekly/monthly consistency, success rate, perfect week/month), `xp-calculator.util.ts`,
and `achievement-definitions.ts` (the single data-driven source of truth for the achievement
catalog — see `docs/06-database-design.md`'s note on `Achievement`). Unlike Planner, `StreaksModule`
does **not** import `HabitsModule`: `Habit`/`HabitLog` are this module's own primary domain
(`StreaksService` queries them directly via `PrismaService`, the same way `HabitsService` itself
does), while `TasksModule`/`PlannerModule` *are* imported so `TasksService.countCompleted`/
`PlannerService.countCompletedBlocks` (both small additive exports, no existing behavior changed)
can be reused for XP/achievement totals — see `docs/05-architecture.md` for the full "reuse
services, don't duplicate the query" rationale. `planner/utils/timezone.util.ts` is reused
directly (plus one additive export, `getZonedHour`) rather than duplicated or relocated.

**As implemented (Milestone 9 — `modules/goals/`):** one module, one controller/service pair
(`GoalsController`/`GoalsService`) plus a `utils/goal-progress.util.ts` (percent/remaining/
complete math — the same "framework-free, unit-testable" idea Planner's and Streaks' own `utils/`
already establish). `GoalsModule` imports all four of `TasksModule`/`HabitsModule`/
`RoutinesModule`/`PlannerModule` — the widest fan-in of any module so far, since a Goal's
`targetType` can draw progress from any of them — and reuses one small additive export per module
(`TasksService.countCompletedByGoal`, `HabitsService.countLogsByGoal`,
`RoutinesService.getStepIdsByGoal`, `PlannerService.countCompletedBlocksByReferenceIds` /
`.sumCompletedDurationByGoal`) rather than querying their tables directly, the same "reuse
services" rule Planner/Streaks already establish. Unlike those, `GoalsModule` exports nothing —
no other module reuses Goals (yet). The reverse link (`Task`/`Habit`/`Routine`/`PlannerBlock`
each gaining an optional `goalId` column + DTO field) is implemented as a small addition inside
each of those four existing modules rather than inside `modules/goals/` itself, since Goals has no
business writing to another module's own tables — see `docs/05-architecture.md`'s Milestone 9 note
for the full ownership-validation rationale (a raw Prisma check per module, not an injected
`GoalsService`, to avoid a circular module dependency).

**As implemented (Milestone 10 — `modules/journal/`):** one module, one controller/service pair
(`JournalController`/`JournalService`) plus `utils/journal-prompt-definitions.ts` (the data-driven
prompt catalog, upserted at boot — the same pattern `modules/streaks/utils/achievement-
definitions.ts` already established for Achievements). Unlike Planner/Streaks/Goals,
`JournalModule` **imports no sibling module** — its Habits/Streaks/Planner integration is composed
entirely on the frontend (see the note on `features/journal/` above and `docs/05-architecture.md`'s
Milestone 10 note for the full rationale), and its own optional `goalId`/`plannerDayId` links use
the same raw-Prisma-existence-check ownership pattern (`assertGoalOwnership`/
`assertPlannerDayOwnership`) every other module's optional cross-reference already uses. `journal
.controller.ts` reuses Planner's own `ParseDateParamPipe` directly (a plain file import, not
through `PlannerModule`) for its `:date` route param, the same "pure, stateless, no DI needed"
cross-module file-reuse precedent Streaks set for `planner/utils/timezone.util.ts`. `JournalModule`
exports `JournalService` despite nothing currently importing it — a forward-looking seam for a
future AI Coach module, not dead code.

**As implemented (Milestone 11 — `modules/calendar/`):** one module, three services
(`CalendarService` for calendar CRUD, `CalendarEventsService` for event CRUD/conflict detection,
`CalendarSyncService` for `POST /calendar/sync`) behind a single `CalendarController` — literal
route segments (`events`, `events/:id`, `sync`) are declared before the parameterized `:id` route,
the same route-ordering rule `habits.controller.ts`'s `today`/`summary`/`history` and
`journal.controller.ts`'s `history`/`search`/`prompts` already document. A `providers/`
subdirectory holds the provider-adapter architecture: `calendar-provider.interface.ts`
(`ICalendarProvider`), `local-calendar.provider.ts` (the only one that does anything real),
`remote-calendar.provider.ts` (an abstract base every non-LOCAL adapter extends, so
`google-calendar.provider.ts`/`microsoft-calendar.provider.ts`/`apple-calendar.provider.ts`/
`ical-calendar.provider.ts` each add only a display name), and `calendar-provider.registry.ts`
(maps `CalendarProvider` to its adapter instance). `utils/recurrence.util.ts` holds the
"recurring event preparation" helper, reusing `planner/utils/timezone.util.ts`'s
`zonedWallTimeToUtc`/`addDaysToDateString` directly (the same cross-module file-reuse precedent
Streaks/Journal already set for that file) rather than a second timezone implementation;
`CalendarEventsService`'s conflict detection likewise reuses `planner/utils/scheduler.util.ts`'s
`hasOverlap`/`Interval` directly. Like Journal, `CalendarModule` **imports no sibling module** —
its four optional cross-links (`plannerBlockId`/`taskId`/`goalId`/`journalEntryId`) are validated
via the same raw-Prisma-existence-check pattern every other module's optional cross-reference
already uses, not injected `TasksService`/`GoalsService`/`PlannerService`/`JournalService`.

## Root-level config

```
.github/workflows/
├── ci.yml               # lint, typecheck, test, build on PR
└── deploy.yml           # deploy to Railway (backend+worker) and Cloudflare Pages (frontend) on merge to main

docker-compose.yml        # local Postgres + Redis for dev parity with Neon/Upstash
```

## Testing layout

Co-locate unit tests (`*.spec.ts`) next to the file under test in both apps (standard Jest/Angular convention). A separate top-level `e2e/` per app for Playwright (frontend) and Supertest-based e2e (backend), since these span multiple modules and don't belong to a single feature.
