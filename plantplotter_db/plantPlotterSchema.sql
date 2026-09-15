-- Garden Management App Database Schema
-- MySQL Database Setup
-- Complete fresh-install schema. Do not run this over an existing installation.
-- Existing databases should use the applicable upgrade migrations in README.md.

-- Create database if it does not already exist.
-- This schema intentionally does not drop the database or wipe existing data.
CREATE DATABASE IF NOT EXISTS garden_plotter;
USE garden_plotter;

-- SELECT * FROM gardens;
-- SELECT * FROM planted_items;
-- SELECT g.id, g.name, g.user_id, u.email 
-- FROM gardens g 
-- LEFT JOIN users u ON g.user_id = u.id;

-- Users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(255) NOT NULL,  -- Changed from 'name' to 'username'
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    session_version INT UNSIGNED NOT NULL DEFAULT 0,
    role ENUM('admin', 'user') DEFAULT 'user',
    avatar VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    preferences JSON,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    reset_password_token_hash VARCHAR(255) NULL,
    reset_password_expires DATETIME NULL,
    last_login TIMESTAMP NULL,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL,
    
    -- Indexes for performance
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_active (is_active),
    INDEX idx_email_verified (email_verified),
    INDEX idx_users_reset_password_token_hash (reset_password_token_hash)
);

-- Gardens table
CREATE TABLE gardens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    demo_showcase_key VARCHAR(64) NULL DEFAULT NULL,
    UNIQUE KEY uq_gardens_demo_showcase (user_id, demo_showcase_key),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    width INT NOT NULL,
    height INT NOT NULL,
    grid_size INT DEFAULT 40,
    soil_type ENUM('Loamy', 'Clay', 'Sandy', 'Silt', 'Peat', 'Chalk') DEFAULT 'Loamy',
    location VARCHAR(255) DEFAULT 'Garden',
    status ENUM('Active', 'Planning', 'Dormant') DEFAULT 'Active',
    plant_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_gardens_user_updated (user_id, updated_at)
);

-- Planted Items table
CREATE TABLE planted_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    garden_id INT NOT NULL,
    plant_id VARCHAR(100) NOT NULL, -- References plant library ID
    plant_name VARCHAR(255) NOT NULL,
    plant_emoji VARCHAR(10),
    plant_size INT DEFAULT 1,
    plant_category ENUM('vegetables', 'herbs', 'fruits', 'flowers', 'other') DEFAULT 'other',
    x_position INT NOT NULL, -- Grid position X
    y_position INT NOT NULL, -- Grid position Y
    planted_date DATE DEFAULT (CURDATE()),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE,
    INDEX idx_garden_id (garden_id),
    INDEX idx_plant_category (plant_category),
    INDEX idx_planted_date (planted_date),
    INDEX idx_planted_items_garden_created (garden_id, created_at)
)CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Garden Activities table (for tracking system)
CREATE TABLE garden_activities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    garden_id INT NOT NULL,
    user_id INT NOT NULL,
    demo_showcase_key VARCHAR(64) NULL DEFAULT NULL,
    UNIQUE KEY uq_garden_activities_demo_showcase (user_id, demo_showcase_key),
    activity_type ENUM('planted', 'watered', 'fertilized', 'harvested', 'pruned', 'weeded') NOT NULL,
    plant_name VARCHAR(255),
    activity_date DATE NOT NULL,
    activity_time TIME,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_garden_activity (garden_id, activity_date),
    INDEX idx_user_activity (user_id, activity_date),
    INDEX idx_activity_type (activity_type),
    INDEX idx_garden_activities_user_garden_date_time (user_id, garden_id, activity_date, activity_time)
);

-- Garden Tasks table (for task management)
CREATE TABLE garden_tasks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    garden_id INT NOT NULL,
    user_id INT NOT NULL,
    demo_showcase_key VARCHAR(64) NULL DEFAULT NULL,
    UNIQUE KEY uq_garden_tasks_demo_showcase (user_id, demo_showcase_key),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    notes VARCHAR(2000) CHARACTER SET utf8mb4 NULL DEFAULT NULL,
    plant_name VARCHAR(255),
    task_type ENUM('water', 'fertilize', 'harvest', 'plant', 'prune', 'weed', 'inspect', 'treat', 'other', 'maintenance') NOT NULL,
    status ENUM('pending', 'completed', 'cancelled', 'overdue') DEFAULT 'pending',
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    due_date DATE NOT NULL,
    completed_at TIMESTAMP NULL,
    estimated_duration INT, -- in minutes
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurring_pattern VARCHAR(50), -- 'daily', 'every-2-days', 'weekly', or 'monthly'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_task_recurrence CHECK (
        (is_recurring = FALSE AND recurring_pattern IS NULL)
        OR
        (is_recurring = TRUE AND recurring_pattern IN ('daily', 'every-2-days', 'weekly', 'monthly'))
    ),
    INDEX idx_garden_tasks (garden_id, due_date),
    INDEX idx_user_tasks (user_id, status, due_date),
    INDEX idx_task_status (status),
    INDEX idx_due_date (due_date),
    INDEX idx_garden_tasks_user_garden_due (user_id, garden_id, due_date)
);

-- User Sessions table (for authentication)
CREATE TABLE user_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_expires (expires_at)
);

-- Plant Library table (optional - for storing custom plants)
CREATE TABLE plant_library (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    emoji VARCHAR(10),
    size INT DEFAULT 1,
    category ENUM('vegetables', 'herbs', 'fruits', 'flowers', 'other') NOT NULL,
    description TEXT,
    spacing INT, -- inches
    sunlight ENUM('Full Sun', 'Partial Sun', 'Shade') DEFAULT 'Full Sun',
    water_needs ENUM('Low', 'Moderate', 'High') DEFAULT 'Moderate',
    days_to_maturity INT,
    soil_types JSON, -- Array of suitable soil types
    companion_plants JSON, -- Array of companion plant IDs
    avoid_plants JSON, -- Array of plants to avoid
    difficulty ENUM('Easy', 'Medium', 'Hard') DEFAULT 'Medium',
    planting_depth VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_difficulty (difficulty),
    INDEX idx_plant_library_name (name),
    INDEX idx_plant_library_category_name (category, name)
)CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
