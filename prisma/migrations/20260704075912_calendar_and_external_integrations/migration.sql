-- CreateEnum
CREATE TYPE "CalendarProvider" AS ENUM ('LOCAL', 'GOOGLE', 'MICROSOFT', 'APPLE', 'ICAL');

-- CreateEnum
CREATE TYPE "CalendarSource" AS ENUM ('LOCAL', 'SYNCED');

-- CreateEnum
CREATE TYPE "CalendarStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateTable
CREATE TABLE "calendars" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" "CalendarProvider" NOT NULL DEFAULT 'LOCAL',
    "color" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "plannerBlockId" TEXT,
    "taskId" TEXT,
    "goalId" TEXT,
    "journalEntryId" TEXT,
    "externalId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "source" "CalendarSource" NOT NULL DEFAULT 'LOCAL',
    "status" "CalendarStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_syncs" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "lastSync" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_syncs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calendars_userId_enabled_idx" ON "calendars"("userId", "enabled");

-- CreateIndex
CREATE INDEX "calendar_events_calendarId_startTime_idx" ON "calendar_events"("calendarId", "startTime");

-- CreateIndex
CREATE INDEX "calendar_events_plannerBlockId_idx" ON "calendar_events"("plannerBlockId");

-- CreateIndex
CREATE INDEX "calendar_events_taskId_idx" ON "calendar_events"("taskId");

-- CreateIndex
CREATE INDEX "calendar_events_goalId_idx" ON "calendar_events"("goalId");

-- CreateIndex
CREATE INDEX "calendar_events_journalEntryId_idx" ON "calendar_events"("journalEntryId");

-- CreateIndex
CREATE INDEX "calendar_syncs_calendarId_createdAt_idx" ON "calendar_syncs"("calendarId", "createdAt");

-- AddForeignKey
ALTER TABLE "calendars" ADD CONSTRAINT "calendars_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_plannerBlockId_fkey" FOREIGN KEY ("plannerBlockId") REFERENCES "planner_blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_syncs" ADD CONSTRAINT "calendar_syncs_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;
