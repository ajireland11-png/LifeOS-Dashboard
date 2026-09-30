-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Habit" (
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
    "gapForgiveness" INTEGER NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Habit" ("archived", "color", "createdAt", "description", "frequency", "frequencyConfig", "icon", "id", "name", "reminderEnabled", "reminderTime", "targetCount", "unit", "updatedAt") SELECT "archived", "color", "createdAt", "description", "frequency", "frequencyConfig", "icon", "id", "name", "reminderEnabled", "reminderTime", "targetCount", "unit", "updatedAt" FROM "Habit";
DROP TABLE "Habit";
ALTER TABLE "new_Habit" RENAME TO "Habit";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
