ALTER TABLE `athlete_plans` ADD `offline_athlete_id` integer REFERENCES `offline_athletes`(`id`) ON DELETE CASCADE;
ALTER TABLE `athlete_plans` DROP COLUMN `athlete_id`;
ALTER TABLE `athlete_plans` ADD `athlete_id` text REFERENCES `users`(`id`) ON DELETE CASCADE;
