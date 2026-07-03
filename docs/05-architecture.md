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
