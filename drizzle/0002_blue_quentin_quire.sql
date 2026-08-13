CREATE TABLE `provider_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` enum('openai','anthropic','gemini','groq','manus') NOT NULL,
	`model` varchar(160) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `provider_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `provider_preferences_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `research_reports` (
	`researchId` varchar(36) NOT NULL,
	`executiveSummary` text NOT NULL,
	`findings` json NOT NULL,
	`sources` json NOT NULL,
	`markdown` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `research_reports_researchId` PRIMARY KEY(`researchId`)
);
--> statement-breakpoint
CREATE INDEX `research_events_research_sequence_idx` ON `research_events` (`researchId`,`sequence`);--> statement-breakpoint
CREATE INDEX `research_sources_research_score_idx` ON `research_sources` (`researchId`,`relevanceScore`);--> statement-breakpoint
CREATE INDEX `research_tasks_user_updated_idx` ON `research_tasks` (`userId`,`updatedAt`);