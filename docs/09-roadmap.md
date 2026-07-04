# 9. Development Roadmap

This expands the PRD's section 13 milestone list into sequenced phases with dependencies, following the PRD's own development principle of building **feature by feature**. Week estimates assume a small team (2-4 engineers) and are indicative, not committed — team size is an open assumption (see `03-assumptions.md`, item 11) that should be confirmed before treating these as deadlines.

## Phase 0 — Foundation (Weeks 1–2)

- Product architecture & system design (this document set).
- Monorepo scaffold (`apps/frontend`, `apps/backend`, `packages/shared-types`), Docker Compose for local Postgres/Redis.
- CI pipeline (lint, typecheck, test, build on PR); base CD to a staging environment.
- Design system foundation: Tailwind tokens + Angular Material theme (light/dark).
- Prisma schema v1 (identity + core tables from `06-database-design.md`).

**Exit criteria:** empty app deploys end-to-end (frontend → API → DB) through the full CI/CD pipeline.

## Phase 1 — Identity & Shell (Weeks 3–4)

- Auth: email/password, Google OAuth, JWT + rotating refresh tokens, password reset.
- User profile, `UserSettings` (timezone, theme, wake/sleep time).
- App shell/layout (nav, routing, role-based guards including Admin scaffold).

**Depends on:** Phase 0. **Exit criteria:** a user can sign up, log in, log out, reset password, and see an empty dashboard shell.

## Phase 2 — Planning Core (Weeks 5–8)

- Task management (priorities, categories, deadlines, recurring tasks, subtasks, tags, notes).
- Daily Planner (time blocking, drag-and-drop, templates, day/week/month views).
- Calendar (day/week/month views, recurring events, color coding). **As implemented (Milestone
  11):** built as its own standalone milestone well after Phase 2's other items (Task Management/
  Daily Planner/Dashboard v1 shipped in Milestones 4/7/3 respectively), following the same
  "front-load a later-phase item as an explicit standalone milestone" pattern Journal (Milestone
  10) and Goals (Milestone 9) already set — see `docs/changelog.md`. Recurring events are only
  "recurring event preparation" (a tested, timezone-aware expansion utility), not a persisted
  recurrence field or a working recurrence engine; external provider sync (Google/Microsoft/
  Apple/iCal) is architected (a real interface + adapter registry) but deliberately unimplemented —
  no OAuth flow or external API call exists anywhere in this codebase yet, so this item isn't yet
  fully closed either.
- Dashboard v1 wired to real task/schedule data (today's schedule, current task, upcoming tasks).

**Depends on:** Phase 1. This is the largest single phase — it's the product's functional core and everything downstream (habits, streaks, AI coach) reads from or writes to it.

## Phase 3 — Habits & Motivation Engine (Weeks 9–11)

- Habit tracker (predefined + custom habits, daily logs, heatmaps, weekly/monthly reports).
- Streak engine (current/longest/missed days/recovery streak/milestones) — including the per-user-timezone rollover job flagged in the architecture doc.
- Gamification (XP, levels, badges, achievements, daily/weekly challenges) — depends on streak/task-completion domain events already emitted in Phase 2.

**Depends on:** Phase 2 (habit completion and task completion both feed streaks/XP via domain events).

## Phase 4 — Reflection & AI Coaching (Weeks 12–15)

- Journal (morning intention, evening reflection, gratitude, mood, free-form) with encryption at rest. **As implemented (Milestone 10):** built ahead of AI Coach, per explicit instruction, as its own standalone milestone rather than bundled with Phase 4 — see `docs/changelog.md`. Encryption at rest for `content`/`mood` was **not** implemented (a documented gap, not an oversight — see `docs/06-database-design.md`'s Milestone 10 note), so this item isn't yet fully closed.
- AI Coach: morning briefing, evening review, personalized reminders, productivity/habit suggestions, daily affirmations, weekly insights.
- AI Schedule Generator (wake/sleep/work-hours/goals input → generated schedule, written into `ScheduleBlock`).
- AI cost governance: per-tier rate limiting, provider fallback (Claude ↔ OpenAI), usage logging (`AiInteraction`).

**Depends on:** Phase 2 (schedule generation writes into the planner) and Phase 3 (AI suggestions reference habit/streak state). This phase carries the highest technical + product risk (external API dependency, cost exposure, content-safety considerations) — budget contingency here first if the schedule slips.

## Phase 5 — Insight & Engagement (Weeks 16–17)

- Analytics dashboard (daily productivity, weekly trends, monthly summaries, habit completion, learning hours, focus time, goal progress, streak history) — reading from the nightly `analytics-rollup` job.
- Notifications system (push + email, all reminder types from the PRD, quiet hours).
- Goals module (personal/career/health/financial/learning/spiritual, milestones).

**Depends on:** Phases 2–4 (analytics aggregates data produced by all prior phases).

## Phase 6 — Productionization (Weeks 18–20)

- Mobile optimization + Capacitor builds for iOS/Android.
- Settings polish (notification preferences, data export, account deletion — see gaps in `02-missing-requirements.md`).
- Accessibility pass (WCAG AA).
- Security hardening (rate-limit tuning, dependency audit, encryption verification), load testing.
- Admin panel (user management, subscription management, analytics, audit log viewer).

**Depends on:** all prior phases having stable, feature-complete data models.

## Phase 7 — Launch (Weeks 21–22)

- Closed beta with a cohort spanning all five target segments (students, professionals, entrepreneurs, fitness, spiritual users) to validate the horizontal positioning.
- Iterate on beta feedback.
- Production cutover (Railway + Cloudflare Pages), app store submission (if in scope — resolve assumption #2 first).
- Public launch.

---

## Post-MVP: Phase 2–4 (per PRD section 10, unchanged)

These follow the PRD's own naming (its "Phase 2/3/4" are post-*this* roadmap's MVP, i.e., come after the Launch phase above):

| PRD Phase | Scope | Prerequisite work |
|---|---|---|
| Phase 2 | Team collaboration, shared schedules, family planning, smart widgets | Requires introducing a `Workspace`/multi-tenant concept above `User` — the first real change to the single-tenant data model in `06-database-design.md`. |
| Phase 3 | AI voice coach, wearable integrations, health tracking, smart calendar sync | Wearables raise the health-data compliance question flagged in `03-assumptions.md` (item 9) — revisit before scoping. |
| Phase 4 | AI life assistant, goal prediction, personalized insights, templates/routines marketplace | `ScheduleTemplate.isPublic` (already in the schema design) gives this a running start. |

## Sequencing risks worth flagging now

1. **Phase 4 (AI Coaching) is the riskiest phase** — it's the product's core differentiator but depends on two external APIs, has an open cost model, and touches sensitive user content. Recommend a design spike on prompting/cost/safety *before* Phase 4 starts, not during it.
2. **Streak/timezone correctness (Phase 3) is easy to get subtly wrong** and hard to retrofit once users have live streaks — worth extra test investment (property-based tests across timezones/DST boundaries) rather than typical unit coverage.
3. **Payment provider decision (Stripe vs. Stripe+IAP) blocks Phase 6 Settings work** (subscription management UI) — resolve assumption #3 by the end of Phase 4 at the latest.
