CREATE TABLE "ResearchPaper" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "authors" TEXT,
    "journal" TEXT,
    "year" INTEGER,
    "doi" TEXT,
    "sourceUrl" TEXT,
    "abstract" TEXT,
    "scientificQuestion" TEXT,
    "background" TEXT,
    "mechanisms" TEXT,
    "interpretation" TEXT,
    "limitations" TEXT,
    "openQuestions" TEXT,
    "notes" TEXT,
    "figuresJson" TEXT NOT NULL DEFAULT '[]',
    "tablesJson" TEXT NOT NULL DEFAULT '[]',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE INDEX "ResearchPaper_archived_idx" ON "ResearchPaper"("archived");
CREATE INDEX "ResearchPaper_updatedAt_idx" ON "ResearchPaper"("updatedAt");
