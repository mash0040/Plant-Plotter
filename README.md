# Plant Plotter

Plant Plotter is a full-stack garden planning and tracking app. Create gardens, arrange plants in a visual planner, explore companion planting guidance, and keep track of garden care.

**[Open the live app](https://www.plantplotter.me)**

## Demo

Explore the app with the shared demo account:

- Email: demo@plantplotter.com
- Password: demo123

The demo includes five sample gardens with saved layouts and care history. Its account details are protected; you can still manage gardens, use the planner, and track care. Create your own account for a personal workspace.

## Project Background

Plant Plotter began as a client-focused final group project. After the initial delivery, I continued developing it independently, focusing on authentication and password reset, validation, planner and tracker workflows, mobile usability, performance, automated checks, and live deployment.

## Features

- Garden creation, editing, and saved layouts.
- Visual plant placement, footprint validation, and row planting with mobile-friendly controls.
- Plant library with growing information and companion planting guidance.
- Care activity logs, completion history, and recurring tasks organized into today, upcoming, and overdue views.
- Local weather in the tracker using browser location access.
- Account registration, sign-in, email password reset, display-name editing, and account deletion.

## Stack and Architecture

| Layer | Technology | Live deployment |
| --- | --- | --- |
| Frontend | Next.js 15, React 19, Tailwind CSS | Vercel |
| API | Node.js, Express, JWT sessions in httpOnly cookies, bcrypt | Render |
| Database | MySQL 8 | Aiven |

The frontend calls the Express API at `api.plantplotter.me`; the API validates requests and persists garden and account data in MySQL. Open-Meteo supplies weather data, Resend delivers password-reset emails, and GitHub Actions runs tests, lint, and the frontend build.

```text
plantplotter/          Next.js frontend
plantplotter_backend/  Express API
plantplotter_db/       MySQL schema, demo seed, and migrations
```

## Local Setup

Prerequisites: Node.js 22, npm, and MySQL 8 with a user able to create and use the `garden_plotter` database.

1. Clone the repository and install dependencies:

   ```sh
   git clone https://github.com/mash0040/Plant-Plotter.git
   cd Plant-Plotter
   npm ci
   ```

2. Copy the environment templates:

   ```sh
   cp plantplotter/.env.local.example plantplotter/.env.local
   cp plantplotter_backend/.env.example plantplotter_backend/.env
   ```

   In Windows PowerShell, use `Copy-Item` in place of `cp`.

3. Set your MySQL credentials and a private `JWT_SECRET` in `plantplotter_backend/.env`. Keep the templates' localhost URLs for local development. Email settings can stay blank locally; password-reset links then appear in the backend terminal. See the [backend environment template](plantplotter_backend/.env.example) for email and production TLS settings. Keep real secrets out of Git and frontend variables.

4. Follow the [database setup instructions](plantplotter_db/README.md#fresh-installation) to import the schema and optional local/demo seed. Fresh installations must skip all upgrade migrations. Existing databases should follow the [migration guide](plantplotter_db/README.md#migrations).

5. Start both applications from the repository root:

   ```sh
   npm run dev
   ```

   Open [localhost:3000](http://localhost:3000). The API runs at `http://localhost:5001/api`. To run each service separately, use `npm run dev:frontend` and `npm run dev:backend` in separate terminals.

## Checks

Run from the repository root:

```sh
npm test --workspace=plantplotter
npm test --workspace=plantplotter_backend
npm run lint --workspace=plantplotter
npm run build --workspace=plantplotter
```

The build reads `NEXT_PUBLIC_API_URL` from the frontend environment. CI uses `https://api.plantplotter.me/api`. See the [database validation guide](plantplotter_db/README.md#validation) for testing a fresh database with Docker.

## Known Limitations

- Light theme only.
- Sessions expire and require signing in again; refresh tokens are not implemented.
- Tracker weather requires browser location permission and cannot use garden labels as geographic addresses.
- Quick Log requires a selected plant; whole-garden logging is not available.
- Email reminders, weather alerts, public garden sharing, and public profiles are not implemented.

## Security

See [SECURITY.md](SECURITY.md) for authentication, session handling, CSRF, deployment requirements, and browser security headers.

## License

[MIT License](license).
