import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/** POST /ai/chat — omitting `conversationId` starts a new conversation (auto-titled from
 * `message`); passing one appends to an existing conversation the requesting user owns. */
export class ChatRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message!: string;
}
