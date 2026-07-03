# CLAUDE.md

# LifeOS AI

You are working on **LifeOS AI**, a production-grade SaaS application that helps users build discipline, consistency, productivity, and personal growth using AI.

This project is NOT a prototype.

Every implementation must be production-ready.

---

# Primary Goal

Build the highest quality personal operating system using:

- Angular 20
- NestJS
- Prisma
- PostgreSQL
- Redis
- Docker
- Angular Material
- Signals
- JWT Authentication

The application should be modular, scalable, maintainable, testable, and enterprise-grade.

---

# Development Workflow

Before writing ANY code:

1. Read every document inside `/docs`.
2. Review the existing architecture.
3. Review the Prisma schema.
4. Review the folder structure.
5. Review existing modules.
6. Understand how previous milestones were implemented.
7. Reuse existing code whenever possible.

Never assume.

Always inspect the existing implementation first.

---

# Architecture Rules

Follow:

- SOLID Principles
- Clean Architecture
- Feature-based modules
- Single Responsibility Principle
- Dependency Injection
- Composition over inheritance

Never introduce unnecessary complexity.

Never duplicate logic.

---

# Backend Standards

Framework

- NestJS

Database

- Prisma ORM
- PostgreSQL

Caching

- Redis

Authentication

- JWT Access Token
- Rotating Refresh Tokens
- Refresh tokens stored hashed
- httpOnly Cookies

Validation

- class-validator
- class-transformer

Documentation

- Swagger

Security

- Validate all inputs
- Never trust frontend data
- Users can only access their own resources
- Prefer 404 over 403 when hiding resource existence
- Prevent mass assignment
- Never expose sensitive fields

---

# Frontend Standards

Framework

- Angular 20

State Management

- Angular Signals

Routing

- Lazy-loaded feature modules

UI

- Angular Material

Theme

- Dark Mode
- Light Mode

Requirements

- Responsive
- Accessible
- Mobile-friendly
- Loading Skeletons
- Empty States
- Error States

Never use localStorage for authentication tokens.

---

# Folder Structure

Follow the existing project structure.

Do not move files unless absolutely necessary.

Keep features isolated.

Each feature should contain:

- Pages
- Components
- Services
- Store
- Models
- Routes

Shared code belongs inside shared/.

---

# Database Rules

Always:

Create Prisma migrations.

Never edit generated migration files.

Never break existing migrations.

Maintain referential integrity.

Prefer normalized relational models.

Avoid storing redundant data.

Derived values should be calculated whenever practical.

---

# API Rules

Every endpoint must:

- Validate DTOs
- Return consistent error responses
- Use authentication where appropriate
- Follow REST conventions
- Update Swagger documentation

---

# Dashboard Rules

The dashboard should display live data.

Avoid placeholders once the required module exists.

Widgets should reuse existing APIs whenever possible.

Avoid creating unnecessary dashboard-specific endpoints.

---

# Code Quality

Write clean code.

Small functions.

Reusable utilities.

Meaningful names.

Avoid comments that explain obvious code.

Comment only:

- Business rules
- Architectural decisions
- Complex algorithms

---

# Testing

Every milestone must include:

Backend

- Unit Tests
- Controller Tests
- Service Tests

Frontend

- Store Tests
- Component Tests
- Service Tests

Fix failing tests before continuing.

---

# Performance

Avoid unnecessary database queries.

Reuse services.

Use pagination.

Lazy load routes.

Avoid N+1 queries.

Optimize expensive computations.

---

# Documentation

Update whenever architecture changes.

Maintain:

docs/API.md

docs/changelog.md

docs/05-architecture.md

docs/06-database-design.md

docs/07-folder-structure.md

Document every architectural decision.

Explain deviations.

---

# Git Rules

Each milestone must end with:

- Passing builds
- Passing tests
- Updated documentation
- Clean lint
- Git commit

Suggested commit style:

feat(auth):
feat(tasks):
feat(routines):
feat(habits):

Follow Conventional Commits.

---

# Milestone Rules

Only implement ONE milestone at a time.

Do not begin the next milestone unless explicitly instructed.

Stop after completing the requested milestone.

Provide:

1. Summary
2. Architectural decisions
3. Deviations
4. Verification
5. Remaining work

Then wait for approval.

---

# Things To Avoid

Do NOT

- Rewrite existing working code
- Introduce breaking changes
- Duplicate components
- Duplicate services
- Ignore existing architecture
- Change technology stack
- Add dependencies without justification
- Implement unrelated features

---

# Preferred Patterns

Prefer

Signals

DTO validation

Reusable services

Shared components

Composition

Dependency Injection

Feature isolation

Utility functions

Prisma transactions where needed

---

# UI Philosophy

The application should feel like:

- Notion
- Linear
- TickTick
- Arc Browser

Characteristics

- Clean
- Fast
- Minimal
- Premium
- Consistent
- Professional

Spacing and typography should be consistent.

Animations should be subtle.

---

# AI Philosophy

Future AI features should:

Understand the user's

- Habits
- Tasks
- Routine
- Schedule
- Productivity
- Goals

Provide:

- Personalized planning
- Daily coaching
- Productivity insights
- Schedule optimization
- Habit recommendations

AI should assist the user, not replace decision making.

---

# Vision

LifeOS AI should become an intelligent operating system for life.

Everything should eventually connect:

Authentication

↓

Tasks

↓

Routines

↓

Habits

↓

Streaks

↓

Planner

↓

Journal

↓

Notifications

↓

Analytics

↓

AI Coach

↓

Premium

↓

Mobile

Every module should build on previous modules.

Never build isolated features.

Always think long-term.

---

# Before Completing Any Milestone

Verify:

✓ Frontend builds

✓ Backend builds

✓ Tests pass

✓ Lint passes

✓ Prisma migration works

✓ Swagger updated

✓ Documentation updated

✓ Dashboard integration works

✓ No console errors

✓ No TypeScript errors

✓ No TODOs left in production code

---

# Final Rule

Quality is more important than speed.

Always prefer maintainability over cleverness.

Every line of code should be written as if this application will be maintained for the next 10 years.