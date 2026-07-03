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
import { CompletePlannerBlockDto } from './dto/complete-planner-block.dto.js';
import { CreatePlannerBlockDto } from './dto/create-planner-block.dto.js';
import { GeneratePlannerDto } from './dto/generate-planner.dto.js';
import {
  GeneratePlannerResponseDto,
  PlannerDayResponseDto,
} from './dto/planner-day-response.dto.js';
import { ReorderPlannerBlocksDto } from './dto/reorder-planner-blocks.dto.js';
import { UpdatePlannerBlockDto } from './dto/update-planner-block.dto.js';
import { PlannerService } from './planner.service.js';
import { ParseDateParamPipe } from './utils/parse-date-param.pipe.js';

@ApiTags('planner')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('planner')
export class PlannerController {
  constructor(private readonly plannerService: PlannerService) {}

  // 'today' is a literal segment and must be declared before ':date' — same route-ordering rule
  // as habits.controller.ts's 'today'/'summary'/'history' vs ':id'.
  @Get('today')
  @ApiOkResponse({ type: PlannerDayResponseDto })
  today(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PlannerDayResponseDto> {
    return this.plannerService.today(user.id);
  }

  @Get(':date')
  @ApiOkResponse({ type: PlannerDayResponseDto })
  getByDate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('date', ParseDateParamPipe) date: string,
  ): Promise<PlannerDayResponseDto> {
    return this.plannerService.getByDate(user.id, date);
  }

  @Post('block')
  @ApiCreatedResponse({
    type: PlannerDayResponseDto,
    description: 'Returns the whole day, with the new block included.',
  })
  createBlock(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePlannerBlockDto,
  ): Promise<PlannerDayResponseDto> {
    return this.plannerService.createBlock(user.id, dto);
  }

  @Patch('block/:id')
  @ApiOkResponse({ type: PlannerDayResponseDto })
  updateBlock(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlannerBlockDto,
  ): Promise<PlannerDayResponseDto> {
    return this.plannerService.updateBlock(user.id, id, dto);
  }

  @Delete('block/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Planner block deleted.' })
  removeBlock(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.plannerService.removeBlock(user.id, id);
  }

  @Post('generate')
  @ApiCreatedResponse({ type: GeneratePlannerResponseDto })
  generate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GeneratePlannerDto,
  ): Promise<GeneratePlannerResponseDto> {
    return this.plannerService.generate(user.id, dto);
  }

  @Post('reorder')
  @ApiOkResponse({ type: PlannerDayResponseDto })
  reorder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReorderPlannerBlocksDto,
  ): Promise<PlannerDayResponseDto> {
    return this.plannerService.reorder(user.id, dto);
  }

  @Post('complete')
  @ApiOkResponse({ type: PlannerDayResponseDto })
  complete(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CompletePlannerBlockDto,
  ): Promise<PlannerDayResponseDto> {
    return this.plannerService.complete(user.id, dto);
  }
}
