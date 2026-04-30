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

## Legacy Files

Files in `legacy/` are older `plant_potter` schema files kept for reference only. They are not the active setup path for the current app.
