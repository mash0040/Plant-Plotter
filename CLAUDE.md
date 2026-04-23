# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PlantPlotter is a full-stack garden planning web app. Users design garden layouts on an interactive canvas, track activities, manage tasks, and get plant compatibility recommendations. Built as a Centennial College (CST8268) course project.

## Current Goal
Phase 1: Audit and fix. Remove redundant code, fix security issues, ensure app runs correctly end to end. Do not add features.

## Development Commands

From the **repo root**:
```bash
npm run install:all   # Install dependencies for all workspaces
npm run dev           # Run frontend + backend concurrently
npm run dev:frontend  # Next.js dev server only (port 3002)
npm run dev:backend   # Express backend only (port 3000)
npm run build         # Production build (frontend)
```

From **plantplotter/** (frontend):
```bash
npm run lint          # ESLint
```

No test framework is configured — the backend test script is a placeholder.

## Architecture

This is a monorepo with two workspaces:

- **`plantplotter/`** — Next.js 15 frontend (App Router, React 19, Tailwind CSS 4)
- **`plantplotter_backend/`** — Express.js 5 REST API
- **`plantplotter_db/`** — MySQL schema (`plantPlotterSchema.sql`) and seed data (`data_instance.sql`)

### Frontend (`plantplotter/src/`)

Routing uses the **Next.js App Router** (`src/app/`). All pages use `'use client'` — there is no server-side data fetching. Protected routes are guarded by the `ProtectedRoute` component.

| Route | Purpose |
|---|---|
| `/login` | Auth (login + register) |
| `/gardens` | List all user gardens |
| `/gardens/[id]` | Garden detail view |
| `/garden` | Interactive canvas designer |
| `/tracker` | Activity log + task list |
| `/profile` | User settings |

**State management** is React Context only (`useAuth` in `src/hooks/useAuth.js`). Auth state and JWT token are persisted to `localStorage`.

**API calls** all go through `src/lib/api.js`, which attaches the JWT `Authorization: Bearer <token>` header automatically.

**Canvas** (`src/components/Garden/GardenCanvas.jsx`) uses Fabric.js 6 for interactive plant placement. Drag-and-drop from the plant library uses `@dnd-kit`.

### Backend (`plantplotter_backend/`)

Entry point: `server.js`. Routes live in `routes/` and are mounted at `/api/*`:

| Route file | Endpoint prefix |
|---|---|
| `auth.js` | `/api/auth` |
| `users.js` | `/api/users` |
| `gardens.js` | `/api/gardens` |
| `planted_items.js` | `/api/plants` |
| `plantLibrary.js` | `/api/plant-library` |
| `task.js` | `/api/tasks` |
| `activities.js` | `/api/activities` |
| `advisory.js` | `/api/advisory` |

JWT verification is enforced by `middleware/verifyToken.js` on all protected routes.

Database: MySQL via `mysql2/promise` connection pool (config in `config/db.js`). The pool size is 10.

### Environment Variables

**`plantplotter_backend/.env`** (required to run the backend):
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=<your_password>
DB_NAME=garden_plotter
PORT=3000
FRONTEND_URL=http://localhost:3002
JWT_SECRET=<secret>
JWT_EXPIRES_IN=1h
```

**`plantplotter/.env.local`**:
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Key Patterns

- The frontend runs on port **3002**, the backend on port **3000**. CORS in `server.js` allows ports 3000, 3001, and 3002.
- Garden layout data is stored as JSON blobs in the database (positions, emojis, sizes).
- The plant library is seeded data — `plantLibrary.js` routes serve read access; entries can be modified by admin users.
- `gardens.js` is the largest route file (~1090 lines) and handles planted items as nested resources.
- Dark mode is toggled via a `dark` class on the `<html>` element.

## Security Notes
- JWT_SECRET must come from .env only — never hardcode a fallback value in code
- .env files are gitignored and must never be committed


## Commenting Rules
Only add comments to complex or non-obvious logic. Do not comment self-explanatory code, simple variable assignments, or standard patterns. A function named `getUserById` does not need a comment explaining it gets a user by ID.

## Known Issues (Phase 2)
- PlantEditModal and related UI (garden/page.jsx:138-164) does not handle 403 responses from plant library mutation routes. Non-admin users will get a silent failure. Fix: hide controls for non-admins or surface 403 as user-friendly error.
