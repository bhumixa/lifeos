import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import type { Routine, RoutineStep } from '../../../generated/prisma/index.js';
import type { CreateRoutineDto } from './dto/create-routine.dto.js';
import type { CreateRoutineStepDto } from './dto/create-routine-step.dto.js';
import type { ReorderRoutineStepsDto } from './dto/reorder-routine-steps.dto.js';
import type { RoutineResponseDto } from './dto/routine-response.dto.js';
import type { UpdateRoutineDto } from './dto/update-routine.dto.js';
import type { UpdateRoutineStepDto } from './dto/update-routine-step.dto.js';

type RoutineWithSteps = Routine & { steps: RoutineStep[] };

/**
 * Ownership follows the same pattern as TasksService: every lookup is scoped by `userId`, and a
 * routine (or step) that exists but belongs to someone else is a 404, not a 403. Step operations
 * additionally verify the step belongs to the routineId in the URL, not just to the user — so a
 * step ID from a different one of the user's own routines can't be edited through the wrong
 * routine's endpoint.
 */
@Injectable()
export class RoutinesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: string,
    isActive?: boolean,
  ): Promise<RoutineResponseDto[]> {
    const routines = await this.prisma.routine.findMany({
      where: { userId, ...(isActive !== undefined && { isActive }) },
      include: { steps: true },
      orderBy: { createdAt: 'asc' },
    });
    return routines.map((routine) => this.toResponse(routine));
  }

  async findOne(userId: string, id: string): Promise<RoutineResponseDto> {
    const routine = await this.findRoutineOrThrow(userId, id);
    return this.toResponse(routine);
  }

  async create(
    userId: string,
    dto: CreateRoutineDto,
  ): Promise<RoutineResponseDto> {
    const routine = await this.prisma.routine.create({
      data: {
        userId,
        name: dto.name,
        icon: dto.icon,
        color: dto.color,
        description: dto.description,
        isActive: dto.isActive ?? true,
        steps: dto.steps
          ? {
              create: dto.steps.map((step, index) =>
                this.toStepData(step, index),
              ),
            }
          : undefined,
      },
      include: { steps: true },
    });
    return this.toResponse(routine);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateRoutineDto,
  ): Promise<RoutineResponseDto> {
    await this.findRoutineOrThrow(userId, id);
    const routine = await this.prisma.routine.update({
      where: { id },
      data: dto,
      include: { steps: true },
    });
    return this.toResponse(routine);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findRoutineOrThrow(userId, id);
    // Hard delete (unlike Task): a routine is structural configuration, not the kind of
    // irreplaceable content docs/06-database-design.md's soft-delete principle is protecting.
    // RoutineStep rows cascade via the schema's onDelete: Cascade.
    await this.prisma.routine.delete({ where: { id } });
  }

  async activate(userId: string, id: string): Promise<RoutineResponseDto> {
    await this.findRoutineOrThrow(userId, id);
    const routine = await this.prisma.routine.update({
      where: { id },
      data: { isActive: true },
      include: { steps: true },
    });
    return this.toResponse(routine);
  }

  async deactivate(userId: string, id: string): Promise<RoutineResponseDto> {
    await this.findRoutineOrThrow(userId, id);
    const routine = await this.prisma.routine.update({
      where: { id },
      data: { isActive: false },
      include: { steps: true },
    });
    return this.toResponse(routine);
  }

  async duplicate(userId: string, id: string): Promise<RoutineResponseDto> {
    const source = await this.findRoutineOrThrow(userId, id);

    const copy = await this.prisma.routine.create({
      data: {
        userId,
        name: `${source.name} (Copy)`,
        icon: source.icon,
        color: source.color,
        description: source.description,
        isActive: source.isActive,
        steps: {
          create: source.steps
            .sort((a, b) => a.order - b.order)
            .map((step) => ({
              title: step.title,
              startTime: step.startTime,
              durationMinutes: step.durationMinutes,
              order: step.order,
              reminderMinutesBefore: step.reminderMinutesBefore,
              isRequired: step.isRequired,
            })),
        },
      },
      include: { steps: true },
    });
    return this.toResponse(copy);
  }

  async addStep(
    userId: string,
    routineId: string,
    dto: CreateRoutineStepDto,
  ): Promise<RoutineResponseDto> {
    const parent = await this.findRoutineOrThrow(userId, routineId);
    const nextOrder =
      parent.steps.reduce((max, step) => Math.max(max, step.order), -1) + 1;

    await this.prisma.routineStep.create({
      data: { routineId, ...this.toStepData(dto, nextOrder) },
    });
    return this.findOne(userId, routineId);
  }

  async updateStep(
    userId: string,
    routineId: string,
    stepId: string,
    dto: UpdateRoutineStepDto,
  ): Promise<RoutineResponseDto> {
    await this.findStepOrThrow(userId, routineId, stepId);
    await this.prisma.routineStep.update({ where: { id: stepId }, data: dto });
    return this.findOne(userId, routineId);
  }

  async removeStep(
    userId: string,
    routineId: string,
    stepId: string,
  ): Promise<RoutineResponseDto> {
    await this.findStepOrThrow(userId, routineId, stepId);
    await this.prisma.routineStep.delete({ where: { id: stepId } });
    return this.findOne(userId, routineId);
  }

  async reorderSteps(
    userId: string,
    routineId: string,
    dto: ReorderRoutineStepsDto,
  ): Promise<RoutineResponseDto> {
    const parent = await this.findRoutineOrThrow(userId, routineId);
    const existingIds = new Set(parent.steps.map((step) => step.id));

    if (
      dto.stepIds.length !== existingIds.size ||
      !dto.stepIds.every((stepId) => existingIds.has(stepId))
    ) {
      throw new NotFoundException(
        'stepIds must be exactly the routine’s current step IDs',
      );
    }

    await this.prisma.$transaction(
      dto.stepIds.map((stepId, index) =>
        this.prisma.routineStep.update({
          where: { id: stepId },
          data: { order: index },
        }),
      ),
    );

    return this.findOne(userId, routineId);
  }

  private async findRoutineOrThrow(
    userId: string,
    id: string,
  ): Promise<RoutineWithSteps> {
    const routine = await this.prisma.routine.findFirst({
      where: { id, userId },
      include: { steps: true },
    });
    if (!routine) {
      throw new NotFoundException('Routine not found');
    }
    return routine;
  }

  private async findStepOrThrow(
    userId: string,
    routineId: string,
    stepId: string,
  ): Promise<RoutineStep> {
    await this.findRoutineOrThrow(userId, routineId);
    const step = await this.prisma.routineStep.findFirst({
      where: { id: stepId, routineId },
    });
    if (!step) {
      throw new NotFoundException('Routine step not found');
    }
    return step;
  }

  private toStepData(dto: CreateRoutineStepDto, order: number) {
    return {
      title: dto.title,
      startTime: dto.startTime,
      durationMinutes: dto.durationMinutes,
      order,
      reminderMinutesBefore: dto.reminderMinutesBefore,
      isRequired: dto.isRequired ?? true,
    };
  }

  private toResponse(routine: RoutineWithSteps): RoutineResponseDto {
    const steps = [...routine.steps].sort((a, b) => a.order - b.order);
    return {
      id: routine.id,
      name: routine.name,
      icon: routine.icon,
      color: routine.color,
      description: routine.description,
      isActive: routine.isActive,
      steps,
      totalDurationMinutes: steps.reduce(
        (total, step) => total + step.durationMinutes,
        0,
      ),
      createdAt: routine.createdAt,
      updatedAt: routine.updatedAt,
    };
  }
}
