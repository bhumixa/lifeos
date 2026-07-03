import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import type { UseFreezeDayDto } from './dto/use-freeze-day.dto.js';
import type { FreezeDayStatusResponseDto } from './dto/freeze-day-status-response.dto.js';
import {
  formatDateOnly,
  getZonedDateString,
  parseDateOnly,
} from '../planner/utils/timezone.util.js';

/** Placeholder monthly quota, same "documented placeholder limit, finalized by the product
 * owner later" precedent docs/03-assumptions.md (#4) already sets for Free-vs-Premium AI limits —
 * a small, Duolingo-style number of forgivable missed days per calendar month, per
 * docs/04-improvements.md (#2). */
export const FREEZE_DAYS_PER_MONTH = 2;

/**
 * Owns the "recovery streak" mechanic: spending one of a small monthly quota of freeze days to
 * protect a specific calendar date from breaking the Streak Engine's day-level consistency
 * calculations (see streak-calculator.util's `frozen` handling). Follows the same ownership
 * pattern as every other module — every query is scoped by `userId`. Resolves the user's own
 * timezone internally (same private-helper pattern PlannerService.getTimezone uses) rather than
 * taking it as a parameter, so callers (StreaksService, FreezeDaysController) never need to know
 * timezone resolution is even a step.
 *
 * The quota is anchored to the calendar month of the date *being frozen*, not the date the
 * request happens to be made on — freezing a backdated date spends that date's own month's quota,
 * which is the least surprising behavior if a user freezes a day slightly after the fact.
 */
@Injectable()
export class FreezeDaysService {
  constructor(private readonly prisma: PrismaService) {}

  async use(
    userId: string,
    dto: UseFreezeDayDto,
  ): Promise<FreezeDayStatusResponseDto> {
    const timezone = await this.getTimezone(userId);
    const todayStr = getZonedDateString(new Date(), timezone);
    const targetDateStr = dto.date ?? todayStr;

    if (targetDateStr > todayStr) {
      throw new BadRequestException('Cannot freeze a date in the future');
    }

    const targetDate = parseDateOnly(targetDateStr);
    const existing = await this.prisma.freezeDay.findUnique({
      where: { userId_date: { userId, date: targetDate } },
    });
    if (existing) {
      throw new ConflictException('This date has already been frozen');
    }

    const { usedThisMonth } = await this.getQuotaUsage(userId, targetDateStr);
    if (usedThisMonth >= FREEZE_DAYS_PER_MONTH) {
      throw new ConflictException(
        'No freeze days remaining for this date’s calendar month',
      );
    }

    await this.prisma.freezeDay.create({
      data: { userId, date: targetDate, consumed: true },
    });

    return this.getStatus(userId);
  }

  /** Powers GET /freeze-days/use's response, GET /streaks/today's
   * `freezesRemainingThisMonth`/`isFrozenToday`, and GET /streaks/statistics's `freezeDays`
   * block — all anchored on *today*, unlike `use()`'s quota check, which anchors on whatever date
   * is being frozen. */
  async getStatus(userId: string): Promise<FreezeDayStatusResponseDto> {
    const timezone = await this.getTimezone(userId);
    const todayStr = getZonedDateString(new Date(), timezone);
    const { usedThisMonth } = await this.getQuotaUsage(userId, todayStr);

    const todayFreeze = await this.prisma.freezeDay.findUnique({
      where: { userId_date: { userId, date: parseDateOnly(todayStr) } },
    });

    return {
      date: todayStr,
      usedThisMonth,
      remainingThisMonth: Math.max(0, FREEZE_DAYS_PER_MONTH - usedThisMonth),
      monthlyQuota: FREEZE_DAYS_PER_MONTH,
      isDateFrozen: Boolean(todayFreeze?.consumed),
    };
  }

  /** All consumed freeze dates on/after `sinceDateStr`, as a Set of "YYYY-MM-DD" strings —
   * feeds directly into streak-calculator.util's `buildDailySuccessHistory`. */
  async getFrozenDates(
    userId: string,
    sinceDateStr: string,
  ): Promise<Set<string>> {
    const rows = await this.prisma.freezeDay.findMany({
      where: {
        userId,
        consumed: true,
        date: { gte: parseDateOnly(sinceDateStr) },
      },
      select: { date: true },
    });
    return new Set(rows.map((row) => formatDateOnly(row.date)));
  }

  private async getQuotaUsage(
    userId: string,
    dateStr: string,
  ): Promise<{ usedThisMonth: number }> {
    const [year, month] = dateStr.split('-').map(Number);
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 1));

    const usedThisMonth = await this.prisma.freezeDay.count({
      where: {
        userId,
        consumed: true,
        date: { gte: monthStart, lt: monthEnd },
      },
    });
    return { usedThisMonth };
  }

  /** Same fallback-to-UTC rationale as PlannerService.getTimezone: only unreachable if the JWT
   * outlives the user row it was issued for. */
  private async getTimezone(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    return user?.timezone ?? 'UTC';
  }
}
