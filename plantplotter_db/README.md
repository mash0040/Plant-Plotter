# Plant Plotter Database

This directory contains the MySQL setup files for Plant Plotter.

## Active Files

- `plantPlotterSchema.sql` is the active schema for the current app.
- `data_instance.sql` is the active seed/demo data file.

The current app uses the `garden_plotter` database.

## Fresh Installation

Use MySQL 8 with an empty `garden_plotter` database (or let the schema create it). From this directory, run the active schema first, then the local/demo seed file:

```sh
mysql -u <user> -p < plantPlotterSchema.sql
mysql -u <user> -p < data_instance.sql
```

These redirection commands work in shells such as Bash and Command Prompt. In PowerShell, start `mysql -u <user> -p` from this directory, then run `SOURCE plantPlotterSchema.sql;` followed by `SOURCE data_instance.sql;` at the MySQL prompt.

The active schema uses `CREATE DATABASE IF NOT EXISTS garden_plotter;` and selects it with `USE garden_plotter;`. It contains the current password-reset fields and token index, session version, task notes, expanded task types, recurrence constraint, and performance indexes. **Fresh installations must skip all upgrade migrations.** No historical migration is needed to start the current backend.

The seed file also selects `garden_plotter`. It includes a demo user, sample gardens, plant library data, tasks, and activities. It is optional for an empty installation and intended for local/demo setup only. Run it once after the schema; it uses fixed IDs and is not an upgrade or a repeatable data refresh.

