ALTER TABLE `body_metrics` ADD `offline_athlete_id` integer REFERENCES `offline_athletes`(`id`) ON DELETE CASCADE;
