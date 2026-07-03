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
import { CreateRoutineDto } from './dto/create-routine.dto.js';
import { CreateRoutineStepDto } from './dto/create-routine-step.dto.js';
import { ListRoutinesQueryDto } from './dto/list-routines-query.dto.js';
import { ReorderRoutineStepsDto } from './dto/reorder-routine-steps.dto.js';
import { RoutineResponseDto } from './dto/routine-response.dto.js';
import { UpdateRoutineDto } from './dto/update-routine.dto.js';
import { UpdateRoutineStepDto } from './dto/update-routine-step.dto.js';
import { RoutinesService } from './routines.service.js';

@ApiTags('routines')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('routines')
export class RoutinesController {
  constructor(private readonly routinesService: RoutinesService) {}

  @Get()
  @ApiOkResponse({ type: [RoutineResponseDto] })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListRoutinesQueryDto,
  ): Promise<RoutineResponseDto[]> {
    return this.routinesService.findAll(user.id, query.isActive);
  }

  @Get(':id')
  @ApiOkResponse({ type: RoutineResponseDto })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RoutineResponseDto> {
    return this.routinesService.findOne(user.id, id);
  }

  @Post()
  @ApiCreatedResponse({ type: RoutineResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRoutineDto,
  ): Promise<RoutineResponseDto> {
    return this.routinesService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: RoutineResponseDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoutineDto,
  ): Promise<RoutineResponseDto> {
    return this.routinesService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.routinesService.remove(user.id, id);
  }

  @Patch(':id/activate')
  @ApiOkResponse({ type: RoutineResponseDto })
  activate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RoutineResponseDto> {
    return this.routinesService.activate(user.id, id);
  }

  @Patch(':id/deactivate')
  @ApiOkResponse({ type: RoutineResponseDto })
  deactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RoutineResponseDto> {
    return this.routinesService.deactivate(user.id, id);
  }

  @Post(':id/duplicate')
  @ApiCreatedResponse({ type: RoutineResponseDto })
  duplicate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RoutineResponseDto> {
    return this.routinesService.duplicate(user.id, id);
  }

  @Post(':id/steps')
  @ApiCreatedResponse({
    type: RoutineResponseDto,
    description: 'Returns the whole routine, with the new step appended.',
  })
  addStep(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) routineId: string,
    @Body() dto: CreateRoutineStepDto,
  ): Promise<RoutineResponseDto> {
    return this.routinesService.addStep(user.id, routineId, dto);
  }

  @Patch(':id/steps/reorder')
  @ApiOkResponse({ type: RoutineResponseDto })
  reorderSteps(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) routineId: string,
    @Body() dto: ReorderRoutineStepsDto,
  ): Promise<RoutineResponseDto> {
    return this.routinesService.reorderSteps(user.id, routineId, dto);
  }

  @Patch(':id/steps/:stepId')
  @ApiOkResponse({ type: RoutineResponseDto })
  updateStep(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) routineId: string,
    @Param('stepId', ParseUUIDPipe) stepId: string,
    @Body() dto: UpdateRoutineStepDto,
  ): Promise<RoutineResponseDto> {
    return this.routinesService.updateStep(user.id, routineId, stepId, dto);
  }

  @Delete(':id/steps/:stepId')
  @ApiOkResponse({
    type: RoutineResponseDto,
    description: 'Returns the routine with the step removed.',
  })
  removeStep(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) routineId: string,
    @Param('stepId', ParseUUIDPipe) stepId: string,
  ): Promise<RoutineResponseDto> {
    return this.routinesService.removeStep(user.id, routineId, stepId);
  }
}
