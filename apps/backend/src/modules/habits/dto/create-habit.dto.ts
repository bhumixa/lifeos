import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { HabitFrequency } from '../../../../generated/prisma/index.js';

// Same "HH:mm", 24-hour convention as RoutineStep.startTime (see modules/routines).
export const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class CreateHabitDto {
  @ApiProperty({ example: 'Drink water' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'Aim for 8 glasses a day.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: 'local_drink', description: 'Material icon name.' })
  @IsString()
  @MaxLength(50)
  icon!: string;

  @ApiProperty({ example: '#03A9F4' })
  @IsString()
  @MaxLength(20)
  color!: string;

  @ApiPropertyOptional({ enum: HabitFrequency, default: HabitFrequency.DAILY })
  @IsOptional()
  @IsEnum(HabitFrequency)
  targetFrequency?: HabitFrequency;

  @ApiPropertyOptional({
    example: 8,
    default: 1,
    minimum: 1,
    maximum: 1000,
    description: 'How many times per period (day/week/month) counts as met.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  targetCount?: number;

  @ApiPropertyOptional({ example: 'Health' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiPropertyOptional({
    example: '08:00',
    description: '"HH:mm", 24-hour, local time.',
  })
  @IsOptional()
  @Matches(TIME_OF_DAY_PATTERN, {
    message: 'reminderTime must be in "HH:mm" 24-hour format',
  })
  reminderTime?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description:
      'Milestone 9: optional Goal this habit contributes to (must belong to the same user).',
  })
  @IsOptional()
  @IsUUID('4')
  goalId?: string;
}
