# LifeOS AI

Plan Better. Stay Consistent. Become Your Best Self.

An AI-powered personal productivity and growth platform. See [docs/](docs/) for the full product and technical design documentation (vision, architecture, database design, tech stack, roadmap).

## Repository layout

```
lifeos/
├── apps/
│   ├── frontend/          # Angular 20 PWA
│   └── backend/           # NestJS API + worker
├── packages/
│   └── shared-types/      # TypeScript types shared between frontend and backend
├── prisma/
│   └── schema.prisma      # Single Prisma schema, shared by the backend
├── docs/                  # Product & architecture documentation
└── docker-compose.yml     # Local Postgres + Redis
```

See [docs/07-folder-structure.md](docs/07-folder-structure.md) for the rationale and the full intended structure as features are added.

## Prerequisites

- Node.js 20+ (`.nvmrc` pins the minimum; the repo has been developed/tested on Node 26)
- Docker (for local Postgres + Redis via `docker-compose.yml`)

## Getting started

```bash
# 1. Install all workspace dependencies (also generates the Prisma client)
npm install

# 2. Start local Postgres + Redis
npm run docker:up

# 3. Configure the backend
cp apps/backend/.env.example apps/backend/.env
# adjust apps/backend/.env if you changed the docker-compose credentials/ports

# 4. Run the backend and frontend (in separate terminals)
npm run dev:backend    # NestJS API on http://localhost:3000
npm run dev:frontend   # Angular dev server on http://localhost:4200
```

Visit `http://localhost:4200` — the app shell calls the backend's `/health` endpoint and shows whether the API and its database connection are up. This end-to-end check exists specifically to validate the project scaffold (see [docs/09-roadmap.md](docs/09-roadmap.md), Phase 0 exit criteria) before any product feature is built on top of it.

## Common scripts (run from the repo root)

| Command | What it does |
|---|---|
| `npm run build` | Builds `shared-types`, then `frontend`, then `backend`, in dependency order |
| `npm run lint` | Lints frontend and backend |
| `npm run test` | Runs frontend (headless Chrome) and backend (Jest) test suites |
| `npm run dev:frontend` / `npm run dev:backend` | Run each app in watch mode |
| `npm run docker:up` / `npm run docker:down` | Start/stop local Postgres + Redis |

Backend-specific Prisma scripts (`prisma:generate`, `prisma:migrate:dev`, `prisma:studio`) live in `apps/backend/package.json` since the backend is the only consumer of the generated client; run them via `npm run <script> --workspace=backend`.

## Why these choices

Every non-obvious setup decision (npm workspaces over Nx/pnpm, Prisma schema at the repo root, the health-check-first milestone, etc.) is explained inline in code comments at the decision site, and in the architecture/folder-structure docs. Nothing here should require tribal knowledge to understand — if something is unclear, that's a documentation gap, not an intentional omission.

## Documentation

1. [Product vision](docs/01-product-vision.md)
2. [Missing requirements](docs/02-missing-requirements.md)
3. [Assumptions](docs/03-assumptions.md)
4. [Suggested improvements](docs/04-improvements.md)
5. [Architecture](docs/05-architecture.md)
6. [Database design](docs/06-database-design.md)
7. [Folder structure](docs/07-folder-structure.md)
8. [Tech stack](docs/08-tech-stack.md)
9. [Roadmap](docs/09-roadmap.md)
