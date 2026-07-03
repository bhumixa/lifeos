-- CreateEnum
CREATE TYPE "PlannerBlockType" AS ENUM ('TASK', 'ROUTINE', 'HABIT', 'FOCUS', 'BREAK', 'CUSTOM');

-- CreateTable
CREATE TABLE "planner_days" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planner_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planner_blocks" (
    "id" TEXT NOT NULL,
    "plannerDayId" TEXT NOT NULL,
    "type" "PlannerBlockType" NOT NULL,
    "referenceId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "color" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planner_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "planner_days_userId_date_idx" ON "planner_days"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "planner_days_userId_date_key" ON "planner_days"("userId", "date");

-- CreateIndex
CREATE INDEX "planner_blocks_plannerDayId_order_idx" ON "planner_blocks"("plannerDayId", "order");

-- CreateIndex
CREATE INDEX "planner_blocks_plannerDayId_startTime_idx" ON "planner_blocks"("plannerDayId", "startTime");

-- AddForeignKey
ALTER TABLE "planner_days" ADD CONSTRAINT "planner_days_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planner_blocks" ADD CONSTRAINT "planner_blocks_plannerDayId_fkey" FOREIGN KEY ("plannerDayId") REFERENCES "planner_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;
