-- CreateEnum
CREATE TYPE "AnalyticsPeriod" AS ENUM ('DAY', 'WEEK', 'MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('PDF', 'CSV', 'JSON');

-- CreateTable
CREATE TABLE "analytics_snapshots" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "snapshotDate" DATE NOT NULL,
    "productivityScore" INTEGER NOT NULL,
    "habitScore" INTEGER NOT NULL,
    "plannerScore" INTEGER NOT NULL,
    "goalScore" INTEGER NOT NULL,
    "journalScore" INTEGER NOT NULL,
    "focusMinutes" INTEGER NOT NULL,
    "streakDays" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_exports" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "format" "ExportFormat" NOT NULL,
    "status" TEXT NOT NULL,
    "filePath" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_exports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analytics_snapshots_userId_snapshotDate_idx" ON "analytics_snapshots"("userId", "snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_snapshots_userId_snapshotDate_key" ON "analytics_snapshots"("userId", "snapshotDate");

-- CreateIndex
CREATE INDEX "analytics_exports_userId_createdAt_idx" ON "analytics_exports"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "analytics_snapshots" ADD CONSTRAINT "analytics_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_exports" ADD CONSTRAINT "analytics_exports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
