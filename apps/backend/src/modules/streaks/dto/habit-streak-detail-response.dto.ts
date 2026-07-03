import { ApiProperty } from '@nestjs/swagger';
import { HabitFrequency } from '../../../../generated/prisma/index.js';

export class HabitStreakPeriodDto {
  @ApiProperty({
    example: '2026-07-03',
    description: 'Start date of this period ("YYYY-MM-DD").',
  })
  periodStart!: string;
  @ApiProperty() completedCount!: number;
  @ApiProperty() met!: boolean;
}

export class HabitStreakDetailResponseDto {
  @ApiProperty() habitId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() icon!: string;
  @ApiProperty() color!: string;
  @ApiProperty({ enum: HabitFrequency }) targetFrequency!: HabitFrequency;
  @ApiProperty() targetCount!: number;
  @ApiProperty() currentStreak!: number;
  @ApiProperty() longestStreak!: number;
  @ApiProperty()
  currentPeriodCount!: number;
  @ApiProperty() currentPeriodMet!: boolean;
  @ApiProperty({
    type: [HabitStreakPeriodDto],
    description:
      'Most recent periods (days/weeks/months, per targetFrequency), oldest first.',
  })
  history!: HabitStreakPeriodDto[];
}
