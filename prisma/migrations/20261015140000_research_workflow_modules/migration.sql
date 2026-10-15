ALTER TABLE "ResearchPaper" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'reading';
ALTER TABLE "ResearchPaper" ADD COLUMN "targetJournal" TEXT;
ALTER TABLE "ResearchPaper" ADD COLUMN "submissionDeadline" TEXT;
ALTER TABLE "ResearchPaper" ADD COLUMN "sectionsJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "ResearchPaper" ADD COLUMN "datasetsJson" TEXT NOT NULL DEFAULT '[]';
