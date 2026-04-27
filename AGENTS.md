# Plant Plotter Project Guidelines

Plant Plotter is a portfolio-ready full-stack garden planning application.

The goal is to make the project stable, functional, clean, and recruiter-ready while keeping the existing stack.

## Stack

- Frontend: Next.js, React, Tailwind CSS
- Backend: Express.js
- Database: MySQL
- Backend stores garden dimensions internally in meters
- Frontend may display dimensions in either meters or feet

## Working Rules

- Work on the `dev` branch.
- Keep the existing stack unless a change is absolutely necessary.
- Prefer small, scoped changes.
- Analyze before editing.
- Do not refactor unrelated code.
- Do not change the database schema unless explicitly requested.
- Keep `.env.example` files safe and documented.
- Do not remove files unless they are confirmed unused.
- After any code change, explain what changed and how to test it.

## Environment Files

- Never commit real environment files that contain local secrets.
- Keep these files ignored:
  - `.env`
  - `.env.local`
  - `.env.*.local`
- Commit safe example files only:
  - `plantplotter/.env.local.example`
  - `plantplotter_backend/.env.example`
- Example files must use placeholder values only.
- Do not include real database passwords, JWT secrets, API keys, or personal credentials in example files.

## Local Development

- Frontend runs on `http://localhost:3000`.
- Backend runs on `http://localhost:5001`.
- Frontend API calls should use `NEXT_PUBLIC_API_URL`.
- Backend CORS should use `FRONTEND_URL`.
- Real `.env` and `.env.local` files must stay local and ignored by Git.
- Safe example files should be committed:
  - `plantplotter/.env.local.example`
  - `plantplotter_backend/.env.example`

## Naming Conventions

### General

- Use clear, descriptive names.
- Avoid vague names like `data`, `stuff`, `temp`, `thing`, or `newFile`.
- Prefer names that explain purpose, not just type.

### Frontend

- React components should use `PascalCase`.
  - Example: `GardenForm.jsx`, `DashboardCard.jsx`
- Hooks should use `camelCase` and start with `use`.
  - Example: `useGardens.js`, `useAuth.js`
- Utility files should use `camelCase`.
  - Example: `gardenValidation.js`, `formatDimensions.js`
- Event handlers should start with `handle`.
  - Example: `handleSubmit`, `handleUnitChange`
- Boolean values should read naturally.
  - Example: `isLoading`, `hasError`, `canSubmit`

### Backend

- Route files should use plural resource names where practical.
  - Example: `gardens.js`, `plants.js`, `auth.js`
- Validation helpers should clearly describe the validated resource.
  - Example: `gardenValidation.js`
- Controller/helper functions should use `camelCase`.
  - Example: `createGarden`, `updateGarden`, `validateGardenPayload`
- Constants should use `UPPER_SNAKE_CASE`.
  - Example: `MAX_GARDEN_NAME_LENGTH`

### Database

- Do not rename database tables or columns unless explicitly requested.
- If existing database names are unclear, add comments in code rather than changing schema immediately.
- Garden dimensions are stored internally in meters.

## Frontend Guidelines

- Keep UI behavior consistent between create and edit flows.
- Show clear validation messages near the related field.
- Avoid relying only on native browser validation messages for important form behavior.
- Keep native HTML attributes like `required`, `min`, and `max` as backup when useful.
- Use custom validation for important forms so behavior is predictable and testable.
- Do not show developer/debug information in the user-facing UI.
- Do not display text like `Database values` to normal users.
- Loading, error, empty, and success states should be clear.
- Keep styling consistent with the current Tailwind-based design.
- Do not introduce a new UI library unless explicitly requested.

## Backend Guidelines

- Backend validation is the source of truth.
- User validation errors should return HTTP `400`.
- Do not return generic `500` errors for user input mistakes.
- Error responses should be clear JSON.
- Do not expose sensitive implementation details in API responses.
- Keep API payload shapes stable unless a change is explicitly requested.
- Avoid silent fallbacks for invalid required fields.
- Defaults are okay only when they are intentional and documented.

## Garden Dimension Rules

