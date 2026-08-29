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
- Deploying and operating the application across Vercel, Render, and Aiven MySQL.
- Configuring environment variables, TLS database connections, CORS, custom API domain routing, DNS, CI with GitHub Actions, and transactional email.

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
- Deployed on Render
- CI checks via GitHub Actions

### Database

- MySQL 8
- Hosted on Aiven managed MySQL
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

The committed example files are safe templates only. Keep real secrets in local environment files and in the hosting provider's environment variable settings.

### Frontend environment

`plantplotter/.env.local` is read by Next.js during local development and builds.

| Variable | Local value | Production value |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:5001/api` | `https://api.plantplotter.me/api` |
| `NEXT_PUBLIC_APP_NAME` | `PlantPlotter` | `PlantPlotter` |
| `NEXT_PUBLIC_APP_VERSION` | placeholder app version | placeholder app version |

Only `NEXT_PUBLIC_*` values are exposed to the browser. Do not put private secrets in frontend environment files.

### Backend environment

`plantplotter_backend/.env` is read by the Express API through `dotenv`.

| Variable | Purpose |
| --- | --- |
| `PORT` | Local API port. Default local value is `5001`. |
| `NODE_ENV` | Runtime mode, usually `development`, `test`, or `production`. |
| `FRONTEND_URL` | Comma-separated list of allowed browser origins for CORS. Local value is `http://localhost:3000`. |
| `DB_HOST` | MySQL host. Use your local MySQL host locally and the Aiven host in production. |
| `DB_PORT` | MySQL port. Default is `3306`. |
| `DB_USER` | MySQL username. |
| `DB_PASSWORD` | MySQL password. |
| `DB_NAME` | MySQL database name. The active local database is `garden_plotter`. |
| `DB_SSL` | Enables MySQL TLS. Local default is `false`; production must be `true`. |
| `DB_SSL_REJECT_UNAUTHORIZED` | Verifies the database certificate. Production must be `true`. |
| `DB_SSL_CA_PATH` | Filesystem path to the trusted Aiven CA certificate in production. |
| `JWT_SECRET` | Required signing secret for JWTs. Use a long private value. |
| `JWT_EXPIRES_IN` | JWT lifetime, for example `1h` locally. |
| `PASSWORD_RESET_BASE_URL` | Frontend password reset URL. Local value is `http://localhost:3000/reset-password`. |
| `EMAIL_PROVIDER` | Email provider for password reset, currently `resend` or `sendgrid`. |
| `EMAIL_FROM` | Verified sender address for password reset email. |
| `RESEND_API_KEY` | Resend API key when `EMAIL_PROVIDER=resend`. |
| `SENDGRID_API_KEY` | SendGrid API key when `EMAIL_PROVIDER=sendgrid`. |

Production database TLS must remain fail-closed:

```text
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
DB_SSL_CA_PATH=/etc/secrets/aiven-ca.pem
```

The backend refuses to start in production unless verified TLS and a CA certificate path are configured.

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
npm run dev:backend
npm run dev:frontend
```

Default local URLs:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5001/api`

## Checks

```sh
npm run lint --workspace=plantplotter
npm test --workspace=plantplotter_backend
```

For the same frontend build environment used in CI, set the production API URL:

```sh
NEXT_PUBLIC_API_URL=https://api.plantplotter.me/api npm run build --workspace=plantplotter
```

On Windows PowerShell:

```powershell
$env:NEXT_PUBLIC_API_URL='https://api.plantplotter.me/api'
npm run build --workspace=plantplotter
```

## Deployment

The live version uses:

- Frontend: Vercel
- Backend API: Render
- Database: Aiven MySQL
- Email: Resend
- CI: GitHub Actions
- Domain/DNS: `plantplotter.me` with `api.plantplotter.me` routing to the backend

Production secrets should live in the platform that uses them:

- Vercel stores frontend public build/runtime variables such as `NEXT_PUBLIC_API_URL`.
- Render stores backend variables such as database credentials, CORS origins, JWT secret, password reset URL, and email provider credentials.
- Aiven provides the MySQL host, port, user, password, database name, and CA certificate.
- GitHub Actions sets `NEXT_PUBLIC_API_URL=https://api.plantplotter.me/api` for frontend builds and should not store database or JWT secrets for the current test/build workflow.

## Demo

Try the app live at https://www.plantplotter.me

**Demo account:**

- Email: demo@plantplotter.com
- Password: demo123

## Known Limitations

- Refresh tokens are not implemented yet; expired sessions redirect users to sign in again.
- Weather currently uses fixed Ottawa/default coordinates instead of user- or garden-specific location.
- Email reminders, weather alerts, public garden sharing, and public profiles are planned future improvements.
- Frontend automated tests are not configured yet.

## Status

This repository represents my continued development version of Plant Plotter after the original client-focused group project delivery. The current version focuses on stable full-stack functionality, mobile-friendly user flows, secure account features, production performance, and live deployment.

## License

This continued-development version is shared for portfolio and educational purposes. See the [license](./license) file for details.
