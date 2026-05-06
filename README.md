# Plant Plotter

Plant Plotter is a full-stack garden planning and tracking app. Users can create gardens, visually plan plant placement, review companion planting guidance, and track garden care through activity logs and scheduled tasks.

Live site: https://www.plantplotter.me

## Project Background

Plant Plotter began as a client-focused final group project. After the initial delivery, I continued developing it independently to make the application more stable, complete, mobile-friendly, and production-ready.

My continued work focused on authentication, validation, garden management, planner UX, tracker workflows, password reset, mobile responsiveness, performance, documentation, and live deployment.

## My Continued Contributions

After the group project delivery, I independently improved and expanded the application by:

- Strengthening authentication, protected routes, expired-session handling, and account management.
- Implementing secure password reset with expiring single-use tokens and Resend email delivery.
- Improving the garden planner with footprint validation, row planting, mobile-safe planning controls, and clearer save/navigation flows.
- Refactoring tracker workflows for activity logs, scheduled tasks, task status handling, and mobile-friendly modals.
- Improving production performance by reducing duplicate API calls, adding lightweight garden summary loading, caching plant library data, applying MySQL indexes, and upgrading database VM resources.
- Deploying the frontend, backend, and database across Vercel, Azure App Service, and an Azure VM-hosted MySQL database.
- Configuring environment variables, CORS, custom API domain routing, DNS, GitHub Actions deployment, and transactional email.

## Current Features

- Public landing page with dedicated login and create-account flows
- User registration and login with JWT-protected routes
- Secure password reset via email
- Garden create, edit, delete, and detail views
- Visual garden planner with plant placement, footprint validation, row planting, and save flow
- Mobile-friendly planner flow that prioritizes row planting over drag-and-drop
- Plant library with categories and plant details
- Companion planting guidance based on the app’s plant dataset
- Garden tracker with activity logs and planned care tasks
- Today, upcoming, and overdue task organization
- Task types for planting, watering, fertilizing, pruning, weeding, harvesting, inspection, treatment, and general tasks
- Weather-based tracker card using Open-Meteo with fixed Ottawa/default weather
- Profile settings and account deletion
- Responsive mobile layout improvements across planner, tracker, garden details, forms, and modals

## Tech Stack

### Frontend

- Next.js 15
- React 19
- Tailwind CSS
- Deployed on Vercel

### Backend

- Node.js
- Express.js
- JWT authentication
- bcrypt password hashing
- Rate limiting
- Deployed on Azure App Service
- CI/CD via GitHub Actions

### Database

- MySQL 8
- Hosted on an Azure Virtual Machine
- Schema, seed data, and migration scripts included

### Integrations

- Open-Meteo API for weather data
- Resend for transactional password reset emails

## Project Structure

```text
plantplotter/          Next.js frontend
plantplotter_backend/  Express API
plantplotter_db/       MySQL schema, seed data, migrations, and database notes
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

Frontend:
- NEXT_PUBLIC_API_URL

Backend:
- PORT
- FRONTEND_URL
- DB_HOST
- DB_PORT
- DB_USER
- DB_PASSWORD
- DB_NAME
- JWT_SECRET
- JWT_EXPIRES_IN
- EMAIL_PROVIDER
- EMAIL_FROM
- RESEND_API_KEY
- PASSWORD_RESET_BASE_URL

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
Some features may include additional migration scripts in plantplotter_db/, such as password reset, task type updates, and performance indexes. Apply those after the base schema if needed.

## Running Locally

Start the frontend and backend together:

```sh
npm run dev
```

Or run them separately:

```sh
npm run dev: backend
npm run dev: frontend
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

## Deployment
The live version uses: 

- Frontend: Vercel
- Backend API: Azure App Service
- Database: MySQL 8 on Azure Virtual Machine
- Email: Resend
- Domain/DNS: Custom domain with API routing

## Demo

Try the app live at https://www.plantplotter.me

**Demo account:**
- Email: demo@plantplotter.com
- Password: demo123.

## Known Limitations

- Refresh tokens are not implemented yet; expired sessions redirect users to sign in again.
- Weather currently uses fixed Ottawa/default coordinates instead of user- or garden-specific location.
- Email reminders, weather alerts, public garden sharing, and public profiles are planned future improvements.
- Frontend automated tests are not configured yet.

## Status

This repository represents my continued development version of Plant Plotter after the original client-focused group project delivery. The current version focuses on stable full-stack functionality, mobile-friendly user flows, secure account features, production performance, and live deployment.
