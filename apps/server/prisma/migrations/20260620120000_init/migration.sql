-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TrackStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "MoodCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoodCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "composer" TEXT NOT NULL,
    "performer" TEXT,
    "category" TEXT NOT NULL,
    "period" TEXT,
    "durationText" TEXT NOT NULL,
    "bilibiliUrl" TEXT NOT NULL,
    "bilibiliBvid" TEXT,
    "searchKeywords" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "status" "TrackStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackMood" (
    "trackId" TEXT NOT NULL,
    "moodId" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "TrackMood_pkey" PRIMARY KEY ("trackId","moodId")
);

-- CreateTable
CREATE TABLE "Guide" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "intro" TEXT NOT NULL,
    "firstImpression" TEXT NOT NULL,
    "background" TEXT NOT NULL,
    "listeningPoints" TEXT NOT NULL,
    "emotionalInterpretation" TEXT NOT NULL,
    "reflectionQuestion" TEXT NOT NULL,
    "takeaway" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reflection" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "moodId" TEXT NOT NULL,
    "anonymousId" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "content" VARCHAR(120) NOT NULL,
    "shareCode" TEXT NOT NULL,
    "deletionTokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reflection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "anonymousId" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "moodId" TEXT,
    "trackId" TEXT,
    "shareCode" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MoodCategory_slug_key" ON "MoodCategory"("slug");

-- CreateIndex
CREATE INDEX "MoodCategory_sortOrder_idx" ON "MoodCategory"("sortOrder");

-- CreateIndex
CREATE INDEX "Track_status_idx" ON "Track"("status");

-- CreateIndex
CREATE INDEX "TrackMood_moodId_weight_idx" ON "TrackMood"("moodId", "weight");

-- CreateIndex
CREATE UNIQUE INDEX "Guide_trackId_key" ON "Guide"("trackId");

-- CreateIndex
CREATE UNIQUE INDEX "Reflection_idempotencyKey_key" ON "Reflection"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Reflection_shareCode_key" ON "Reflection"("shareCode");

-- CreateIndex
CREATE INDEX "Reflection_anonymousId_idx" ON "Reflection"("anonymousId");

-- CreateIndex
CREATE INDEX "Reflection_createdAt_idx" ON "Reflection"("createdAt");

-- CreateIndex
CREATE INDEX "Event_eventName_createdAt_idx" ON "Event"("eventName", "createdAt");

-- CreateIndex
CREATE INDEX "Event_journeyId_idx" ON "Event"("journeyId");

-- CreateIndex
CREATE INDEX "Event_shareCode_idx" ON "Event"("shareCode");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

-- AddForeignKey
ALTER TABLE "TrackMood" ADD CONSTRAINT "TrackMood_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackMood" ADD CONSTRAINT "TrackMood_moodId_fkey" FOREIGN KEY ("moodId") REFERENCES "MoodCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guide" ADD CONSTRAINT "Guide_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reflection" ADD CONSTRAINT "Reflection_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reflection" ADD CONSTRAINT "Reflection_moodId_fkey" FOREIGN KEY ("moodId") REFERENCES "MoodCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_moodId_fkey" FOREIGN KEY ("moodId") REFERENCES "MoodCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE SET NULL ON UPDATE CASCADE;
