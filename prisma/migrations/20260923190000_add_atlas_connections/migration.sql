-- CreateTable
CREATE TABLE "AtlasConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'connected',
    "label" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "AtlasConnection_sourceType_sourceId_idx" ON "AtlasConnection"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "AtlasConnection_targetType_targetId_idx" ON "AtlasConnection"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "AtlasConnection_sourceType_sourceId_targetType_targetId_kind_key" ON "AtlasConnection"("sourceType", "sourceId", "targetType", "targetId", "kind");
