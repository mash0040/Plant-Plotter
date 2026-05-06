-- Production task type expansion for Tracker.
-- Apply after the base schema so scheduled tasks can represent more real garden work.
-- Keeps existing values, including maintenance, and adds treat + other.

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
