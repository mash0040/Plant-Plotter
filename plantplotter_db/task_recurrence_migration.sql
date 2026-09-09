-- Normalize existing recurrence state and enforce the supported task contract.
-- Apply once after the base schema on databases created before this constraint.

USE garden_plotter;

UPDATE garden_tasks
SET is_recurring = TRUE
WHERE recurring_pattern IN ('daily', 'every-2-days', 'weekly', 'monthly');

UPDATE garden_tasks
SET is_recurring = FALSE,
    recurring_pattern = NULL
WHERE recurring_pattern IS NULL
   OR recurring_pattern IN ('', 'none');

ALTER TABLE garden_tasks
  MODIFY is_recurring BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE garden_tasks
  ADD CONSTRAINT chk_task_recurrence CHECK (
    (is_recurring = FALSE AND recurring_pattern IS NULL)
    OR
    (is_recurring = TRUE AND recurring_pattern IN ('daily', 'every-2-days', 'weekly', 'monthly'))
  );
