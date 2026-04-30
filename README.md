# Plant Plotter

Plant Plotter is a full-stack garden planning and tracking app. Users can create gardens, plan plant placement visually, review companion planting guidance, and track garden care through activity logs and planned tasks.

## Project Background

Plant Plotter began as a client-focused final group project. After the initial delivery, I continued developing it independently to make the application more stable, complete, and portfolio-ready.

My continued work focused on improving authentication, validation, garden management, planner UX, tracker workflows, profile/account settings, documentation, and deployment readiness.

## Current Features

- Public landing page with dedicated login/register flow
- User registration and login with JWT-protected routes
- Garden create, edit, delete, and detail views
- Visual garden planner with plant placement, footprint validation, row planting, and save flow
- Plant library with categories and plant details
- Companion planting guidance based on the app’s plant dataset
- Garden tracker with activity logs and planned care tasks
- Today, upcoming, and overdue task organization
- Weather-based tracker card using Open-Meteo with fixed Ottawa/default weather
- Profile settings and account deletion

## Tech Stack

- Frontend: Next.js, React, Tailwind CSS
- Backend: Node.js, Express.js
- Database: MySQL
- Authentication: JWT
- Weather: Open-Meteo API
- Testing: Node test runner for backend validation tests

## Project Structure

```text
plantplotter/          Next.js frontend
plantplotter_backend/  Express API
plantplotter_db/       MySQL schema, seed data, and database notes
```

## Local Setup

### Prerequisites

- Node.js and npm
- MySQL
- A local MySQL user with permission to create and use the `garden_plotter` database

### Install dependencies

```sh
npm install
```

### Create environment files

```sh
cp plantplotter/.env.local.example plantplotter/.env.local
cp plantplotter_backend/.env.example plantplotter_backend/.env
```

On Windows PowerShell:

```powershell
Copy-Item plantplotter/.env.local.example plantplotter/.env.local
Copy-Item plantplotter_backend/.env.example plantplotter_backend/.env
```

Update the local files with your own values. Do not commit real `.env` or `.env.local` files.

Common values include:

- Frontend: `NEXT_PUBLIC_API_URL`
- Backend: `PORT`, `FRONTEND_URL`, MySQL credentials, and `JWT_SECRET`

## Database Setup

The active database files are:

- `plantplotter_db/plantPlotterSchema.sql`
- `plantplotter_db/data_instance.sql`

Run the schema first, then the seed file:

```sh
cd plantplotter_db
mysql -u <user> -p < plantPlotterSchema.sql
mysql -u <user> -p < data_instance.sql
```

The active database name is `garden_plotter`. The seed file is intended for local/demo setup only.

## Running Locally

Start the frontend and backend together:

```sh
npm run dev
```

Or run them separately:

```sh
npm run dev:backend
npm run dev:frontend
```

Default local URLs:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5001/api`

## Checks

```sh
npm run lint --workspace=plantplotter
npm run build --workspace=plantplotter
npm test --workspace=plantplotter_backend
```

## Demo Data

The database seed file includes demo users, gardens, plants, tasks, and activities for local testing. These are intended for local/demo use only and should not be used for a real deployment.

## Known Limitations

- Refresh tokens are not implemented yet; expired sessions redirect users to sign in again.
- Forgot password is marked as coming soon; real reset emails are not implemented yet.
- Weather currently uses fixed Ottawa/default coordinates instead of user- or garden-specific location.
- Email reminders, weather alerts, public garden sharing, and public profiles are planned future improvements.
- Frontend automated tests are not configured yet.

## Status

This repository represents my continued-development version of Plant Plotter after the original client-focused group project delivery. The current version focuses on stable full-stack functionality, clean user flows, and deployment readiness.