- Users may enter dimensions in Metric `m` or Imperial `ft`.
- Validate dimensions using the unit selected by the user.
- Store dimensions internally in meters.
- Conversion to meters should happen before saving to the backend.
- Do not show database/storage values in the user-facing UI.

### Current Dimension Validation

- Metric mode:
  - Minimum: `1 m`
  - Maximum: `100 m`
- Imperial mode:
  - Minimum should reflect the backend minimum meter value.
  - Since `1 m` is about `3.3 ft`, imperial values below `3.3 ft` should not be accepted if the backend stores integer meters.
  - Since `100 m` is about `328 ft`, imperial values above `328 ft` should not be accepted.
- Validation messages should match the selected unit.
  - Metric messages should mention meters.
  - Imperial messages should mention feet.

## Garden Validation Rules

- Garden name is required after trimming.
- Garden name max length is `50` characters.
- Garden name may include letters, numbers, spaces, and normal punctuation.
- Garden name should not be limited to letters only.
- Reject empty strings and invalid values like `[object Object]`.
- Description is optional.
- Description max length is `1000` characters.
- Location is optional.
- If location is empty, default to `Garden`.
- Soil type must be one of:
  - `Loamy`
  - `Clay`
  - `Sandy`
  - `Silt`
  - `Peat`
  - `Chalk`
- Status must be one of:
  - `Planning`
  - `Active`
  - `Dormant`

## Testing

### Backend Tests

- Backend validation tests use Node’s built-in test runner.
- Prefer database-free tests for validation helpers and pure logic.
- Do not require MySQL for validation unit tests.
- Run backend tests with:

  `npm test --workspace=plantplotter_backend`

- Backend tests should cover:
  - valid payloads
  - trimming behavior
  - optional defaults
  - missing required fields
  - empty strings
  - invalid width and height
  - invalid enum values
  - overlong text fields

### Frontend Tests

- Frontend automated tests should be added for important form behavior.
- Use Vitest and React Testing Library unless another tool is already configured.
- Frontend tests should focus on user behavior, not implementation details.
- Prefer queries users would understand, such as labels, roles, and visible text.
- Avoid testing Tailwind class names unless the class directly controls required behavior.

Frontend tests should cover:

- Garden name required message
- Spaces-only garden name validation
- Width required message
- Height required message
- Width below allowed range
- Height below allowed range
- Width above allowed range
- Height above allowed range
- Metric validation messages using `m`
- Imperial validation messages using `ft`
- Valid form submission calls the expected create/update handler
- Location can be empty and defaults correctly

Potential frontend test command:

`npm test --workspace=plantplotter`

If frontend tests are not configured yet, do not pretend they exist. Add the test setup in a small, scoped change.

### Linting

- Frontend lint should continue to pass.
- Run frontend lint with:

  `npm run lint --workspace=plantplotter`

- Existing React hook dependency warnings should not be fixed casually.
- Only fix hook dependency warnings when the behavior is understood and tested.

## Validation Implementation Guidelines

- Keep validation rules consistent between frontend and backend.
- Backend validation protects data integrity.
- Frontend validation improves user experience.
- Do not rely only on frontend validation.
- Do not rely only on HTML validation bubbles.
- Avoid duplicating complex validation logic when a shared helper is practical.
- Keep error messages clear, short, and user-friendly.

## Git Guidelines

- Do not commit real `.env` files.
- Commit small, focused changes.
- Use clear commit messages.
- Before committing, run relevant checks.
- For backend validation changes, run backend tests.
- For frontend changes, run frontend lint and any available frontend tests.
- Do not use `git add .` if there is a risk of staging unrelated or local files.
- Check `git status` before every commit.

## Current Project Direction

The goal is to make Plant Plotter stable, functional, and portfolio-ready.

Priorities:

1. Fix broken behavior.
2. Improve validation and error handling.
3. Add automated tests for important backend and frontend behavior.
4. Keep frontend/backend behavior consistent.
5. Remove unnecessary or duplicate code carefully.
6. Improve README and demo readiness.
7. Make the app easy to run, explain, and demonstrate.