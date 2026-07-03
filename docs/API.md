# API Reference

Quick-reference index of every implemented endpoint, grouped by module. This file is a snapshot
maintained alongside each milestone — **Swagger (`/api/docs` on the running backend) is the
authoritative, always-current source** for request/response shapes, since it's generated directly
from the DTOs and never drifts out of sync with the code the way a hand-written doc can.

All endpoints except `auth/*` and `GET /health` require `Authorization: Bearer <access token>`
(`JwtAuthGuard`). Every user-owned resource is scoped to the requesting user; a resource that
exists but belongs to someone else returns `404`, not `403` (see `docs/05-architecture.md`).

## Health

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness/readiness check (DB connectivity). |

## Auth (`docs/`, Milestone 2)

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create an account; starts a session (access token in body, refresh token as an httpOnly cookie). |
| POST | `/auth/login` | Authenticate with email/password; starts a session. |
| POST | `/auth/refresh` | Exchange the refresh cookie for a new access/refresh pair (rotation). |
| POST | `/auth/logout` | Revoke the current refresh token; ends the session. |

## Users (Milestone 2)

| Method | Path | Description |
|---|---|---|
| GET | `/users/me` | The authenticated user's profile. |

## Tasks (Milestone 4)

| Method | Path | Description |
|---|---|---|
| GET | `/tasks` | Paginated list — filter by `status`/`priority`/`tag`/`search`/date ranges, sort, paginate. |
| GET | `/tasks/:id` | One task. |
| POST | `/tasks` | Create a task. |
| PATCH | `/tasks/:id` | Update a task. |
| DELETE | `/tasks/:id` | Soft-delete a task. |
| PATCH | `/tasks/:id/complete` | Mark a task complete (sets `status` and `completedAt`). |

## Routines (Milestone 5)

| Method | Path | Description |
|---|---|---|
| GET | `/routines` | List — optionally filter by `isActive`. |
| GET | `/routines/:id` | One routine, with its steps. |
| POST | `/routines` | Create a routine (optionally with an initial `steps` array, in one call). |
| PATCH | `/routines/:id` | Update a routine's own fields (not its steps). |
| DELETE | `/routines/:id` | Hard-delete a routine (steps cascade). |
| PATCH | `/routines/:id/activate` | Set `isActive: true`. |
| PATCH | `/routines/:id/deactivate` | Set `isActive: false`. |
| POST | `/routines/:id/duplicate` | Clone a routine and its steps (name suffixed "(Copy)"). |
| POST | `/routines/:id/steps` | Add a step (appended at the end). |
| PATCH | `/routines/:id/steps/reorder` | Reorder all of a routine's steps in one call. |
| PATCH | `/routines/:id/steps/:stepId` | Update one step. |
| DELETE | `/routines/:id/steps/:stepId` | Remove one step. |

## Habits (Milestone 6)

| Method | Path | Description |
|---|---|---|
| GET | `/habits` | Paginated list — filter by `isActive`/`targetFrequency`/`category`/`search`, sort (including by computed `completionPercent`). |
| GET | `/habits/today` | Every active habit, each with today's/current-period progress — powers Today's Habits and the Dashboard's Quick Complete panel. |
| GET | `/habits/summary` | `{ habitsCompletedToday, totalActiveHabits, completionPercentage }` — powers the Dashboard's habit stat cards. |
| GET | `/habits/history` | Paginated `HabitLog` timeline — optionally filter by `habitId`/`dateFrom`/`dateTo`. Powers Habit History and the Calendar Heatmap. |
| GET | `/habits/:id` | One habit, with computed progress. |
| POST | `/habits` | Create a habit (409 on a duplicate name for the same user). |
| PATCH | `/habits/:id` | Update a habit. |
| DELETE | `/habits/:id` | Soft-delete a habit. |
| POST | `/habits/:id/log` | Log a date (defaults to today; 409 if that date already has a log — use PATCH instead). |
| PATCH | `/habits/:id/log` | Update the log for a date (defaults to today; 404 if none exists). |
| DELETE | `/habits/:id/log` | Remove the log for a date (defaults to today; 404 if none exists). |

## Not yet implemented

Planner, Streaks, Journal, Goals, Calendar, Notifications, AI Coach, Analytics, Gamification,
Subscriptions, Admin — see `docs/09-roadmap.md` for milestone sequencing.
