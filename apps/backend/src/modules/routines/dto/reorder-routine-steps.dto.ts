import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class ReorderRoutineStepsDto {
  @ApiProperty({
    type: [String],
    description: "All of the routine's step IDs, in the desired display order.",
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  stepIds!: string[];
}
