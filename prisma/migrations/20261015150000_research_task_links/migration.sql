CREATE TABLE "ResearchPaperTaskLink" (
    "paperId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "createdAt" INTEGER NOT NULL,
    PRIMARY KEY ("paperId", "taskId"),
    CONSTRAINT "ResearchPaperTaskLink_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "ResearchPaper" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResearchPaperTaskLink_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ResearchPaperTaskLink_taskId_idx" ON "ResearchPaperTaskLink"("taskId");
