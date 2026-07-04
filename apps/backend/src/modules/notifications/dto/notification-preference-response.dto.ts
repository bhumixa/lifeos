import { ApiProperty } from '@nestjs/swagger';

export class NotificationPreferenceResponseDto {
  @ApiProperty({ nullable: true }) quietHoursStart!: string | null;
  @ApiProperty({ nullable: true }) quietHoursEnd!: string | null;
  @ApiProperty() timezone!: string;
  @ApiProperty() enableTasks!: boolean;
  @ApiProperty() enableHabits!: boolean;
  @ApiProperty() enablePlanner!: boolean;
  @ApiProperty() enableGoals!: boolean;
  @ApiProperty() enableJournal!: boolean;
  @ApiProperty() enableCalendar!: boolean;
  @ApiProperty() enableStreaks!: boolean;
  @ApiProperty() enableAchievements!: boolean;
  @ApiProperty() enableEmail!: boolean;
  @ApiProperty() enablePush!: boolean;
  @ApiProperty() enableInApp!: boolean;
}
