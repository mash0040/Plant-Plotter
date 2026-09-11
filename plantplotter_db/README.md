# Plant Plotter Database

This directory contains the MySQL setup files for Plant Plotter.

## Active Files

- `plantPlotterSchema.sql` is the active schema for the current app.
- `data_instance.sql` is the active seed/demo data file.

The current app uses the `garden_plotter` database.

## Safe Setup Order

Run the active schema first, then the seed file:

```sh
mysql -u <user> -p < plantPlotterSchema.sql
mysql -u <user> -p < data_instance.sql
```

The active schema uses `CREATE DATABASE IF NOT EXISTS garden_plotter;` and selects the database with `USE garden_plotter;`. The seed file also selects `garden_plotter` so it can run independently after the schema exists.

The seed file is intended for local/demo setup. It includes demo users, sample gardens, plant library data, tasks, and activities.

## Migrations

For task notes, existing databases must run this migration once **before deploying the updated API**:

```sh
mysql -u <user> -p garden_plotter < task_notes_migration.sql
```

Fresh installations already include `garden_tasks.notes` in the active schema and must skip this migration. Existing tasks receive `NULL` notes; no other task data changes. The notes column explicitly uses `utf8mb4` to support Unicode and emoji even when the existing table has an older default character set.

Task notes are optional, with a 2,000-character limit enforced by both the editor and API using JavaScript/native input length (UTF-16 code units; some emoji count as two). Nonempty text, including whitespace and line breaks, is preserved. Empty strings and explicit `null` clear notes to SQL `NULL`; an omitted field on update preserves existing notes for older clients. Status-only completion preserves notes and copies them to the next recurring occurrence.

Existing databases should apply the relevant migration files after the base schema. For recurring task support, run:

```sh
mysql -u <user> -p garden_plotter < task_recurrence_migration.sql
```

This migration preserves the supported `daily`, `every-2-days`, `weekly`, and `monthly` patterns, repairs their recurring flag, and adds the recurrence integrity constraint. It intentionally fails if an unknown pattern exists so that value can be reviewed instead of silently discarded.

## Legacy Files

Files in `legacy/` are older `plant_potter` schema files kept for reference only. They are not the active setup path for the current app.
