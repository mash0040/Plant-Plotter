# Plant Plotter Frontend

This folder contains the Next.js frontend for Plant Plotter. It requires the Express backend API from `plantplotter_backend/` for authentication, gardens, plant library data, planner saves, tracker tasks, and activity logs.

For full project setup, database instructions, demo accounts, and backend configuration, see the root `README.md`.

## Environment

Create a local frontend environment file from the example:

```sh
cp .env.local.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.local.example .env.local
```

The main frontend setting is:

```text
NEXT_PUBLIC_API_URL=http://localhost:5001/api
```

For production builds, use:

```text
NEXT_PUBLIC_API_URL=https://api.plantplotter.me/api
```

The GitHub Actions frontend build uses this production API URL. Vercel should also define `NEXT_PUBLIC_API_URL` for deployed builds.

Use `plantplotter/.env.local` for local values. Keep `plantplotter/.env.local.example` safe for documented defaults. Do not commit real local environment files.
Only `NEXT_PUBLIC_*` values should be placed in frontend environment files because they are exposed to browser code.

## Commands

From this folder:

```sh
npm run dev
npm run lint
npm run build
npm run start
```

From the repository root:

```sh
npm run dev:frontend
npm run lint --workspace=plantplotter
npm run build --workspace=plantplotter
```
