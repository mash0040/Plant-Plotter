-- Plant Plotter password reset migration.
-- Apply this after the base schema on deployed databases; it only adds nullable columns.

USE garden_plotter;

SET @add_reset_token_hash = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'users'
        AND column_name = 'reset_password_token_hash'
    ),
    'SELECT 1',
    'ALTER TABLE users ADD COLUMN reset_password_token_hash VARCHAR(255) NULL'
  )
);
PREPARE statement FROM @add_reset_token_hash;
EXECUTE statement;
DEALLOCATE PREPARE statement;

SET @add_reset_expires = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'users'
        AND column_name = 'reset_password_expires'
    ),
    'SELECT 1',
    'ALTER TABLE users ADD COLUMN reset_password_expires DATETIME NULL'
  )
);
PREPARE statement FROM @add_reset_expires;
EXECUTE statement;
DEALLOCATE PREPARE statement;

SET @add_reset_token_index = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'users'
        AND index_name = 'idx_users_reset_password_token_hash'
    ),
    'SELECT 1',
    'CREATE INDEX idx_users_reset_password_token_hash ON users (reset_password_token_hash)'
  )
);
PREPARE statement FROM @add_reset_token_index;
EXECUTE statement;
DEALLOCATE PREPARE statement;
