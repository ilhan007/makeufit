CREATE TABLE `offline_athletes` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `coach_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `name` text NOT NULL,
  `email` text,
  `created_at` integer NOT NULL DEFAULT (unixepoch())
);
