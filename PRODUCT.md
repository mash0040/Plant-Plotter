# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are people planning and maintaining personal gardens. They use Plant Plotter to define garden spaces, place plants, understand companion planting guidance, and keep track of care work over time.

Plant Plotter is also a portfolio product for recruiters and technical reviewers evaluating full-stack product judgment, implementation quality, deployment readiness, and maintainability. This portfolio audience is confirmed by project documentation; the specific gardener segment is inferred from the current app copy and feature set.

## Product Purpose

Plant Plotter is a full-stack garden planning and tracking application. It helps users create gardens, visually plan plant placement, review plant guidance, log completed garden care, and manage scheduled care tasks.

Success means the project is stable, functional, clean, mobile-friendly, easy to run locally, easy to demo live, and recruiter-ready while preserving the existing stack.

## Positioning

Plant Plotter combines visual garden layout planning, plant-library guidance, companion planting context, and garden care tracking in one application. The product is not only a static planner: saved garden layouts connect to ongoing activity logs, planned tasks, and progress over time.

## Operating Context

The product is used as an authenticated web app. Users sign in, create one or more gardens, set garden details and dimensions, open a planner for plant placement, and use tracker workflows for activities and tasks.

Local development runs the frontend at `http://localhost:3000` and the backend API at `http://localhost:5001/api`. The live app is documented at `https://www.plantplotter.me`, with the API routed through `https://api.plantplotter.me/api`.

The project is organized as a monorepo with `plantplotter/` for the Next.js frontend, `plantplotter_backend/` for the Express API, and `plantplotter_db/` for MySQL schema, seed data, migrations, and database notes.

## Capabilities and Constraints

Confirmed capabilities include public landing, account creation, login, JWT-protected routes, password reset by email, garden create/edit/delete/detail flows, visual garden planning, plant placement, footprint validation, row planting, save flows, plant library categories and details, companion planting guidance, tracker activity logs, planned care tasks, today/upcoming/overdue organization, profile settings, and account deletion.

The existing stack is binding unless a change is explicitly justified: Next.js, React, Tailwind CSS, Express.js, and MySQL. The backend stores garden dimensions internally in meters. The frontend may display dimensions in meters or feet, but conversion to meters happens before saving to the backend.

Backend validation is the source of truth. User validation errors should return clear JSON with HTTP `400`, not generic `500` responses. Frontend validation should provide predictable, testable messages near related fields while preserving useful native HTML validation attributes.

Environment files with real secrets must remain local and ignored. Only safe placeholder examples should be committed: `plantplotter/.env.local.example` and `plantplotter_backend/.env.example`.

Known limitations documented in the README include no refresh tokens, fixed Ottawa/default weather coordinates, planned but unimplemented email reminders, weather alerts, public garden sharing, public profiles, and no configured frontend automated tests yet.

## Brand Commitments

The product name is Plant Plotter in documentation and PlantPlotter in current app copy and environment naming. Future work should preserve that identity unless the user explicitly asks for a rename.

The product voice should stay clear, practical, and user-facing. Do not show developer/debug labels such as `Database values` in the UI, and do not expose sensitive implementation details in API responses.

Existing brand and product assets are in `plantplotter/public/`, including logo files and garden-planning imagery. Their visual treatment is not documented here; DESIGN.md should own visual system decisions if created later.

## Evidence on Hand

The root `README.md` documents the product background, live site, feature set, technical stack, deployment architecture, local setup, demo availability, known limitations, and project status.

The app includes real source implementations for landing, authentication, garden management, visual planning, tracking, weather, profile, and password reset workflows under `plantplotter/src/`.

Backend routes, validation helpers, tests, middleware, and data files live under `plantplotter_backend/`. Database schema, seed data, and migration scripts live under `plantplotter_db/`.

No testimonials, press quotes, customer claims, benchmark claims, pricing claims, or external proof were found in the reviewed project materials. Future work must not fabricate those.

## Product Principles

Keep the app stable and demonstrable before expanding scope.

Preserve consistency between frontend behavior and backend validation.

Make important garden workflows clear on both desktop and mobile.

Favor small, scoped improvements over broad unrelated refactors.

Protect secrets, payload stability, and user-facing error clarity.

## Accessibility & Inclusion

Future frontend work should keep loading, error, empty, and success states clear; place validation messages near related fields; avoid relying only on browser validation bubbles; and maintain responsive behavior across planner, tracker, garden details, forms, and modals.
