import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateConversationDto {
  @ApiPropertyOptional({
    description: 'Defaults to "New Conversation" if omitted.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}
