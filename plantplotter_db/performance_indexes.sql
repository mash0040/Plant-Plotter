-- Plant Plotter production performance indexes.
-- Apply this after the base schema on deployed databases; it only adds indexes.

USE garden_plotter;

DROP PROCEDURE IF EXISTS add_index_if_missing;

DELIMITER //

CREATE PROCEDURE add_index_if_missing(
  IN target_table VARCHAR(64),
  IN target_index VARCHAR(64),
  IN create_statement TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = target_table
      AND index_name = target_index
  ) THEN
    SET @index_sql = create_statement;
    PREPARE statement FROM @index_sql;
    EXECUTE statement;
    DEALLOCATE PREPARE statement;
  END IF;
END//

DELIMITER ;

CALL add_index_if_missing(
  'plant_library',
  'idx_plant_library_name',
  'CREATE INDEX idx_plant_library_name ON plant_library (name)'
);

CALL add_index_if_missing(
  'plant_library',
  'idx_plant_library_category_name',
  'CREATE INDEX idx_plant_library_category_name ON plant_library (category, name)'
);

CALL add_index_if_missing(
  'gardens',
  'idx_gardens_user_updated',
  'CREATE INDEX idx_gardens_user_updated ON gardens (user_id, updated_at)'
);

CALL add_index_if_missing(
  'planted_items',
  'idx_planted_items_garden_created',
  'CREATE INDEX idx_planted_items_garden_created ON planted_items (garden_id, created_at)'
);

CALL add_index_if_missing(
  'garden_activities',
  'idx_garden_activities_user_garden_date_time',
  'CREATE INDEX idx_garden_activities_user_garden_date_time ON garden_activities (user_id, garden_id, activity_date, activity_time)'
);

CALL add_index_if_missing(
  'garden_tasks',
  'idx_garden_tasks_user_garden_due',
  'CREATE INDEX idx_garden_tasks_user_garden_due ON garden_tasks (user_id, garden_id, due_date)'
);

DROP PROCEDURE add_index_if_missing;
