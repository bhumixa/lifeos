import { ApiProperty } from '@nestjs/swagger';
import { AiRole } from '../../../../generated/prisma/index.js';

export class AiMessageResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() conversationId!: string;
  @ApiProperty({ enum: AiRole }) role!: AiRole;
  @ApiProperty() content!: string;
  @ApiProperty() createdAt!: Date;
}

export class AiConversationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true }) title!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty({ type: [AiMessageResponseDto] })
  messages!: AiMessageResponseDto[];
}

/** GET /ai/conversations' list-item shape — omits `messages` (see AiConversationService.findAll)
 * so the list endpoint stays cheap regardless of how long any one conversation has grown. */
export class AiConversationSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true }) title!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty() messageCount!: number;
}

/** POST /ai/chat's response — both messages this one call created. */
export class ChatResponseDto {
  @ApiProperty() conversationId!: string;
  @ApiProperty({ type: AiMessageResponseDto })
  userMessage!: AiMessageResponseDto;
  @ApiProperty({ type: AiMessageResponseDto })
  assistantMessage!: AiMessageResponseDto;
}
