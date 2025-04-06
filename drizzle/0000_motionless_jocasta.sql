CREATE TABLE `credentials` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`credential_string` text NOT NULL,
	`parsed_credential` text,
	`credential_format` text NOT NULL,
	`credential_claims` text,
	`public_key` text NOT NULL,
	`private_key` text NOT NULL,
	`iss_date` integer NOT NULL,
	`exp_date` integer
);
--> statement-breakpoint
CREATE TABLE `logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`transaction_type` text NOT NULL,
	`status` text NOT NULL,
	`details` text,
	`transaction_datetime` integer NOT NULL,
	`relying_party` text
);
