import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CompletePlannerBlockDto {
  @ApiProperty()
  @IsUUID('4')
  blockId!: string;

  @ApiPropertyOptional({
    default: true,
    description: 'Pass false to un-complete a block.',
  })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
