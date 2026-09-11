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

GitHub Actions runs the frontend tests and linting before building with this production API URL. Vercel should also define `NEXT_PUBLIC_API_URL` for deployed builds.

The API issues authentication through an httpOnly cookie. The shared API client uses credentialed fetch requests automatically, so feature code should continue using `src/lib/api.js` instead of calling protected backend endpoints directly. Unsafe API requests also receive the required CSRF protection header there.

Use `plantplotter/.env.local` for local values. Keep `plantplotter/.env.local.example` safe for documented defaults. Do not commit real local environment files.
Only `NEXT_PUBLIC_*` values should be placed in frontend environment files because they are exposed to browser code.

## Theme support

The application currently uses a light theme for both light and dark system appearance.
Tailwind v4's `dark` variant is defined in `src/styles/globals.css` and requires
`class="dark"` on the root `<html>` element. The application does not set that class;
existing `dark:` utilities are dormant. A `dark` class on a nested component does not
enable them. The legacy JavaScript Tailwind config is not loaded by the current CSS
entry point and does not control theme activation.

The root layout and global styles retain `color-scheme: light` for browser controls.
Full dark mode is future work and will require a complete palette, theme selection,
preference persistence, initial-load handling, and visual/contrast testing across
routes and overlays before enabling the root selector.

## Commands

From this folder:

```sh
npm run dev
npm run test
npm run lint
npm run build
npm run start
```

From the repository root:

```sh
npm run dev:frontend
npm test --workspace=plantplotter
npm run lint --workspace=plantplotter
npm run build --workspace=plantplotter
```
