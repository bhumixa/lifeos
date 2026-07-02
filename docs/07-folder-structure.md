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
- **Placeholder pattern**: nav sections whose feature module doesn't exist yet (Tasks, Schedule, Habits, Journal, AI Coach, Analytics, Settings as of Milestone 3) route to one shared `shared/components/feature-placeholder/`, driven by route `data`, rather than each getting an empty `features/<name>/` folder. Each gets its real feature folder (matching the per-feature convention below) when its milestone starts.

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

## Root-level config

```
.github/workflows/
├── ci.yml               # lint, typecheck, test, build on PR
└── deploy.yml           # deploy to Railway (backend+worker) and Cloudflare Pages (frontend) on merge to main

docker-compose.yml        # local Postgres + Redis for dev parity with Neon/Upstash
```

## Testing layout

Co-locate unit tests (`*.spec.ts`) next to the file under test in both apps (standard Jest/Angular convention). A separate top-level `e2e/` per app for Playwright (frontend) and Supertest-based e2e (backend), since these span multiple modules and don't belong to a single feature.
