import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  Energy,
  JournalType,
  Mood,
} from '../../../../generated/prisma/index.js';

export class CreateJournalEntryDto {
  @ApiPropertyOptional({
    example: '2026-07-04',
    description:
      'Date this entry belongs to ("YYYY-MM-DD"), in the user\'s own timezone. Defaults to ' +
      "today (in the user's timezone) when omitted.",
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({
    enum: JournalType,
    description:
      'MORNING/EVENING are limited to one per calendar day (see JournalService); FREEFORM has ' +
      'no such limit.',
  })
  @IsEnum(JournalType)
  type!: JournalType;

  @ApiPropertyOptional({ example: 'A slow start' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    example: 'Additional freeform notes for this entry.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  content?: string;

  @ApiPropertyOptional({ enum: Mood })
  @IsOptional()
  @IsEnum(Mood)
  mood?: Mood;

  @ApiPropertyOptional({ enum: Energy })
  @IsOptional()
  @IsEnum(Energy)
  energy?: Energy;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 5,
    description: 'Self-rated productivity, 1 (low) to 5 (high).',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  productivity?: number;

  @ApiPropertyOptional({
    type: [String],
    example: ['My health', 'A good coffee'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  gratitude?: string[];

  @ApiPropertyOptional({ type: [String], example: ['Shipped the release'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  wins?: string[];

  @ApiPropertyOptional({
    example: 'Batching meetings works better than spreading them out.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  lessons?: string;

  @ApiPropertyOptional({
    example: 'Start with the hardest task before checking email.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  tomorrowPlan?: string;

  @ApiPropertyOptional({ type: [String], example: ['work', 'gratitude'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: 'Sunny' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  weather?: string;

  @ApiPropertyOptional({ example: 'Home office' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({
    example: 'Ship the Journal milestone with a calm, focused morning.',
    description: 'Morning-only. Left unset for EVENING/FREEFORM entries.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  intention?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['Finish the Journal backend', 'Review PRs', 'Go for a run'],
    description: 'Morning-only. Not DB-enforced to exactly three.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  topPriorities?: string[];

  @ApiPropertyOptional({
    example: 'I am capable of deep, focused work.',
    description: 'Morning-only.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  affirmation?: string;

  @ApiPropertyOptional({
    example: 'I picture myself closing my laptop at 6pm with a clean inbox.',
    description: 'Morning-only.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  visualization?: string;

  @ApiPropertyOptional({
    example: 'A packed calendar might crowd out deep work.',
    description: 'Morning-only.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  expectedChallenges?: string;

  @ApiPropertyOptional({
    example: 'Stayed focused through the morning block.',
    description: 'Evening-only.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  wentWell?: string;

  @ApiPropertyOptional({
    example: 'Got pulled into too many ad-hoc meetings.',
    description: 'Evening-only.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  wentWrong?: string;

  @ApiPropertyOptional({
    example: 'Followed the plan closely except for one unscheduled call.',
    description: 'Evening-only.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  plannerReflection?: string;

  @ApiPropertyOptional({
    example: 'Kept every daily habit going, missed the weekly one.',
    description: 'Evening-only.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  habitReflection?: string;

  @ApiPropertyOptional({
    example: 'Made real progress on the half-marathon goal today.',
    description: 'Evening-only.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  goalReflection?: string;

  @ApiPropertyOptional({
    description:
      'Milestone 9-style optional link to a Goal this entry reflects on (must belong to the ' +
      'same user).',
  })
  @IsOptional()
  @IsUUID('4')
  goalId?: string;

  @ApiPropertyOptional({
    description:
      'Optional link to the PlannerDay this entry reflects on (must belong to the same user).',
  })
  @IsOptional()
  @IsUUID('4')
  plannerDayId?: string;
}
