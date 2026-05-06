-- Garden Management App Database Schema
-- MySQL Database Setup

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
    role ENUM('admin', 'user') DEFAULT 'user',
    avatar VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    preferences JSON,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP NULL,
    last_login TIMESTAMP NULL,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL,
    
    -- Indexes for performance
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_active (is_active),
    INDEX idx_email_verified (email_verified)
);

-- Gardens table
CREATE TABLE gardens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
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
    INDEX idx_status (status)
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
    INDEX idx_planted_date (planted_date)
)CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Garden Activities table (for tracking system)
CREATE TABLE garden_activities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    garden_id INT NOT NULL,
    user_id INT NOT NULL,
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
    INDEX idx_activity_type (activity_type)
);

-- Garden Tasks table (for task management)
CREATE TABLE garden_tasks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    garden_id INT NOT NULL,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    plant_name VARCHAR(255),
    task_type ENUM('water', 'fertilize', 'harvest', 'plant', 'prune', 'weed', 'inspect', 'treat', 'other', 'maintenance') NOT NULL,
    status ENUM('pending', 'completed', 'cancelled', 'overdue') DEFAULT 'pending',
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    due_date DATE NOT NULL,
    completed_at TIMESTAMP NULL,
    estimated_duration INT, -- in minutes
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_pattern VARCHAR(50), -- 'daily', 'weekly', 'monthly', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_garden_tasks (garden_id, due_date),
    INDEX idx_user_tasks (user_id, status, due_date),
    INDEX idx_task_status (status),
    INDEX idx_due_date (due_date)
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
    INDEX idx_difficulty (difficulty)
)CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
