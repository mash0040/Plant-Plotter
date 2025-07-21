-- Garden Management App Database Schema
-- MySQL Database Setup

-- Create database
CREATE DATABASE IF NOT EXISTS garden_plotter;
USE garden_plotter;

-- Users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    avatar VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    preferences JSON,
    is_active BOOLEAN DEFAULT TRUE
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
);

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
    task_type ENUM('water', 'fertilize', 'harvest', 'plant', 'prune', 'weed', 'inspect', 'maintenance') NOT NULL,
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
);

-- Insert default admin user (password should be hashed in real implementation)
INSERT INTO users (name, email, password_hash, role) VALUES 
('Admin User', 'admin@plantplotter.com', '$2b$10$hashedpassword', 'admin');

-- Insert some default plants in library
INSERT INTO plant_library (id, name, emoji, size, category, description, spacing, sunlight, water_needs, days_to_maturity, difficulty) VALUES
('tomato', 'Tomato', '🍅', 2, 'vegetables', 'Popular garden vegetable', 24, 'Full Sun', 'High', 75, 'Medium'),
('basil', 'Basil', '🌿', 1, 'herbs', 'Aromatic herb perfect for cooking', 12, 'Full Sun', 'Moderate', 60, 'Easy'),
('lettuce', 'Lettuce', '🥬', 1, 'vegetables', 'Cool-season leafy green', 8, 'Partial Sun', 'Moderate', 45, 'Easy'),
('carrot', 'Carrot', '🥕', 1, 'vegetables', 'Root vegetable rich in beta-carotene', 3, 'Full Sun', 'Moderate', 70, 'Easy'),
('pepper', 'Bell Pepper', '🫑', 2, 'vegetables', 'Sweet and colorful peppers', 18, 'Full Sun', 'Moderate', 70, 'Medium'),
('strawberry', 'Strawberry', '🍓', 1, 'fruits', 'Sweet perennial berry', 14, 'Full Sun', 'Moderate', 90, 'Medium'),
('marigold', 'Marigold', '🌼', 1, 'flowers', 'Pest-repelling companion flower', 8, 'Full Sun', 'Low', 50, 'Easy'),
('nasturtium', 'Nasturtium', '🌸', 1, 'flowers', 'Edible flower that repels pests', 12, 'Full Sun', 'Low', 55, 'Easy');

-- Create indexes for better performance
CREATE INDEX idx_gardens_user_status ON gardens(user_id, status);
CREATE INDEX idx_activities_garden_date ON garden_activities(garden_id, activity_date DESC);
CREATE INDEX idx_tasks_user_due ON garden_tasks(user_id, due_date);
CREATE INDEX idx_planted_items_position ON planted_items(garden_id, x_position, y_position);

-- Create views for commonly used queries
CREATE VIEW garden_summary AS
SELECT 
    g.id,
    g.user_id,
    g.name,
    g.description,
    g.width,
    g.height,
    g.soil_type,
    g.location,
    g.status,
    g.plant_count,
    g.created_at,
    g.updated_at,
    COUNT(pi.id) as actual_plant_count,
    GROUP_CONCAT(DISTINCT pi.plant_category) as plant_categories
FROM gardens g
LEFT JOIN planted_items pi ON g.id = pi.garden_id
GROUP BY g.id;

-- Create view for user statistics
CREATE VIEW user_garden_stats AS
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    COUNT(DISTINCT g.id) as total_gardens,
    COUNT(DISTINCT pi.id) as total_plants,
    SUM(g.width * g.height) as total_garden_area,
    MAX(g.updated_at) as last_garden_update
FROM users u
LEFT JOIN gardens g ON u.id = g.user_id
LEFT JOIN planted_items pi ON g.id = pi.garden_id
WHERE u.is_active = TRUE
GROUP BY u.id;

-- Create triggers to automatically update plant_count
DELIMITER //

CREATE TRIGGER update_plant_count_insert
AFTER INSERT ON planted_items
FOR EACH ROW
BEGIN
    UPDATE gardens 
    SET plant_count = (
        SELECT COUNT(*) 
        FROM planted_items 
        WHERE garden_id = NEW.garden_id
    )
    WHERE id = NEW.garden_id;
END//

CREATE TRIGGER update_plant_count_delete
AFTER DELETE ON planted_items
FOR EACH ROW
BEGIN
    UPDATE gardens 
    SET plant_count = (
        SELECT COUNT(*) 
        FROM planted_items 
        WHERE garden_id = OLD.garden_id
    )
    WHERE id = OLD.garden_id;
END//

DELIMITER ;

-- Sample data for testing (optional)
-- Uncomment the following to add test data

/*
-- Sample test user
INSERT INTO users (name, email, password_hash, role) VALUES 
('Test User', 'test@example.com', '$2b$10$testhashedpassword', 'user');

-- Sample garden for test user
INSERT INTO gardens (user_id, name, description, width, height, soil_type, location, status) VALUES 
(2, 'My First Garden', 'A small starter vegetable garden', 8, 6, 'Loamy', 'Backyard', 'Active');

-- Sample planted items
INSERT INTO planted_items (garden_id, plant_id, plant_name, plant_emoji, plant_size, plant_category, x_position, y_position, notes) VALUES 
(1, 'tomato', 'Tomato', '🍅', 2, 'vegetables', 2, 1, 'Cherry tomato variety'),
(1, 'basil', 'Basil', '🌿', 1, 'herbs', 4, 1, 'Companion plant with tomatoes'),
(1, 'lettuce', 'Lettuce', '🥬', 1, 'vegetables', 0, 3, 'Butterhead variety');

-- Sample activities
INSERT INTO garden_activities (garden_id, user_id, activity_type, plant_name, activity_date, notes) VALUES 
(1, 2, 'planted', 'Tomato', CURDATE(), 'Started from seedlings'),
(1, 2, 'watered', 'Tomato', CURDATE(), 'Morning watering'),
(1, 2, 'planted', 'Basil', CURDATE() - INTERVAL 1 DAY, 'Companion planting');

-- Sample tasks
INSERT INTO garden_tasks (garden_id, user_id, title, description, plant_name, task_type, due_date, priority) VALUES 
(1, 2, 'Water tomatoes', 'Regular watering for tomato plants', 'Tomato', 'water', CURDATE() + INTERVAL 1 DAY, 'high'),
(1, 2, 'Fertilize garden', 'Apply organic fertilizer to all plants', NULL, 'fertilize', CURDATE() + INTERVAL 3 DAY, 'medium');
*/