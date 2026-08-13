CREATE TABLE `research_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`researchId` varchar(36) NOT NULL,
	`sequence` int NOT NULL,
	`type` enum('plan','search','analysis','synthesis','report','error') NOT NULL,
	`message` text NOT NULL,
	`detail` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `research_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `research_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`researchId` varchar(36) NOT NULL,
	`title` varchar(500) NOT NULL,
	`url` text NOT NULL,
	`domain` varchar(255) NOT NULL,
	`sourceType` varchar(64) NOT NULL,
	`excerpt` text NOT NULL,
	`relevanceScore` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `research_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `research_tasks` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(240) NOT NULL,
	`query` text NOT NULL,
	`provider` enum('openai','anthropic','gemini','groq','manus') NOT NULL,
	`model` varchar(160) NOT NULL,
	`status` enum('running','completed','failed') NOT NULL DEFAULT 'running',
	`reportContent` text,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	CONSTRAINT `research_tasks_id` PRIMARY KEY(`id`)
);
