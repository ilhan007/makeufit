CREATE TABLE `plan_day_completions` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `athlete_plan_id` integer NOT NULL REFERENCES `athlete_plans`(`id`) ON DELETE CASCADE,
  `day_number` integer NOT NULL,
  `workout_id` integer REFERENCES `workouts`(`id`) ON DELETE SET NULL,
  `completed_at` integer NOT NULL DEFAULT (unixepoch())
);
