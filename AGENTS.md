# Plant Plotter Agent Guidelines

Plant Plotter is a portfolio-ready full-stack garden planning and tracking application.

The goal is to keep the application stable, polished, maintainable, and recruiter-ready without adding unnecessary complexity.

## Repository Structure

- `plantplotter/` — Next.js / React frontend
- `plantplotter_backend/` — Express API
- `plantplotter_db/` — MySQL schema and migrations

Read these when relevant:

- `README.md` — current features, setup, deployment, and limitations
- `PRODUCT.md` — product purpose, constraints, and principles
- `DESIGN.md` — UI and design-system direction
- `SECURITY.md` — authentication and security architecture

Do not duplicate or contradict those documents here.

## Working Rules

- Never work directly on `main`.
- Prefer small, focused changes.
- Inspect relevant code before editing.
- Do not refactor unrelated code.
- Preserve the existing stack unless the requested work clearly justifies a change.
- Do not change database schema unless the task requires it.
- Do not introduce new dependencies or UI libraries without a clear need.
- Keep API payloads compatible unless the issue explicitly changes the contract.
- Do not remove files unless they are confirmed unused.
- Do not expose developer/debug information or sensitive implementation details to users.

## Issue Workflow

- GitHub Issues are the source of truth for implementation work.
- Read the entire issue and acceptance criteria before making changes.
- Inspect the current implementation before deciding on a solution.
- Keep work within issue scope.
- If the issue is stale or conflicts with the current repository state, report that before implementing speculative changes.

## Branch Rules

- Confirm the current branch before editing.
- Never implement issue work on `main`.
- Use:
  `<issue-number>-<short-description>`
- Keep the description to roughly two or three words where practical.

Examples:

- `80-frontend-ci-tests`
- `53-stale-tracker-data`
- `59-mobile-modal-fix`

## Frontend

- Keep behavior consistent across related flows.
- Keep validation messages clear and user-facing.
- Preserve useful native HTML validation while using predictable application validation where needed.
- Maintain loading, error, empty, and success states.
- Preserve accessibility and responsive behavior.
- Follow `DESIGN.md` for visual changes.

## Backend

- Backend validation is the source of truth for persisted data.
- User-input validation failures should use appropriate `4xx` responses rather than generic `500` errors.
- Return clear JSON errors without exposing implementation details.
- Preserve API contracts unless intentionally changing them.

## Security and Environment

- Never commit real secrets or local environment files.
- Keep `.env`, `.env.local`, and `.env.*.local` ignored.
- Commit safe example environment files only.
- Follow `SECURITY.md` for authentication, cookies, CSRF, CORS, and security-header behavior.

## Testing

Run the checks relevant to the files changed.

Frontend:

`npm test --workspace=plantplotter`

`npm run lint --workspace=plantplotter`

Backend:

`npm test --workspace=plantplotter_backend`

For changes that can affect production builds:

`npm run build --workspace=plantplotter`

Do not modify or weaken tests merely to make them pass.

## Git Safety

- Check `git status` before and after changes.
- Avoid staging unrelated files.
- Do not use `git add .` when unrelated or local files may be present.
- Do not commit, push, merge, or close issues unless explicitly asked.

## Completion / Handoff

After implementation, report:

1. What changed.
2. Tests/checks run and their results.
3. Remaining concerns or follow-up work.
4. A suggested concise commit message.