-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "avatar" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "theme" TEXT NOT NULL DEFAULT 'system',
    "setupComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sidebarCollapsed" BOOLEAN NOT NULL DEFAULT false,
    "defaultView" TEXT NOT NULL DEFAULT 'dashboard',
    "weekStartsOn" INTEGER NOT NULL DEFAULT 1,
    "dateFormat" TEXT NOT NULL DEFAULT 'yyyy-MM-dd',
    "timeFormat" TEXT NOT NULL DEFAULT '24h',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "backupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "backupFrequency" TEXT NOT NULL DEFAULT 'weekly',
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL,
    CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "layout" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Widget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "config" TEXT,
    "positionX" INTEGER NOT NULL DEFAULT 0,
    "positionY" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER NOT NULL DEFAULT 4,
    "height" INTEGER NOT NULL DEFAULT 3,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL,
    CONSTRAINT "Widget_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "dueDate" INTEGER,
    "startDate" INTEGER,
    "completedAt" INTEGER,
    "estimatedMinutes" INTEGER,
    "actualMinutes" INTEGER,
    "recurrence" TEXT,
    "recurrenceConfig" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL,
    "projectId" TEXT,
    "parentTaskId" TEXT,
    CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "TaskTag_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskDependency" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "dependsOnId" TEXT NOT NULL,
    CONSTRAINT "TaskDependency_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskDependency_dependsOnId_fkey" FOREIGN KEY ("dependsOnId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    "icon" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startDate" INTEGER,
    "endDate" INTEGER,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'note',
    "icon" TEXT,
    "color" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL,
    "folderId" TEXT,
    CONSTRAINT "Note_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "NoteFolder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NoteFolder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "parentId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL,
    CONSTRAINT "NoteFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "NoteFolder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NoteTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "noteId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "NoteTag_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NoteTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NoteLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceNoteId" TEXT NOT NULL,
    "targetNoteId" TEXT NOT NULL,
    CONSTRAINT "NoteLink_sourceNoteId_fkey" FOREIGN KEY ("sourceNoteId") REFERENCES "Note" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NoteLink_targetNoteId_fkey" FOREIGN KEY ("targetNoteId") REFERENCES "Note" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "favicon" TEXT,
    "noteId" TEXT,
    "createdAt" INTEGER NOT NULL,
    CONSTRAINT "Bookmark_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BookmarkTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookmarkId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "BookmarkTag_bookmarkId_fkey" FOREIGN KEY ("bookmarkId") REFERENCES "Bookmark" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BookmarkTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'personal',
    "status" TEXT NOT NULL DEFAULT 'not-started',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "startDate" INTEGER,
    "targetDate" INTEGER,
    "completedAt" INTEGER,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL,
    "parentGoalId" TEXT,
    CONSTRAINT "Goal_parentGoalId_fkey" FOREIGN KEY ("parentGoalId") REFERENCES "Goal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GoalTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goalId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "GoalTag_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GoalTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL,
    CONSTRAINT "Milestone_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GoalProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goalId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    CONSTRAINT "GoalProject_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GoalProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Habit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    "frequency" TEXT NOT NULL DEFAULT 'daily',
    "frequencyConfig" TEXT,
    "targetCount" INTEGER NOT NULL DEFAULT 1,
    "unit" TEXT,
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reminderTime" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "HabitTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "habitId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "HabitTag_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HabitTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HabitLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "habitId" TEXT NOT NULL,
    "date" INTEGER NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "createdAt" INTEGER NOT NULL,
    CONSTRAINT "HabitLog_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "content" TEXT NOT NULL DEFAULT '',
    "mood" TEXT,
    "moodScore" INTEGER,
    "energy" INTEGER,
    "stress" INTEGER,
    "gratitude" TEXT,
    "tags" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "date" INTEGER NOT NULL,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "JournalTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entryId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "JournalTag_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JournalTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinanceAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'checking',
    "balance" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "color" TEXT,
    "icon" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "TransactionCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    "type" TEXT NOT NULL DEFAULT 'expense',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amount" REAL NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'expense',
    "date" INTEGER NOT NULL,
    "note" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrence" TEXT,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL,
    "accountId" TEXT NOT NULL,
    "categoryId" TEXT,
    "transferToId" TEXT,
    CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinanceAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TransactionCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "period" TEXT NOT NULL DEFAULT 'monthly',
    "startDate" INTEGER NOT NULL,
    "endDate" INTEGER,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "BudgetItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "budgetId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "spent" REAL NOT NULL DEFAULT 0,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL,
    CONSTRAINT "BudgetItem_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BudgetItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TransactionCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "provider" TEXT,
    "url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'not-started',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "startDate" INTEGER,
    "endDate" INTEGER,
    "rating" INTEGER,
    "notes" TEXT,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "CourseResource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'video',
    "url" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL,
    CONSTRAINT "CourseResource_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" INTEGER NOT NULL,
    "endDate" INTEGER,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    "location" TEXT,
    "recurrence" TEXT,
    "recurrenceConfig" TEXT,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL,
    "taskId" TEXT,
    CONSTRAINT "CalendarEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "startTime" INTEGER NOT NULL,
    "endTime" INTEGER,
    "duration" INTEGER,
    "billable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL,
    "taskId" TEXT,
    CONSTRAINT "TimeEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PomodoroSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'focus',
    "duration" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "taskId" TEXT,
    "startedAt" INTEGER NOT NULL,
    "completedAt" INTEGER,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL,
    CONSTRAINT "PomodoroSession_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_email_key" ON "UserProfile"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_userId_key" ON "Settings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskTag_taskId_tagId_key" ON "TaskTag"("taskId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskDependency_taskId_dependsOnId_key" ON "TaskDependency"("taskId", "dependsOnId");

-- CreateIndex
CREATE UNIQUE INDEX "NoteTag_noteId_tagId_key" ON "NoteTag"("noteId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "NoteLink_sourceNoteId_targetNoteId_key" ON "NoteLink"("sourceNoteId", "targetNoteId");

-- CreateIndex
CREATE UNIQUE INDEX "BookmarkTag_bookmarkId_tagId_key" ON "BookmarkTag"("bookmarkId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "GoalTag_goalId_tagId_key" ON "GoalTag"("goalId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "GoalProject_goalId_projectId_key" ON "GoalProject"("goalId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "HabitTag_habitId_tagId_key" ON "HabitTag"("habitId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "HabitLog_habitId_date_key" ON "HabitLog"("habitId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "JournalTag_entryId_tagId_key" ON "JournalTag"("entryId", "tagId");

-- New LifeOS workspace tables kept in sync with prisma/schema.prisma.
CREATE TABLE "ExploreSubject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT NOT NULL DEFAULT '',
    "parentId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'subject',
    "status" TEXT NOT NULL DEFAULT 'not-started',
    "bookmarked" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "prerequisitesJson" TEXT NOT NULL DEFAULT '[]',
    "relatedJson" TEXT NOT NULL DEFAULT '[]',
    "referencesJson" TEXT NOT NULL DEFAULT '[]',
    "layersJson" TEXT NOT NULL DEFAULT '{}',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL,
    CONSTRAINT "ExploreSubject_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ExploreSubject" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "ExploreSubject_parentId_position_idx" ON "ExploreSubject"("parentId","position");
CREATE INDEX "ExploreSubject_status_idx" ON "ExploreSubject"("status");

CREATE TABLE "StudioItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'idea',
    "summary" TEXT,
    "content" TEXT NOT NULL DEFAULT '',
    "sourceUrl" TEXT,
    "imageUrl" TEXT,
    "category" TEXT,
    "tagsJson" TEXT NOT NULL DEFAULT '[]',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL
);

CREATE TABLE "KnowledgeItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT NOT NULL DEFAULT '',
    "sourceUrl" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL
);

CREATE TABLE "AtlasConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'connected',
    "label" TEXT,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL
);
CREATE UNIQUE INDEX "AtlasConnection_sourceType_sourceId_targetType_targetId_kind_key"
    ON "AtlasConnection"("sourceType", "sourceId", "targetType", "targetId", "kind");
CREATE INDEX "AtlasConnection_sourceType_sourceId_idx" ON "AtlasConnection"("sourceType", "sourceId");
CREATE INDEX "AtlasConnection_targetType_targetId_idx" ON "AtlasConnection"("targetType", "targetId");

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
    "status" TEXT NOT NULL DEFAULT 'reading',
    "targetJournal" TEXT,
    "submissionDeadline" TEXT,
    "sectionsJson" TEXT NOT NULL DEFAULT '[]',
    "datasetsJson" TEXT NOT NULL DEFAULT '[]',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL
);
CREATE INDEX "ResearchPaper_archived_idx" ON "ResearchPaper"("archived");
CREATE INDEX "ResearchPaper_updatedAt_idx" ON "ResearchPaper"("updatedAt");

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

CREATE TABLE "PersonRelationship" (
    "personId" TEXT NOT NULL,
    "relatedPersonId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Related',
    "createdAt" INTEGER NOT NULL,
    PRIMARY KEY ("personId", "relatedPersonId"),
    CONSTRAINT "PersonRelationship_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PersonRelationship_relatedPersonId_fkey" FOREIGN KEY ("relatedPersonId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PersonRelationship_relatedPersonId_idx" ON "PersonRelationship"("relatedPersonId");

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

CREATE TABLE "ResearchPaperTaskLink" (
    "paperId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "createdAt" INTEGER NOT NULL,
    PRIMARY KEY ("paperId", "taskId"),
    CONSTRAINT "ResearchPaperTaskLink_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "ResearchPaper" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResearchPaperTaskLink_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ResearchPaperTaskLink_taskId_idx" ON "ResearchPaperTaskLink"("taskId");

CREATE TABLE "StudioCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "accent" TEXT NOT NULL DEFAULT 'sage',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL
);
CREATE INDEX "StudioCategory_position_idx" ON "StudioCategory"("position");

CREATE TABLE "StudioCollection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL
);
CREATE INDEX "StudioCollection_name_idx" ON "StudioCollection"("name");

CREATE TABLE "StudioCollectionItem" (
    "collectionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "createdAt" INTEGER NOT NULL,
    PRIMARY KEY ("collectionId", "itemId"),
    CONSTRAINT "StudioCollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "StudioCollection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudioCollectionItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "StudioItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "StudioCollectionItem_itemId_idx" ON "StudioCollectionItem"("itemId");
