-- Apply once to existing databases before deploying task notes API support.
-- Fresh installations already include this column in plantPlotterSchema.sql.
USE garden_plotter;

ALTER TABLE garden_tasks
  ADD COLUMN notes VARCHAR(2000) CHARACTER SET utf8mb4 NULL DEFAULT NULL AFTER description;
