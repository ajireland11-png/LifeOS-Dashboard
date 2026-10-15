ALTER TABLE "StudioItem" ADD COLUMN "sourceAccount" TEXT;
ALTER TABLE "StudioItem" ADD COLUMN "techniquesJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "StudioItem" ADD COLUMN "materialsJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "StudioItem" ADD COLUMN "skillLevel" TEXT;
