# 3. Assumptions Requiring Clarification

These are the decisions this design makes provisionally, in order to move forward. Each should be confirmed with the product owner before or during implementation — they materially affect architecture, cost, and timeline.

## Platform & delivery
1. **Web-first, mobile-second.** Assumed the Angular PWA is the primary MVP surface, with Capacitor-wrapped iOS/Android apps following once the web app is stable — not three platforms launched simultaneously. *(Affects roadmap sequencing.)*
2. **App store distribution is in scope for MVP or immediately after**, not a distant future item — since Capacitor is called out explicitly in the stack. Needs confirmation, because it changes the payment architecture (see below).

## Monetization
3. **Stripe** is assumed as the web payment provider. For native iOS/Android builds, **Apple/Google in-app purchase** will likely be required by store policy for a digital subscription — assumed acceptable to launch web-only billing first and add IAP later (e.g., via RevenueCat) rather than building both at once.
4. Pricing tiers, trial length, and exact Free-vs-Premium limits (e.g., "unlimited AI requests" needs a soft cap for cost control) are **not yet defined** — assumed placeholder limits will be used in design (documented in the architecture doc) and finalized by the product owner before launch.

## AI
5. **Claude API is assumed primary** for coaching/conversational features (tone, safety, personal-coach framing), with **OpenAI as a secondary/fallback provider** or for a specific sub-capability (e.g., embeddings) — the PRD lists both with no stated division, so this is a design choice, not a requirement.
6. Assumed AI requests are **rate-limited per tier** even for "unlimited" Premium (e.g., a high soft ceiling) purely to bound infrastructure cost — not a literal unlimited backend allowance.
7. Assumed AI coach conversations are **not** intended to serve as a substitute for professional mental-health support — a disclaimer/guardrail is assumed acceptable to add even though not requested, given journal content sensitivity.

## Data & compliance
8. Assumed the initial target market is **primarily US/English-speaking**, with full i18n and non-Gregorian calendar/prayer-time support deferred rather than required for MVP — needs confirmation given the "Spiritual Users" segment.
9. Assumed **no HIPAA-level compliance** is required even though fitness/health data is tracked in Phase 3 — treated as general wellness data, not regulated health data, pending confirmation once wearable integrations are scoped.
10. Assumed standard GDPR/CCPA-style data rights (export, delete) should be designed in from the start even though not explicitly requested, since journal/mood data is sensitive personal data and EU/CA users are plausible given a horizontal consumer audience.

## Scale & team
11. Assumed a **single small team** (not multiple parallel squads) building this feature-by-feature per the stated development principle — the roadmap milestone estimates assume this. Team size directly changes the timeline in the roadmap doc.
12. Assumed **B2C individual accounts only** for MVP — no organization/workspace concept until Phase 2 "team collaboration," so the database design does not need multi-tenant org isolation yet.

## Infrastructure
13. Assumed **Upstash Redis** is acceptable for caching/rate-limiting, but a **separate Redis instance** (e.g., Railway-hosted) may be needed for BullMQ specifically, since Upstash's REST-first Redis has known limitations with BullMQ's blocking-command usage — flagged as a technical risk to validate early, not an assumption to silently work around.
14. Assumed offline support genuinely stays "future" (as PRD states) and MVP requires only standard online connectivity with normal loading/error states — no offline-first sync engine in v1.

## Notifications
15. Assumed reminders are delivered via a **combination of web push (PWA) + native push (mobile) + optional email digest**, since the PRD lists reminder categories but not channels — needs product confirmation, as native push requires FCM/APNs setup effort not currently budgeted.

---

**Recommendation:** resolve items 3, 4, 5, 6, 13, and 15 before backend work begins — they change schema (subscriptions), infra (queueing), and cost model (AI). The rest can be finalized during the relevant milestone.
