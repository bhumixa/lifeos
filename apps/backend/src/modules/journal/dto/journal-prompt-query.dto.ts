import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { JournalType } from '../../../../generated/prisma/index.js';

export class JournalPromptQueryDto {
  @ApiPropertyOptional({
    enum: JournalType,
    description:
      'Restrict to prompts for one journal type. Omit for the full catalog.',
  })
  @IsOptional()
  @IsEnum(JournalType)
  type?: JournalType;
}
