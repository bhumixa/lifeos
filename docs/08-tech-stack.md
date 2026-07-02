# 8. Recommended Technology Stack

The PRD already prescribes a stack. This confirms it's sound, adds the specifics needed to actually build with it, fills gaps the PRD left open (payments, email, push, observability), and flags one real compatibility risk.

## Frontend

| Layer | Choice | Notes |
|---|---|---|
| Framework | Angular 20, standalone components | No NgModules; matches modern Angular direction |
| Language | TypeScript (strict mode) | |
| State | Angular Signals, +  a signal-based store (e.g. NgRx SignalStore) for cross-feature shared state (auth, dashboard aggregates) | Per-feature local state can stay as plain signals in feature services — don't force every feature into a global store |
| Async/streams | RxJS | For HTTP interceptors, websocket streams, debounced search |
| UI components | Angular Material | Forms, dialogs, date pickers — don't hand-roll these |
| Styling | Tailwind CSS | Utility layer on top of Material; define shared design tokens once (see `shared/ui`) to avoid Material-default vs. Tailwind-custom visual drift |
| Drag & drop | Angular CDK DragDrop | Already ships with Angular Material's dependency tree; used for planner/task reordering |
| Calendar | Evaluate a proven Angular-compatible calendar engine (e.g. FullCalendar with its Angular adapter) vs. building custom on CDK | PRD didn't specify; building a full drag/drop/recurring calendar from scratch is a significant, avoidable time sink |
| Charts | A charting library for analytics (e.g. ECharts or ngx-charts) | Gap in PRD — analytics section requires visual trends with no library named |
| Mobile | Capacitor (iOS/Android wrapper of the same Angular build) | Confirm app-store IAP requirement before committing to Stripe-only billing (see assumptions doc) |
| PWA | Angular service worker (`@angular/pwa`) | Installable web app, offline app-shell caching (data offline-sync remains future scope per PRD) |

## Backend

| Layer | Choice | Notes |
|---|---|---|
| Framework | NestJS | Modular, DI-first — fits the PRD's SOLID/feature-based principles directly |
| ORM | Prisma | Type-safe queries, migrations, good Neon compatibility |
| Database | PostgreSQL (Neon) | Serverless Postgres; branching is valuable for PR preview DBs and safe migration rehearsal |
| Cache / queue backing | Redis (Upstash for cache; see risk note below for queues) | |
| Job queue | BullMQ | Notifications, AI generation, streak rollover, analytics rollups, email |
| Validation | `class-validator` + `class-transformer` | DTO-level request validation, paired with a global `ValidationPipe` |
| Auth | `@nestjs/jwt` + `@nestjs/passport` (Google OAuth strategy) | Access + rotating refresh tokens; Argon2 for password hashing (stronger default than bcrypt) |
| Rate limiting | `@nestjs/throttler` + Redis-backed token bucket for AI endpoints specifically | Needed to bound the "unlimited AI requests" cost exposure |
| API docs | `@nestjs/swagger` | Auto-generated OpenAPI spec from existing DTOs/decorators |

## AI

| Provider | Role |
|---|---|
| **Claude API (Anthropic)** | Primary — coaching tone, morning briefings, evening reviews, schedule generation, journaling prompts. Anthropic models are well suited to the sustained, careful, personal-coaching register this product needs. |
| **OpenAI API** | Secondary — fallback if Claude is unavailable/rate-limited, and/or a specific sub-capability (e.g., embeddings for future journal/task search). |

Both sit behind a single `AiProvider` interface (see architecture doc) so the split above is a configuration/routing decision, not something hardcoded into feature logic — this also makes future model upgrades (new Claude or GPT versions) a one-line config change.

## Payments (gap — not specified in PRD)

- **Stripe** for web subscription billing (Standard → Premium), Stripe webhooks feed the `Subscription` table.
- If/when app-store distribution ships, **Apple/Google IAP** likely becomes mandatory for digital subscriptions per store policy — recommend **RevenueCat** at that point to avoid maintaining three billing integrations directly.

## Notifications (gap — channels not specified in PRD)

- **Web Push** (VAPID) for the PWA.
- **Capacitor Push Notifications plugin** → FCM (Android) / APNs (iOS) once native apps ship.
- **Email** via Resend or Postmark (transactional: password reset, digests) — both have clean NestJS integration and good deliverability for transactional mail.
- All delivery goes through the `notifications` BullMQ queue regardless of channel, so scheduling logic doesn't duplicate per channel.

## Infrastructure

| Layer | Choice | Notes |
|---|---|---|
| Containerization | Docker | Backend image; `docker-compose.yml` for local Postgres+Redis dev parity |
| CI | GitHub Actions | Lint, typecheck, unit tests, build — on every PR |
| CD | GitHub Actions → Railway (backend API + worker) + Cloudflare Pages (frontend) | |
| Frontend hosting | Cloudflare Pages | Static Angular build + PWA assets |
| Backend hosting | Railway | Two services from one image: API process, worker process |
| Database | Neon PostgreSQL | |
| Cache | Upstash Redis | ⚠️ **Risk**: Upstash's REST-first Redis has known limitations with BullMQ's blocking commands. Validate early; if unreliable, run a small dedicated Railway Redis instance for BullMQ queues and keep Upstash purely for caching/rate-limit counters. |

## Observability (gap — not specified in PRD)

- **Sentry** — error tracking, frontend + backend.
- **Pino** — structured JSON logging in NestJS, with request correlation IDs.
- **PostHog** (or similar) — product analytics to actually measure the PRD's own success metrics (DAU/WAU/MAU, session duration, feature engagement) — the PRD defines these metrics but never names a measurement tool.

## Testing

| Layer | Tool |
|---|---|
| Backend unit | Jest |
| Backend integration/e2e | Jest + Supertest against a Dockerized test Postgres |
| Frontend unit | Jest (or Angular's default Karma/Jasmine, but Jest is faster and more consistent with the backend toolchain) |
| Frontend component/e2e | Playwright |
| Contract safety | Shared-types package (see folder structure doc) keeps FE/BE DTOs from silently drifting |

## Security tooling

- `helmet` for HTTP headers, strict CORS allow-list.
- `pgcrypto` or app-level AES-GCM for encrypting `JournalEntry.content`/`mood` at rest.
- Dependabot/`npm audit` in CI for dependency vulnerability scanning.
