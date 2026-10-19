CREATE TABLE "PaperInterpreterPaper" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "authors" TEXT,
  "journal" TEXT,
  "year" INTEGER,
  "doi" TEXT,
  "sourceUrl" TEXT,
  "inputType" TEXT NOT NULL,
  "fileName" TEXT,
  "sourceFile" BLOB,
  "extractedText" TEXT,
  "metadataJson" TEXT,
  "analysisJson" TEXT,
  "status" TEXT NOT NULL DEFAULT 'submitted',
  "stage" TEXT NOT NULL DEFAULT 'Submitted',
  "error" TEXT,
  "notes" TEXT NOT NULL DEFAULT '',
  "bookmarked" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL,
  "analyzedAt" BIGINT
);
CREATE INDEX "PaperInterpreterPaper_status_idx" ON "PaperInterpreterPaper"("status");
CREATE INDEX "PaperInterpreterPaper_updatedAt_idx" ON "PaperInterpreterPaper"("updatedAt");
CREATE INDEX "PaperInterpreterPaper_doi_idx" ON "PaperInterpreterPaper"("doi");
CREATE INDEX "PaperInterpreterPaper_sourceUrl_idx" ON "PaperInterpreterPaper"("sourceUrl");
