ALTER TABLE "StudioItem" ADD COLUMN "sourceUrl" TEXT;
ALTER TABLE "StudioItem" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "StudioItem" ADD COLUMN "category" TEXT;
ALTER TABLE "StudioItem" ADD COLUMN "tagsJson" TEXT NOT NULL DEFAULT '[]';
