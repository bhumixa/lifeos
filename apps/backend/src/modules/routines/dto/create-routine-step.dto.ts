import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class CreateRoutineStepDto {
  @ApiProperty({ example: 'Drink a glass of water' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiProperty({
    example: '07:00',
    description: '24-hour "HH:mm" local time-of-day.',
  })
  @IsString()
  @Matches(TIME_OF_DAY_PATTERN, {
    message: 'startTime must be in 24-hour HH:mm format',
  })
  startTime!: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 480 })
  @IsInt()
  @Min(1)
  @Max(480)
  durationMinutes!: number;

  @ApiPropertyOptional({ example: 5, minimum: 0, maximum: 1440 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  reminderMinutesBefore?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}