The only seeded account is `demo@plantplotter.com`, explicitly assigned user ID `1`. All five showcase gardens, their 65 planted items, 23 tasks, and 40 activities belong to that account. No admin/test personas are required. Account preferences remain SQL `NULL`: account-wide settings are not implemented, and current garden/planner controls operate independently. Demo login credentials are documented in the [root README](../README.md#demo).

The schema does not drop existing data, but its `CREATE TABLE` statements are not an upgrade procedure and will fail on existing tables. Do not rerun the base schema or demo seed against an existing deployment. Configure the backend's `DB_NAME=garden_plotter` and other connection settings using the [backend environment template](../plantplotter_backend/.env.example).

## Restore the shared demo

Run this from the repository root in a terminal when the shared demo has drifted
or before a recruiter review:

```sh
npm run demo:restore --workspace=plantplotter_backend
```

This is a Node command, not a SQL file to run in Workbench. It uses the backend's
database environment variables, filling missing values from
`plantplotter_backend/.env`. Existing environment variables take precedence.
Check that those settings target the intended database; the command prints its
host and database name. Production uses the backend's existing verified-TLS
settings. The current schema, including #120's showcase-key migration, is required;
this command makes no schema changes.

**The command replaces all of the shared demo account's gardens, plants, tasks,
and activities, including visitor-created records.** Back up first and run during
a brief maintenance window with application writes paused. It restores the five
gardens, 65 planted items, 23 tasks, and 40 activities defined by
`data_instance.sql`, preserving its historical dates and showcase protection keys.
It does not execute the seed SQL or change accounts, passwords, normal-user data,
or the shared plant catalogue.

Success prints `Restore committed: 5 gardens, 65 plants, 23 tasks, 40 activities.`
The command commits or rolls back automatically and closes its connection; no
Workbench `COMMIT` step is needed. On an error, inspect the reported problem before
retrying. Missing/ambiguous/inactive demo identities, disabled foreign-key checks,
non-InnoDB tables, and inconsistent tracker ownership are refused. Lock waits are
limited to 10 seconds; finish other open transactions before trying again.

The demo owner is resolved from the stored reserved email, not a fixed user ID.
New database IDs are allocated, and all child garden references are remapped, so
repeated runs produce the same canonical content without duplicate records or ID
collisions with normal users. Record IDs and generated timestamps can change;
reload open demo pages and reopen gardens from My Gardens after a restore.

### Verify a restore

- Sign in with the published demo credentials and confirm five gardens appear.
- Open their planners and historical tracker entries; check that seed layouts
  and care records are back, temporary records are gone, and showcase Delete
  controls remain hidden. Confirm planner edits and task completion still work.
- Run the command again and refresh: counts and content should stay the same.
  Confirm a separate normal user's gardens and tracker data are unchanged.

The disposable validator (`node plantplotter_backend/scripts/validateFreshDatabase.js`)
also executes this command against MySQL, including repeated restores, restoration
after all demo gardens are deleted, insert-failure rollback, cross-owner refusal,
normal-user preservation, and demo login/protection checks.

## Migrations

### Deferred account-role cleanup

The application treats the shared plant catalogue as read-only. Maintain catalogue
records through reviewed database or seed changes outside the application; ordinary
garden and placed-plant editing still belongs to each authenticated garden owner.

`users.role` and `idx_role` are retained for deployment compatibility. Application
authentication, JWTs, and profile responses no longer read, write, or expose account
roles. Older versioned cookies can still authenticate, but their role claims are ignored.
The schema, demo seed, and database validation checks retain the legacy column until
a separate cleanup is deployed.

Any future column-removal migration must run **after** all deployed API instances
and operational scripts have stopped reading or writing `users.role`. Update the
fresh-install schema, seed, and validators together with that narrowly scoped
migration. Do not apply a role-column drop as a pre-deployment migration or roll back
to role-dependent application code after dropping it.

### Existing upgrade migrations

These files remain available only for upgrading older databases. Back up the database and inspect its current definitions before applying the relevant files **before deploying the updated API**. Skip changes already present; do not run every SQL file in the directory. Each command below is run from this directory.

| Upgrade file | Apply when the existing database is missing | Repeat behavior |
| --- | --- | --- |
| `email_verification_migration.sql` | `pending_signups` and `signup_limits` | Creates missing tables; inspect existing definitions before reapplying. Does not modify users. |
| `password_reset_migration.sql` | `users.reset_password_token_hash`, `users.reset_password_expires`, or `idx_users_reset_password_token_hash` | Checks names and adds only missing columns/index. |
| `session_version_migration.sql` | `users.session_version` | Apply once; duplicate column otherwise. |
| `task_notes_migration.sql` | `garden_tasks.notes` | Apply once; duplicate column otherwise. |
| `demo_showcase_protection_migration.sql` | `demo_showcase_key` on gardens, tasks, and activities | Apply once; backfills original seed IDs owned by the stored demo identity. |
| `task_type_options_migration.sql` | `treat` or `other` in `garden_tasks.task_type` | Reapplies the established enum; inspect any custom values first. |
| `task_recurrence_migration.sql` | `chk_task_recurrence` | Apply once; duplicate constraint otherwise. Normalizes existing recurrence state. |
| `performance_indexes.sql` | Any of its six named performance indexes | Checks index names and adds only missing indexes. Requires routine creation privileges. |

Inspect `SHOW CREATE TABLE users;`, `SHOW CREATE TABLE garden_tasks;`, and `SHOW INDEX FROM <table>;` for the tables listed in `performance_indexes.sql`. Name checks in repeatable migrations do not repair an existing definition with the wrong type or indexed columns; review such differences separately.

### Email verification before account creation

Apply `email_verification_migration.sql` to an existing database before deploying
issue #129's API. Fresh installations already contain both tables and skip this
migration. Back up first and inspect `SHOW CREATE TABLE pending_signups;` and
`SHOW CREATE TABLE signup_limits;` if either exists: `IF NOT EXISTS` does not
repair a mismatched definition. Both tables must use InnoDB.

```sh
mysql -u <user> -p garden_plotter < email_verification_migration.sql
```

The migration adds temporary signup attempts and shared sending/guessing budgets.
It does not update existing users, `email_verified` values, passwords, or sessions.
The legacy `users.email_verification_token` column remains unused. A pending email
is not unique or reserved; only successful verification inserts into `users`, using
its existing unique email constraint.

Deploy the API with working `EMAIL_PROVIDER`, `EMAIL_FROM`, and provider credentials,
then deploy the matching frontend in the same release window. Registration now
returns pending verification instead of an authenticated user; an older frontend
cannot finish the new flow. Keep a consistent `JWT_SECRET` across API instances.
No new provider dependency or separate signing-secret configuration is required.
Rolling back to the old API restores unverified registration and is a product/security
rollback; do not drop the new tables while any verification API instance is running.

Abandoned attempts expire after 24 hours. Signup starts remove at most 100 expired
attempts and 100 expired limit rows per request, using indexed expiry columns.
Expired attempts cannot be used even before cleanup runs. No scheduled database
event or production migration runs automatically. A failed send retains an attempt
for retry and consumes sending budget. Without an email provider, signup fails
unless explicit local console delivery is enabled as described below.

For local development against a local database, set `NODE_ENV=development` and
`SIGNUP_EMAIL_MODE=console` in `plantplotter_backend/.env`, then restart the backend.
Create an account or use **Resend code** after its cooldown; copy the latest
`[development] Signup verification code:` from the backend terminal into the form.
No email is sent in this mode. All expiry, guess, and resend limits still apply.
An already-failed attempt requires a resend; changing configuration does not
reactivate its code. Console mode is refused outside explicit development mode.
Production uses `SIGNUP_EMAIL_MODE=email` (the default) and configured email delivery.

Run the disposable validator below to exercise fresh/upgrade parity, account/session
preservation, mocked email delivery, real MySQL concurrent guesses/verification,
resend races, duplicate emails, and transaction rollback. Its explicit test-process
email fixture passes signup messages over IPC; it does not contact Resend or log
verification codes. Verify real inbox delivery separately in a configured test
environment. See [verification security](../SECURITY.md#new-account-email-verification)
for exact limits and retry behavior.

### Showcase deletion protection

For existing installations using the original seed IDs, apply before deploying
the updated API:

```sh
mysql -u <user> -p garden_plotter < demo_showcase_protection_migration.sql
```

Fresh installations already include these columns and keys; skip the migration.
Back up and inspect the existing data first. The migration adds nullable
`demo_showcase_key` columns and a unique `(user_id, demo_showcase_key)` index to
`gardens`, `garden_tasks`, and `garden_activities`. It marks only rows owned by
the stored `demo@plantplotter.com` identity (case/outer whitespace normalized),
using the original seed IDs: gardens 1–5, tasks 1–23, activities 1–40. It does not
assume the demo user's ID is 1 and does not modify normal users' record values.
Existing timestamps are preserved. This is a one-time migration; inspect partial
application before retrying because MySQL DDL commits independently.

The keys are `garden-<seed ID>`, `task-<seed ID>`, and `activity-<seed ID>`.
Names, content, and database IDs can change without changing these keys. The API
never accepts keys from clients; new records and recurring follow-ups remain
unmarked and deletable. All seeded gardens/tasks/activities are protected from
deletion; planner changes, record edits, and task status changes remain allowed.

If a deployment imported the seed under different record IDs, an operator must
map its actual showcase records to these keys before enabling protection. The
migration cannot infer that mapping from editable names or reconstruct deleted
data. Check the protected demo has 5 keyed gardens, 23 keyed tasks, and 40 keyed
activities; investigate any shortfall rather than applying the broad seed again.

The [manual restore command](#restore-the-shared-demo) restores canonical keys
alongside content under the stored demo owner, allocating new record IDs.
It remains available because deletion protection applies to application API
requests; permitted edits can still cause shared-data drift.

For older password-reset schemas:

```sh
mysql -u <user> -p garden_plotter < password_reset_migration.sql
```

The current fields are nullable `reset_password_token_hash VARCHAR(255)` and `reset_password_expires DATETIME`. The obsolete `password_reset_token` and `password_reset_expires` fields are not used by the backend and are omitted from fresh installations. The upgrade preserves any legacy fields and data; it does not copy old tokens into the current hashed-token field.

For password-reset session revocation:

```sh
mysql -u <user> -p garden_plotter < session_version_migration.sql
```

Existing users receive version `0`; each successful password reset increments it atomically with the password change. No seed data or environment-variable changes are required. The current password-reset columns above must also be present.

Verify that `SHOW COLUMNS FROM users LIKE 'session_version';` reports `int unsigned`, `Null: NO`, and default `0`. Deploy the updated API across all instances after the migration. Existing authentication cookies without a version will require users to sign in once. Never reset or decrement stored versions, since doing so could revalidate older cookies. See [session behavior](../SECURITY.md#password-reset).

For task notes:

```sh
mysql -u <user> -p garden_plotter < task_notes_migration.sql
```

Existing tasks receive `NULL` notes; no other task data changes. The notes column explicitly uses `utf8mb4` to support Unicode and emoji even when the existing table has an older default character set.

Task notes are optional, with a 2,000-character limit enforced by both the editor and API using JavaScript/native input length (UTF-16 code units; some emoji count as two). Nonempty text, including whitespace and line breaks, is preserved. Empty strings and explicit `null` clear notes to SQL `NULL`; an omitted field on update preserves existing notes for older clients. Status-only completion preserves notes and copies them to the next recurring occurrence.

For expanded task types and recurring task support, apply only the missing changes:

```sh
mysql -u <user> -p garden_plotter < task_type_options_migration.sql
mysql -u <user> -p garden_plotter < task_recurrence_migration.sql
```

This migration preserves the supported `daily`, `every-2-days`, `weekly`, and `monthly` patterns, repairs their recurring flag, and adds the recurrence integrity constraint. It intentionally fails if an unknown pattern exists so that value can be reviewed instead of silently discarded.

For performance indexes:

```sh
mysql -u <user> -p garden_plotter < performance_indexes.sql
```

## Validation

From the repository root, run the backend suite, including static schema and setup-documentation checks:

```sh
npm test --workspace=plantplotter_backend
```

With Docker running, validate the SQL and authentication paths against disposable MySQL 8.4:

```sh
node plantplotter_backend/scripts/validateFreshDatabase.js
```

This check creates an isolated container, imports only the active schema and seed, and starts the backend with temporary local settings. It verifies the documented demo login, unset preferences, and populated garden/planner/tracker API data, then exercises pending signup, code verification, login, reset-token persistence/consumption, session revocation, and invalid/reused reset links. It captures the development reset link locally without sending email. It also checks upgrades from a representative older schema and reruns the migrations documented as repeatable. The container is removed afterward; no existing database or local environment file is used.

For manual demo validation, sign in with the documented demo account after a fresh schema and seed import. Confirm all five showcase gardens are listed, open each planner to see its saved plants, and switch between gardens in Tracker to inspect tasks and activity history. Seed dates are fixed historical examples, so look in overdue/completed tasks and the matching historical calendar months rather than expecting activity today. Confirm Account Settings shows the protected demo profile without Preferences, save, or account-deletion controls.

For manual UI validation, connect the app to a fresh local setup, register a new account, verify the emailed code (or terminal code in explicit local console mode), sign out and back in, request a reset link, reset the password, and confirm the old password and previously signed-in session no longer work. Sign in with the new password and confirm reusing the reset link fails. Use a new account rather than the protected demo account. Real email delivery requires the provider settings in the [backend environment template](../plantplotter_backend/.env.example). With those settings blank in local development, password-reset links are logged; signup codes are printed only with the explicit local console mode described above.
