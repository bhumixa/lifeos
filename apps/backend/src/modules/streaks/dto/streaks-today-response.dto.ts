import { ApiProperty } from '@nestjs/swagger';

export class StreaksTodayResponseDto {
  @ApiProperty({
    example: '2026-07-03',
    description: "Today's date in the user's own timezone.",
  })
  date!: string;
  @ApiProperty() hasDailyHabits!: boolean;
  @ApiProperty() totalDailyHabits!: number;
  @ApiProperty() completedDailyHabits!: number;
  @ApiProperty({
    type: [String],
    description: 'Active daily habit IDs not yet completed today.',
  })
  remainingHabitIds!: string[];
  @ApiProperty() isTodaySuccessful!: boolean;
  @ApiProperty() isFrozenToday!: boolean;
  @ApiProperty() freezesRemainingThisMonth!: number;
}
