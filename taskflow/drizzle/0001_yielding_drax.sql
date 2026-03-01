CREATE TABLE `meetings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`raw_text` text NOT NULL,
	`task_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `users` ADD `work_summary` text;