-- Drop old template/assigned tables
DROP TABLE IF EXISTS `assigned_workouts`;
DROP TABLE IF EXISTS `template_sets`;
DROP TABLE IF EXISTS `template_exercises`;
DROP TABLE IF EXISTS `workout_templates`;

-- Plans
CREATE TABLE `plans` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `author_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `name` text NOT NULL,
  `description` text,
  `weeks_count` integer NOT NULL DEFAULT 4,
  `is_public` integer NOT NULL DEFAULT false,
  `created_at` integer NOT NULL DEFAULT (unixepoch())
);

-- Plan sessions (Day 1, Day 2, ...)
CREATE TABLE `plan_sessions` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `plan_id` integer NOT NULL REFERENCES `plans`(`id`) ON DELETE CASCADE,
  `day_number` integer NOT NULL,
  `name` text NOT NULL,
  `notes` text,
  `order_index` integer NOT NULL DEFAULT 0
);

-- Exercises within a plan session
CREATE TABLE `plan_session_exercises` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `plan_session_id` integer NOT NULL REFERENCES `plan_sessions`(`id`) ON DELETE CASCADE,
  `exercise_id` integer NOT NULL REFERENCES `exercises`(`id`),
  `order_index` integer NOT NULL DEFAULT 0
);

-- Target sets within a plan session exercise
CREATE TABLE `plan_session_sets` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `plan_session_exercise_id` integer NOT NULL REFERENCES `plan_session_exercises`(`id`) ON DELETE CASCADE,
  `set_number` integer NOT NULL,
  `reps` integer,
  `weight_kg` real,
  `duration_seconds` integer
);

-- Athlete enrollment in a plan
CREATE TABLE `athlete_plans` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `athlete_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `plan_id` integer NOT NULL REFERENCES `plans`(`id`) ON DELETE CASCADE,
  `assigned_by` text REFERENCES `users`(`id`) ON DELETE SET NULL,
  `start_date` integer,
  `created_at` integer NOT NULL DEFAULT (unixepoch())
);
