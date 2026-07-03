import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreateRoutineStepDto } from './create-routine-step.dto.js';

export class CreateRoutineDto {
  @ApiProperty({ example: 'Morning Routine' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'wb_sunny', description: 'Material icon name.' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  icon!: string;

  @ApiProperty({
    example: '#FF9800',
    description: 'Hex color or design-token name.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  color!: string;

  @ApiPropertyOptional({
    example: 'Wake up, hydrate, and get moving before work.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: [CreateRoutineStepDto],
    description:
      'Optional initial steps, in display order — saves the routine and its steps in one request.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateRoutineStepDto)
  steps?: CreateRoutineStepDto[];

  @ApiPropertyOptional({
    description:
      'Milestone 9: optional Goal this routine contributes to (must belong to the same user).',
  })
  @IsOptional()
  @IsUUID('4')
  goalId?: string;
}
