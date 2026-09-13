-- Apply once to existing databases before deploying session revocation support.
-- Fresh installations already include this column and must skip this migration.
USE garden_plotter;

ALTER TABLE users
    ADD COLUMN session_version INT UNSIGNED NOT NULL DEFAULT 0;
