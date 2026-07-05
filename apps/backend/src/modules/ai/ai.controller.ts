import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';
import { AiConversationService } from './ai-conversation.service.js';
import { AiInsightsService } from './ai-insights.service.js';
import {
  AiConversationResponseDto,
  AiConversationSummaryDto,
  ChatResponseDto,
} from './dto/ai-conversation-response.dto.js';
import {
  AiInsightResponseDto,
  PaginatedAiInsightsResponseDto,
} from './dto/ai-insight-response.dto.js';
import { ChatRequestDto } from './dto/chat-request.dto.js';
import { CreateConversationDto } from './dto/create-conversation.dto.js';
import { GenerateInsightDto } from './dto/generate-insight.dto.js';
import { ListInsightsQueryDto } from './dto/list-insights-query.dto.js';

/**
 * Every endpoint here is either a read or an insight/message *the user explicitly asked for*
 * (`generate`, `chat`) — there is no endpoint that lets the AI Coach write to, or take an action
 * on, any other module's data, per this milestone's "AI Coach never modifies data" business rule.
 * 'insights/generate' and 'conversations' are literal segments declared before their own `:id`
 * routes, the same route-ordering convention every prior controller with a mixed literal/param
 * route set already follows (habits.controller.ts's `today`/`summary`/`history`, etc.).
 */
@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly insightsService: AiInsightsService,
    private readonly conversationService: AiConversationService,
  ) {}

  @Get('insights')
  @ApiOkResponse({ type: PaginatedAiInsightsResponseDto })
  findInsights(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListInsightsQueryDto,
  ): Promise<PaginatedResult<AiInsightResponseDto>> {
    return this.insightsService.findAll(user.id, query);
  }

  @Get('insights/:id')
  @ApiOkResponse({ type: AiInsightResponseDto })
  findInsight(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AiInsightResponseDto> {
    return this.insightsService.findOne(user.id, id);
  }

  @Post('insights/generate')
  @ApiCreatedResponse({ type: [AiInsightResponseDto] })
  generateInsights(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateInsightDto,
  ): Promise<AiInsightResponseDto[]> {
    return this.insightsService.generate(user.id, dto);
  }

  @Post('chat')
  @ApiCreatedResponse({ type: ChatResponseDto })
  chat(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    return this.conversationService.chat(user.id, dto);
  }

  @Get('conversations')
  @ApiOkResponse({ type: [AiConversationSummaryDto] })
  findConversations(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AiConversationSummaryDto[]> {
    return this.conversationService.findAll(user.id);
  }

  @Get('conversations/:id')
  @ApiOkResponse({ type: AiConversationResponseDto })
  findConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AiConversationResponseDto> {
    return this.conversationService.findOne(user.id, id);
  }

  @Post('conversations')
  @ApiCreatedResponse({ type: AiConversationResponseDto })
  createConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateConversationDto,
  ): Promise<AiConversationResponseDto> {
    return this.conversationService.create(user.id, dto);
  }
}
