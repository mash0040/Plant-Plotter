CREATE DATABASE plant_potter;

USE plant_potter;

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    preferences TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE gardens (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    user_id INTEGER,
    name VARCHAR(100),
    width FLOAT,
    height FLOAT,
    units VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE plants (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    spacing FLOAT,
    soil_type VARCHAR(50),
    image_url TEXT
);

CREATE TABLE plant_placements (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    garden_id INTEGER,
    plant_id INTEGER,
    x_coord INTEGER,
    y_coord INTEGER,
    quantity INTEGER,
    FOREIGN KEY (garden_id) REFERENCES gardens(id),
    FOREIGN KEY (plant_id) REFERENCES plants(id)
);

CREATE TABLE companions (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    plant_id_1 INTEGER,
    plant_id_2 INTEGER,
    is_good BOOLEAN,
    note TEXT,
    FOREIGN KEY (plant_id_1) REFERENCES plants(id),
    FOREIGN KEY (plant_id_2) REFERENCES plants(id)
);

CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    garden_id INTEGER,
    plant_id INTEGER,
    event_type VARCHAR(50),
    date DATE,
    note TEXT,
    FOREIGN KEY (garden_id) REFERENCES gardens(id),
    FOREIGN KEY (plant_id) REFERENCES plants(id)
);

CREATE TABLE weather_logs (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    garden_id INTEGER,
    date DATE,
    temperature FLOAT,
    rainfall FLOAT,
    FOREIGN KEY (garden_id) REFERENCES gardens(id)
);

SHOW TABLES;
