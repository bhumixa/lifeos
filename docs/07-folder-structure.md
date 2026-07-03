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
- **Placeholder pattern**: nav sections whose feature module doesn't exist yet (Tasks, Routines, Habits, and Schedule have since been built; Journal, AI Coach, Analytics, Settings remain placeholders as of Milestone 7) route to one shared `shared/components/feature-placeholder/`, driven by route `data`, rather than each getting an empty `features/<name>/` folder. Each gets its real feature folder (matching the per-feature convention below) when its milestone starts.
- **Milestone 5 (Routines)** added a nav item (`Routines`, in `layout/sidenav/nav-items.ts`) that wasn't part of the original 8-item nav list from Milestone 3 — the module wasn't planned for at that point. Its `features/routines/` follows the per-feature convention below, plus a `components/routine-step-form-dialog/` (add/edit a single step — presentation-only, no API calls of its own) alongside the list/detail/editor pages.
- **Milestone 6 (Habits)** reused the `Habits` nav item that was already in Milestone 3's original list (unlike Routines, no nav change was needed). `features/habits/` follows the per-feature convention below with four pages (list/detail/today/history — see the backend section's note on `modules/habits/` for why "today" and "history" are dedicated endpoints rather than client-side filters) and six new reusable components (`habit-card`, `habit-progress-ring`, `habit-calendar-heatmap`, `habit-completion-button`, `habit-statistics-card`, `habit-filter-panel`); a seventh from the brief, "Habit Empty State", is deliberately *not* a new component — it reuses `shared/components/empty-state/empty-state`, per this milestone's explicit "do not duplicate code" instruction, since Task/Routine already established that shared component as the presentational empty-state pattern.
- **Milestone 8 (Streaks)** added a new nav item (`Streaks`, like Routines before it — no pre-existing placeholder pointed at `/streaks`). `features/streaks/` follows the per-feature convention below with two pages (Streak Dashboard at `''`, Achievement Gallery at `achievements`) and nine presentational components (`streak-card`, `current-streak`, `longest-streak`, `achievement-card`, `xp-progress`, `weekly-heatmap`, `monthly-heatmap`, `success-meter`, `consistency-ring`). `weekly-heatmap`/`monthly-heatmap` are thin wrappers around Habits' own `habit-calendar-heatmap` (different data window, same grid-rendering component — cross-feature component reuse, the same precedent the Dashboard already set by importing Planner/Routine utils) rather than a second heatmap implementation; `consistency-ring` likewise wraps Habits' `habit-progress-ring`. `utils/streak-display.ts` reuses Habits' own `heatmapLevel` grading function for the same reason. The main Dashboard (`features/dashboard/`) gained `services/dashboard-streaks.service.ts`, following the same "one endpoint, several derived widgets" shape `DashboardHabitStatsService`/`DashboardPlannerService` already established, replacing its last placeholder stat card with seven real ones.
- **Milestone 7 (Daily Planner)** also reused an existing nav item — `Schedule`, already in Milestone 3's original list pointing at the placeholder — rather than adding a new `Planner` one, so `features/planner/`'s routes mount at the pre-existing `/schedule` URL. Its three pages (Planner Dashboard, Day View, Week View) and nine components go beyond the per-feature convention below with a `state/` `PlannerStore` (one currently-viewed day, not a list) and a `services/planner-block-actions.service.ts` — a second service alongside the usual thin API wrapper, holding the dialog/confirm/store/snackbar orchestration every planner-consuming page needs (Planner Dashboard, Day View, and the main app Dashboard's own planner widgets), so that logic isn't duplicated per page. The main Dashboard (`features/dashboard/`) also gained a `components/planner-timeline-card/` and `services/dashboard-planner.service.ts`, following the same "one endpoint, several derived widgets" shape `DashboardHabitStatsService` already established for `GET /habits/summary`.

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

## Root-level config

```
.github/workflows/
├── ci.yml               # lint, typecheck, test, build on PR
└── deploy.yml           # deploy to Railway (backend+worker) and Cloudflare Pages (frontend) on merge to main

docker-compose.yml        # local Postgres + Redis for dev parity with Neon/Upstash
```

## Testing layout

Co-locate unit tests (`*.spec.ts`) next to the file under test in both apps (standard Jest/Angular convention). A separate top-level `e2e/` per app for Playwright (frontend) and Supertest-based e2e (backend), since these span multiple modules and don't belong to a single feature.
