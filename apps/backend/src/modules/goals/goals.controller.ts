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
import { CreateGoalDto } from './dto/create-goal.dto.js';
import { CreateGoalMilestoneDto } from './dto/create-goal-milestone.dto.js';
import {
  GoalMilestoneResponseDto,
  GoalProgressResponseDto,
  GoalResponseDto,
  PaginatedGoalsResponseDto,
} from './dto/goal-response.dto.js';
import { ListGoalsQueryDto } from './dto/list-goals-query.dto.js';
import { UpdateGoalDto } from './dto/update-goal.dto.js';
import { UpdateGoalMilestoneDto } from './dto/update-goal-milestone.dto.js';
import { GoalsService } from './goals.service.js';

@ApiTags('goals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  @ApiOkResponse({ type: PaginatedGoalsResponseDto })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListGoalsQueryDto,
  ): Promise<PaginatedResult<GoalResponseDto>> {
    return this.goalsService.findAll(user.id, query);
  }

  @Post()
  @ApiCreatedResponse({ type: GoalResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateGoalDto,
  ): Promise<GoalResponseDto> {
    return this.goalsService.create(user.id, dto);
  }

  // 'milestones/:id' is declared before ':id' — both PATCH and DELETE have a literal 'milestones'
  // segment that would otherwise be swallowed by ':id' if that were matched first, the same
  // route-ordering rule habits.controller.ts documents for 'today'/'summary'/'history'.
  @Patch('milestones/:id')
  @ApiOkResponse({ type: GoalMilestoneResponseDto })
  updateMilestone(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGoalMilestoneDto,
  ): Promise<GoalMilestoneResponseDto> {
    return this.goalsService.updateMilestone(user.id, id, dto);
  }

  @Delete('milestones/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Milestone deleted.' })
  removeMilestone(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.goalsService.removeMilestone(user.id, id);
  }

  @Get(':id/progress')
  @ApiOkResponse({ type: GoalProgressResponseDto })
  getProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<GoalProgressResponseDto> {
    return this.goalsService.getProgress(user.id, id);
  }

  @Get(':id')
  @ApiOkResponse({ type: GoalResponseDto })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<GoalResponseDto> {
    return this.goalsService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: GoalResponseDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGoalDto,
  ): Promise<GoalResponseDto> {
    return this.goalsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Goal soft-deleted.' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.goalsService.remove(user.id, id);
  }

  @Post(':id/archive')
  @ApiOkResponse({ type: GoalResponseDto })
  archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<GoalResponseDto> {
    return this.goalsService.archive(user.id, id);
  }

  @Post(':id/unarchive')
  @ApiOkResponse({ type: GoalResponseDto })
  unarchive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<GoalResponseDto> {
    return this.goalsService.unarchive(user.id, id);
  }

  @Post(':id/milestones')
  @ApiCreatedResponse({ type: GoalMilestoneResponseDto })
  addMilestone(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateGoalMilestoneDto,
  ): Promise<GoalMilestoneResponseDto> {
    return this.goalsService.addMilestone(user.id, id, dto);
  }
}
