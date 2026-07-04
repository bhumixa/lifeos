import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

const HH_MM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class UpdateNotificationPreferenceDto {
  @ApiPropertyOptional({
    example: '22:00',
    nullable: true,
    description:
      'Local "HH:mm" — set both quietHoursStart and quietHoursEnd to null to disable.',
  })
  @IsOptional()
  @Matches(HH_MM_PATTERN, {
    message: 'quietHoursStart must be an "HH:mm" 24-hour time',
  })
  quietHoursStart?: string | null;

  @ApiPropertyOptional({ example: '07:00', nullable: true })
  @IsOptional()
  @Matches(HH_MM_PATTERN, {
    message: 'quietHoursEnd must be an "HH:mm" 24-hour time',
  })
  quietHoursEnd?: string | null;

  @ApiPropertyOptional({ example: 'America/New_York' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableTasks?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableHabits?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enablePlanner?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableGoals?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableJournal?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableCalendar?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableStreaks?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enableAchievements?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableEmail?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enablePush?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableInApp?: boolean;
}
