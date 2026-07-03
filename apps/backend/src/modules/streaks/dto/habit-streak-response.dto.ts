import { ApiProperty } from '@nestjs/swagger';
import { HabitFrequency } from '../../../../generated/prisma/index.js';

export class HabitStreakResponseDto {
  @ApiProperty() habitId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() icon!: string;
  @ApiProperty() color!: string;
  @ApiProperty({ enum: HabitFrequency }) targetFrequency!: HabitFrequency;
  @ApiProperty() currentStreak!: number;
  @ApiProperty() longestStreak!: number;
  @ApiProperty({
    description:
      "Whether the habit's current period (day/week/month, per targetFrequency) has already met its targetCount.",
  })
  currentPeriodMet!: boolean;
}

export class StreaksOverviewResponseDto {
  @ApiProperty({
    description:
      'False when the user has no active DAILY-frequency habits — overall streak fields are meaningless (reported as 0) in that case.',
  })
  hasDailyHabits!: boolean;
  @ApiProperty({
    description:
      'Overall consistency streak across all active DAILY habits combined.',
  })
  currentStreak!: number;
  @ApiProperty() longestStreak!: number;
  @ApiProperty({ type: [HabitStreakResponseDto] })
  habits!: HabitStreakResponseDto[];
}
