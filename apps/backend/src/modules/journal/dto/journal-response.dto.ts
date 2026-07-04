import { ApiProperty } from '@nestjs/swagger';
import {
  Energy,
  JournalType,
  Mood,
} from '../../../../generated/prisma/index.js';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';

export class JournalAttachmentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() journalId!: string;
  @ApiProperty() fileName!: string;
  @ApiProperty() fileType!: string;
  @ApiProperty() fileSize!: number;
  @ApiProperty() url!: string;
  @ApiProperty() createdAt!: Date;
}

/** Swagger-only response shape — JournalService builds this itself (like GoalResponseDto/
 * HabitResponseDto) so the Prisma type's field order/nullability is documented explicitly rather
 * than left to reflection. */
export class JournalEntryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: '2026-07-04' }) date!: string;
  @ApiProperty({ enum: JournalType }) type!: JournalType;
  @ApiProperty({ nullable: true }) title!: string | null;
  @ApiProperty({ nullable: true }) content!: string | null;
  @ApiProperty({ enum: Mood, nullable: true }) mood!: Mood | null;
  @ApiProperty({ enum: Energy, nullable: true }) energy!: Energy | null;
  @ApiProperty({ nullable: true }) productivity!: number | null;
  @ApiProperty({ type: [String] }) gratitude!: string[];
  @ApiProperty({ type: [String] }) wins!: string[];
  @ApiProperty({ nullable: true }) lessons!: string | null;
  @ApiProperty({ nullable: true }) tomorrowPlan!: string | null;
  @ApiProperty({ type: [String] }) tags!: string[];
  @ApiProperty({ nullable: true }) weather!: string | null;
  @ApiProperty({ nullable: true }) location!: string | null;
  @ApiProperty({ nullable: true }) intention!: string | null;
  @ApiProperty({ type: [String] }) topPriorities!: string[];
  @ApiProperty({ nullable: true }) affirmation!: string | null;
  @ApiProperty({ nullable: true }) visualization!: string | null;
  @ApiProperty({ nullable: true }) expectedChallenges!: string | null;
  @ApiProperty({ nullable: true }) wentWell!: string | null;
  @ApiProperty({ nullable: true }) wentWrong!: string | null;
  @ApiProperty({ nullable: true }) plannerReflection!: string | null;
  @ApiProperty({ nullable: true }) habitReflection!: string | null;
  @ApiProperty({ nullable: true }) goalReflection!: string | null;
  @ApiProperty({ nullable: true }) goalId!: string | null;
  @ApiProperty({ nullable: true }) plannerDayId!: string | null;
  @ApiProperty({ type: [JournalAttachmentResponseDto] })
  attachments!: JournalAttachmentResponseDto[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class PaginatedJournalEntriesResponseDto {
  @ApiProperty({ type: [JournalEntryResponseDto] })
  data!: JournalEntryResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

/** GET /journal/:date's response — every entry for that calendar date (0-2 MORNING/EVENING plus
 * any number of FREEFORM), the same "whole day, not one row" shape PlannerDayResponseDto already
 * returns for GET /planner/:date. */
export class JournalDayResponseDto {
  @ApiProperty({ example: '2026-07-04' }) date!: string;
  @ApiProperty({ type: [JournalEntryResponseDto] })
  entries!: JournalEntryResponseDto[];
}

export class JournalPromptResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty({ enum: JournalType }) type!: JournalType;
  @ApiProperty() question!: string;
  @ApiProperty({ nullable: true }) placeholder!: string | null;
  @ApiProperty() order!: number;
  @ApiProperty() active!: boolean;
}
