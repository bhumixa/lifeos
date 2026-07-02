# 2. Missing Requirements

The PRD is strong on feature breadth but thin on the mechanics, policy, and edge-case decisions needed to actually build and ship each feature. Grouped by area:

## Account & Identity
- No account deletion / data export self-service flow (needed for GDPR/CCPA "right to erasure" and "right to access").
- No email verification flow specified, despite email/password signup.
- No session/device management (e.g., "log out of all devices," view active sessions).
- No specification of what happens to a Premium user's data/limits on downgrade or subscription lapse.

## AI Coach
- No definition of underlying prompting strategy, conversation memory/context window, or how much user history is fed to the model.
- No safety/guardrail requirement for sensitive content — journal entries and AI chat may surface mental-health-adjacent content (stress, self-harm mentions, spiritual crisis); the PRD has no moderation or crisis-resource policy.
- No cost-control requirement: unlimited AI requests for Premium users is an open-ended cost liability with no stated rate limit, caching strategy, or per-request budget.
- No fallback behavior specified when Claude API or OpenAI API is unavailable or rate-limited.
- No definition of which provider (Claude vs. OpenAI) handles which capability — the PRD lists both with no division of responsibility.

## Habits / Streaks
- "Recovery streak" is named as a tracked field but its rules are undefined (grace days? streak freezes? how many, how earned?).
- No definition of habit "milestones" (which day counts trigger celebration: 7/30/100/365?).
- No timezone/day-boundary rule for when a "day" resets for streak purposes (critical — a naive UTC cutoff will break streaks for non-UTC users).

## Scheduling & Calendar
- No external calendar sync (Google Calendar / Outlook), despite professionals and entrepreneurs being named as target users who almost certainly have existing calendars — double entry is a strong churn risk.
- No conflict-detection rule for overlapping time blocks/events.
- No specification of recurrence rule format (custom vs. iCal RRULE).

## Notifications
- No specification of delivery channels beyond a bare list of reminder types (push? email? in-app only?). Capacitor apps need native push (APNs/FCM) which is nontrivial infrastructure not mentioned.
- No user-configurable quiet hours / notification frequency caps.
- No specification of how "smart" reminder timing is determined (fixed time vs. AI-adjusted).

## Monetization
- No payment provider named (Stripe, Paddle, RevenueCat for mobile IAP, etc.).
- No pricing, billing interval, trial period, or refund/cancellation policy.
- Mobile app stores require IAP for digital subscriptions (Apple/Google policy) — not addressed, and this materially affects the payment architecture if Capacitor apps ship to app stores.

## Data & Privacy
- No data retention/deletion policy for journal entries (arguably the most sensitive data in the product).
- No encryption-at-rest requirement, despite journal/mood data being highly sensitive.
- No stated compliance target (GDPR, CCPA, HIPAA-adjacent for health data from fitness/wearables).
- No terms of service / privacy policy deliverable mentioned.

## Internationalization
- Target audience (students, professionals, spiritual users) implies a global, multi-language, multi-religion user base (e.g., prayer reminders), but there's no i18n/l10n requirement, and no mention of which faiths/calendars (e.g., Islamic prayer times, Hebrew calendar) the "Prayer reminders" feature must support.

## Analytics/Admin
- "Productivity Score" is referenced on the dashboard with no definition of its formula/inputs.
- Admin role lists capabilities (user management, analytics, subscriptions, system config) with no detail on what admin UI/API surface is needed.
- No audit logging requirement for admin actions on user data.

## Non-Functional
- "Offline support (future)" is acknowledged but conflict-resolution strategy for eventual offline sync is not addressed even at a high level.
- No explicit performance targets (page load time, API p95 latency, AI response time budget).
- No uptime/SLA target.
- No specified test coverage threshold despite "comprehensive testing" being a stated principle.

## Search
- No search functionality mentioned anywhere (searching tasks, journal entries, or past AI conversations), which becomes necessary once a user has months of data.
