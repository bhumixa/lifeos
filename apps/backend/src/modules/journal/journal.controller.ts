import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';
import { ParseDateParamPipe } from '../planner/utils/parse-date-param.pipe.js';
import { CreateJournalAttachmentDto } from './dto/create-journal-attachment.dto.js';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto.js';
import { JournalHistoryQueryDto } from './dto/journal-history-query.dto.js';
import { JournalPromptQueryDto } from './dto/journal-prompt-query.dto.js';
import {
  JournalAttachmentResponseDto,
  JournalDayResponseDto,
  JournalEntryResponseDto,
  JournalPromptResponseDto,
  PaginatedJournalEntriesResponseDto,
} from './dto/journal-response.dto.js';
import { ListJournalQueryDto } from './dto/list-journal-query.dto.js';
import { SearchJournalQueryDto } from './dto/search-journal-query.dto.js';
import { UpdateJournalEntryDto } from './dto/update-journal-entry.dto.js';
import { JournalService } from './journal.service.js';

@ApiTags('journal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('journal')
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @Get()
  @ApiOkResponse({ type: PaginatedJournalEntriesResponseDto })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListJournalQueryDto,
  ): Promise<PaginatedResult<JournalEntryResponseDto>> {
    return this.journalService.findAll(user.id, query);
  }

  // 'history'/'search'/'prompts' are literal segments and must be declared before ':date' — same
  // route-ordering rule as habits.controller.ts's 'today'/'summary'/'history' vs ':id', and
  // planner.controller.ts's 'today' vs ':date'.
  @Get('history')
  @ApiOkResponse({ type: PaginatedJournalEntriesResponseDto })
  history(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: JournalHistoryQueryDto,
  ): Promise<PaginatedResult<JournalEntryResponseDto>> {
    return this.journalService.history(user.id, query);
  }

  @Get('search')
  @ApiOkResponse({ type: PaginatedJournalEntriesResponseDto })
  search(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SearchJournalQueryDto,
  ): Promise<PaginatedResult<JournalEntryResponseDto>> {
    return this.journalService.search(user.id, query);
  }

  @Get('prompts')
  @ApiOkResponse({ type: [JournalPromptResponseDto] })
  getPrompts(
    @Query() query: JournalPromptQueryDto,
  ): Promise<JournalPromptResponseDto[]> {
    return this.journalService.getPrompts(query.type);
  }

  @Get(':date')
  @ApiOkResponse({ type: JournalDayResponseDto })
  getByDate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('date', ParseDateParamPipe) date: string,
  ): Promise<JournalDayResponseDto> {
    return this.journalService.getByDate(user.id, date);
  }

  @Post()
  @ApiCreatedResponse({ type: JournalEntryResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateJournalEntryDto,
  ): Promise<JournalEntryResponseDto> {
    return this.journalService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: JournalEntryResponseDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJournalEntryDto,
  ): Promise<JournalEntryResponseDto> {
    return this.journalService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Journal entry soft-deleted.' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.journalService.remove(user.id, id);
  }

  @Post('attachments')
  @ApiCreatedResponse({ type: JournalAttachmentResponseDto })
  addAttachment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateJournalAttachmentDto,
  ): Promise<JournalAttachmentResponseDto> {
    return this.journalService.addAttachment(user.id, dto);
  }

  @Delete('attachments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Journal attachment deleted.' })
  removeAttachment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.journalService.removeAttachment(user.id, id);
  }
}
