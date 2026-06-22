-- ALLOW_DESTRUCTIVE_NO_PRODUCTION_DATA: approved double-axis replacement before launch.
TRUNCATE TABLE "Reflection", "Event";
ALTER TABLE "Reflection" DROP CONSTRAINT "Reflection_moodId_fkey";
ALTER TABLE "Event" DROP CONSTRAINT "Event_moodId_fkey";
DROP TABLE "TrackMood";
DROP TABLE "MoodCategory";

ALTER TABLE "Reflection" DROP COLUMN "moodId";
ALTER TABLE "Reflection" ADD COLUMN "originId" TEXT NOT NULL;
ALTER TABLE "Reflection" ADD COLUMN "needId" TEXT NOT NULL;
ALTER TABLE "Event" DROP COLUMN "moodId";
ALTER TABLE "Event" ADD COLUMN "originId" TEXT;
ALTER TABLE "Event" ADD COLUMN "needId" TEXT;

CREATE TABLE "OriginCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OriginCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OriginCategory_slug_key" ON "OriginCategory"("slug");
CREATE INDEX "OriginCategory_sortOrder_idx" ON "OriginCategory"("sortOrder");

CREATE TABLE "NeedCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "reflectionPrompt" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NeedCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NeedCategory_slug_key" ON "NeedCategory"("slug");
CREATE INDEX "NeedCategory_sortOrder_idx" ON "NeedCategory"("sortOrder");

CREATE TABLE "TrackOrigin" (
  "trackId" TEXT NOT NULL,
  "originId" TEXT NOT NULL,
  "weight" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  CONSTRAINT "TrackOrigin_pkey" PRIMARY KEY ("trackId", "originId")
);
CREATE INDEX "TrackOrigin_originId_weight_idx" ON "TrackOrigin"("originId", "weight");

CREATE TABLE "TrackNeed" (
  "trackId" TEXT NOT NULL,
  "needId" TEXT NOT NULL,
  "weight" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  CONSTRAINT "TrackNeed_pkey" PRIMARY KEY ("trackId", "needId")
);
CREATE INDEX "TrackNeed_needId_weight_idx" ON "TrackNeed"("needId", "weight");

ALTER TABLE "TrackOrigin" ADD CONSTRAINT "TrackOrigin_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrackOrigin" ADD CONSTRAINT "TrackOrigin_originId_fkey" FOREIGN KEY ("originId") REFERENCES "OriginCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrackNeed" ADD CONSTRAINT "TrackNeed_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrackNeed" ADD CONSTRAINT "TrackNeed_needId_fkey" FOREIGN KEY ("needId") REFERENCES "NeedCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Reflection" ADD CONSTRAINT "Reflection_originId_fkey" FOREIGN KEY ("originId") REFERENCES "OriginCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Reflection" ADD CONSTRAINT "Reflection_needId_fkey" FOREIGN KEY ("needId") REFERENCES "NeedCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Event" ADD CONSTRAINT "Event_originId_fkey" FOREIGN KEY ("originId") REFERENCES "OriginCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Event" ADD CONSTRAINT "Event_needId_fkey" FOREIGN KEY ("needId") REFERENCES "NeedCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
