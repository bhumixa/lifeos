import { ApiProperty } from '@nestjs/swagger';

export class RoutineStepResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() routineId!: string;
  @ApiProperty() title!: string;
  @ApiProperty() startTime!: string;
  @ApiProperty() durationMinutes!: number;
  @ApiProperty() order!: number;
  @ApiProperty({ nullable: true }) reminderMinutesBefore!: number | null;
  @ApiProperty() isRequired!: boolean;
}

/** Swagger-only response shape. TasksService's precedent (returning the Prisma type directly)
 * doesn't quite apply here — `totalDurationMinutes` is computed, not a Prisma column — so
 * RoutinesService actually builds this exact shape rather than returning a raw Prisma model. */
export class RoutineResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() icon!: string;
  @ApiProperty() color!: string;
  @ApiProperty({ nullable: true }) description!: string | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ nullable: true }) goalId!: string | null;
  @ApiProperty({ type: [RoutineStepResponseDto] })
  steps!: RoutineStepResponseDto[];
  @ApiProperty() totalDurationMinutes!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
