# Plant Plotter

Plant Plotter is a full-stack garden planning application for creating garden spaces, managing layouts, browsing plant data, and tracking garden activity. It helps users manage garden spaces, plan layouts, track garden details, and work with a searchable plant library.

## Features

- User authentication with JWT-based sessions
- Protected frontend routes and expired-session handling
- Garden create, edit, delete, and detail views
- Garden validation for names, descriptions, dimensions, location, soil type, and status
- Metric and imperial garden dimension entry with backend storage in meters
- Plant library browsing and plant selection for garden planning
- Role-based admin protection for plant library create, update, and delete actions


## Tech Stack

- Frontend: Next.js, React, Tailwind CSS
- Backend: Express.js
- Database: MySQL
- Authentication: JWT

## Project Structure

```text
plantplotter/          Next.js frontend
plantplotter_backend/  Express API
plantplotter_db/       MySQL schema, seed data, and database notes
```

## Prerequisites

- Node.js and npm
- MySQL
- A local MySQL user with permission to create and use the `garden_plotter` database

## Environment Setup

Install dependencies from the repository root:

```sh
npm install
```

Create local environment files from the safe examples:

```sh
cp plantplotter/.env.local.example plantplotter/.env.local
cp plantplotter_backend/.env.example plantplotter_backend/.env
```

On Windows PowerShell:

```powershell
Copy-Item plantplotter/.env.local.example plantplotter/.env.local
Copy-Item plantplotter_backend/.env.example plantplotter_backend/.env
```

Then update the local files with your own values:

- `plantplotter/.env.local`
  - `NEXT_PUBLIC_API_URL`, usually `http://localhost:5001/api`
- `plantplotter_backend/.env`
  - MySQL credentials
  - `JWT_SECRET`
  - `PORT`, usually `5001`
  - `FRONTEND_URL`, usually `http://localhost:3000`

Do not commit real `.env` or `.env.local` files.

## Database Setup

The active database files are:

- Schema: `plantplotter_db/plantPlotterSchema.sql`
- Seed data: `plantplotter_db/data_instance.sql`

Legacy SQL files are archived in `plantplotter_db/legacy/` and are not used by the current app.

Run the schema first, then the seed file:

```sh
cd plantplotter_db
mysql -u <user> -p < plantPlotterSchema.sql
mysql -u <user> -p < data_instance.sql
```

The schema creates and selects the `garden_plotter` database. The seed file also selects `garden_plotter` and includes demo users, sample gardens, plant library data, tasks, and activities.

## Running Locally

Start the frontend and backend together from the repository root:

```sh
npm run dev
```

Or start each app separately:

```sh
npm run dev:backend
npm run dev:frontend
```

Default local URLs:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5001/api`

## Demo Accounts

When the seed file is loaded locally, it creates demo-only accounts for testing.

| Role | Email | Password |
|---|---|---|
| Demo User | demo@plantplotter.com | demo123 |
| Admin | admin@plantplotter.com | admin123 |
| User | user@plantplotter.com | user123 |

These accounts are for local/demo use only.

## Scripts

```sh
npm run dev
npm run dev:frontend
npm run dev:backend
```

## Testing and Checks

Backend validation tests use Node’s built-in test runner:

```sh
npm test --workspace=plantplotter_backend
```
Frontend linting and production build checks:

```sh
npm run lint --workspace=plantplotter
npm run build --workspace=plantplotter
```

## Screenshots

Screenshots will be added as the portfolio presentation is finalized.

- Login and sign-up
- Garden list
- Garden create/edit validation
- Garden details
- Garden planner
- Plant library
- Tracker

## Known Limitations

- Frontend automated tests are not configured yet.
- Rate limiting is not implemented yet.
- Google sign-in is not implemented yet.
- PDF export should be verified before being presented as a supported feature.
- Seed data is intended for local demos and may need cleanup before rerunning repeatedly against the same database.

## Planned Improvements

- Add frontend tests for critical auth and garden form behavior
- Add rate limiting for authentication and write-heavy API routes
- Add Google sign-in
- Verify and polish PDF export
- Add lightweight caching where it meaningfully improves repeated reads
- Add finalized portfolio screenshots and demo notes
- Garden task and activity tracking foundations
