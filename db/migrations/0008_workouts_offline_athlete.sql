ALTER TABLE `workouts` ADD `offline_athlete_id` integer REFERENCES `offline_athletes`(`id`) ON DELETE CASCADE;
