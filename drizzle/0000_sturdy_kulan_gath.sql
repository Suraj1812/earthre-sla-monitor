CREATE TABLE `checks` (
	`id` text PRIMARY KEY NOT NULL,
	`upload_id` text NOT NULL,
	`source_row` integer NOT NULL,
	`service_id` text NOT NULL,
	`service_name` text NOT NULL,
	`timestamp` text NOT NULL,
	`check_date` text NOT NULL,
	`status_code` integer NOT NULL,
	`latency_ms` integer NOT NULL,
	`agent` text NOT NULL,
	`region` text NOT NULL,
	FOREIGN KEY (`upload_id`) REFERENCES `uploads`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE INDEX `idx_checks_upload_date` ON `checks` (`upload_id`,`check_date`,`timestamp`);
CREATE INDEX `idx_checks_upload_service` ON `checks` (`upload_id`,`service_id`);
CREATE UNIQUE INDEX `uq_checks_upload_reading` ON `checks` (`upload_id`,`service_id`,`timestamp`,`agent`);
CREATE TABLE `uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`filename` text NOT NULL,
	`uploaded_at` text NOT NULL,
	`accepted_rows` integer NOT NULL,
	`rejected_rows` integer NOT NULL,
	`duplicate_rows` integer NOT NULL,
	`date_from` text,
	`date_to` text
);
