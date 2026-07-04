-- CreateEnum
CREATE TYPE "JournalType" AS ENUM ('MORNING', 'EVENING', 'FREEFORM');

-- CreateEnum
CREATE TYPE "Mood" AS ENUM ('VERY_BAD', 'BAD', 'NEUTRAL', 'GOOD', 'EXCELLENT');

-- CreateEnum
CREATE TYPE "Energy" AS ENUM ('VERY_LOW', 'LOW', 'NORMAL', 'HIGH', 'VERY_HIGH');

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "JournalType" NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "mood" "Mood",
    "energy" "Energy",
    "productivity" INTEGER,
    "gratitude" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "wins" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lessons" TEXT,
    "tomorrowPlan" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "weather" TEXT,
    "location" TEXT,
    "intention" TEXT,
    "topPriorities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "affirmation" TEXT,
    "visualization" TEXT,
    "expectedChallenges" TEXT,
    "wentWell" TEXT,
    "wentWrong" TEXT,
    "plannerReflection" TEXT,
    "habitReflection" TEXT,
    "goalReflection" TEXT,
    "goalId" TEXT,
    "plannerDayId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_attachments" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_prompts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "JournalType" NOT NULL,
    "question" TEXT NOT NULL,
    "placeholder" TEXT,
    "order" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "journal_entries_userId_date_idx" ON "journal_entries"("userId", "date");

-- CreateIndex
CREATE INDEX "journal_entries_userId_date_type_idx" ON "journal_entries"("userId", "date", "type");

-- CreateIndex
CREATE INDEX "journal_entries_userId_type_idx" ON "journal_entries"("userId", "type");

-- CreateIndex
CREATE INDEX "journal_entries_goalId_idx" ON "journal_entries"("goalId");

-- CreateIndex
CREATE INDEX "journal_entries_plannerDayId_idx" ON "journal_entries"("plannerDayId");

-- CreateIndex
CREATE INDEX "journal_attachments_journalId_idx" ON "journal_attachments"("journalId");

-- CreateIndex
CREATE UNIQUE INDEX "journal_prompts_code_key" ON "journal_prompts"("code");

-- CreateIndex
CREATE INDEX "journal_prompts_type_order_idx" ON "journal_prompts"("type", "order");

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_plannerDayId_fkey" FOREIGN KEY ("plannerDayId") REFERENCES "planner_days"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_attachments" ADD CONSTRAINT "journal_attachments_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
