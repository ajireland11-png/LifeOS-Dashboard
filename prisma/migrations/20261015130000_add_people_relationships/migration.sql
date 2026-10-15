CREATE TABLE "Person" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL DEFAULT 'Friend',
    "photoUrl" TEXT,
    "birthday" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "interestsJson" TEXT NOT NULL DEFAULT '[]',
    "giftIdeasJson" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL
);
CREATE INDEX "Person_name_idx" ON "Person"("name");
CREATE INDEX "Person_archived_idx" ON "Person"("archived");

CREATE TABLE "PersonDate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'important',
    "recurrence" TEXT NOT NULL DEFAULT 'yearly',
    "reminderDays" INTEGER NOT NULL DEFAULT 7,
    "notes" TEXT,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL,
    CONSTRAINT "PersonDate_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PersonDate_personId_date_idx" ON "PersonDate"("personId", "date");

CREATE TABLE "PersonTaskLink" (
    "personId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "createdAt" INTEGER NOT NULL,
    PRIMARY KEY ("personId", "taskId"),
    CONSTRAINT "PersonTaskLink_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PersonTaskLink_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PersonTaskLink_taskId_idx" ON "PersonTaskLink"("taskId");
