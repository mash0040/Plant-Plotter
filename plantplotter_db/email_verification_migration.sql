-- Existing installations: apply before deploying the verification API.
-- No existing users or sessions are modified. Fresh installs skip this file.
USE garden_plotter;

CREATE TABLE IF NOT EXISTS pending_signups (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    credential_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NULL,
    revision INT UNSIGNED NOT NULL,
    code_verifier CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
    code_expires_at DATETIME(3) NOT NULL,
    resend_at DATETIME(3) NOT NULL,
    delivery_state ENUM('sending', 'sent', 'failed') NOT NULL,
    failed_guesses TINYINT UNSIGNED NOT NULL DEFAULT 0,
    consumed_at DATETIME(3) NULL,
    expires_at DATETIME(3) NOT NULL,
    INDEX idx_pending_signups_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS signup_limits (
    bucket_key VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    used INT UNSIGNED NOT NULL DEFAULT 0,
    expires_at DATETIME(3) NOT NULL,
    INDEX idx_signup_limits_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
