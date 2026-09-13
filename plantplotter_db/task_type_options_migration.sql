-- Production task type expansion for Tracker.
-- Upgrade older databases whose task_type enum is missing treat or other.
-- Fresh installations already include these options and should skip this file.
-- Keeps existing values, including maintenance, and adds treat + other.

USE garden_plotter;

ALTER TABLE garden_tasks
  MODIFY task_type ENUM(
    'water',
    'fertilize',
    'harvest',
    'plant',
    'prune',
    'weed',
    'inspect',
    'treat',
    'other',
    'maintenance'
  ) NOT NULL;
