-- Apply once to existing seeded databases before deploying demo-data protection.
-- Fresh installations include the keys and must skip this migration.
-- Backfill uses the original seed IDs AND the stored demo identity, never user ID 1.
-- Missing records are not recreated; custom/re-keyed datasets need an operator mapping.
USE garden_plotter;

ALTER TABLE gardens
    ADD COLUMN demo_showcase_key VARCHAR(64) NULL DEFAULT NULL,
    ADD UNIQUE KEY uq_gardens_demo_showcase (user_id, demo_showcase_key);

ALTER TABLE garden_tasks
    ADD COLUMN demo_showcase_key VARCHAR(64) NULL DEFAULT NULL,
    ADD UNIQUE KEY uq_garden_tasks_demo_showcase (user_id, demo_showcase_key);

ALTER TABLE garden_activities
    ADD COLUMN demo_showcase_key VARCHAR(64) NULL DEFAULT NULL,
    ADD UNIQUE KEY uq_garden_activities_demo_showcase (user_id, demo_showcase_key);

START TRANSACTION;

UPDATE gardens record
JOIN users owner ON owner.id = record.user_id
SET record.demo_showcase_key = CONCAT('garden-', record.id),
    record.updated_at = record.updated_at
WHERE LOWER(TRIM(owner.email)) = 'demo@plantplotter.com'
  AND record.id BETWEEN 1 AND 5
  AND record.demo_showcase_key IS NULL;

UPDATE garden_tasks record
JOIN users owner ON owner.id = record.user_id
SET record.demo_showcase_key = CONCAT('task-', record.id),
    record.updated_at = record.updated_at
WHERE LOWER(TRIM(owner.email)) = 'demo@plantplotter.com'
  AND record.id BETWEEN 1 AND 23
  AND record.demo_showcase_key IS NULL;

UPDATE garden_activities record
JOIN users owner ON owner.id = record.user_id
SET record.demo_showcase_key = CONCAT('activity-', record.id),
    record.updated_at = record.updated_at
WHERE LOWER(TRIM(owner.email)) = 'demo@plantplotter.com'
  AND record.id BETWEEN 1 AND 40
  AND record.demo_showcase_key IS NULL;

COMMIT;
