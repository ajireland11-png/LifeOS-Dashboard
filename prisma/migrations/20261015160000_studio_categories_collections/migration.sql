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
