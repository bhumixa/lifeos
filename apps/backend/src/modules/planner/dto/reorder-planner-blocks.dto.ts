import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsUUID,
  Matches,
} from 'class-validator';
import { DATE_ONLY_PATTERN } from './create-planner-block.dto.js';

export class ReorderPlannerBlocksDto {
  @ApiProperty({ example: '2026-07-03' })
  @Matches(DATE_ONLY_PATTERN, {
    message: 'date must be in "YYYY-MM-DD" format',
  })
  date!: string;

  @ApiProperty({
    type: [String],
    description: "All of that date's block IDs, in the desired display order.",
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  blockIds!: string[];
}
