import { ApiProperty } from '@nestjs/swagger';
import { PlannerBlockType } from '../../../../generated/prisma/index.js';

export class PlannerBlockResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() plannerDayId!: string;
  @ApiProperty({ enum: PlannerBlockType }) type!: PlannerBlockType;
  @ApiProperty({ nullable: true }) referenceId!: string | null;
  @ApiProperty() title!: string;
  @ApiProperty({ nullable: true }) description!: string | null;
  @ApiProperty() startTime!: Date;
  @ApiProperty() endTime!: Date;
  @ApiProperty() duration!: number;
  @ApiProperty({ nullable: true }) color!: string | null;
  @ApiProperty() completed!: boolean;
  @ApiProperty() order!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class PlannerDayResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: '2026-07-03' }) date!: string;
  @ApiProperty({ nullable: true }) notes!: string | null;
  @ApiProperty({ type: [PlannerBlockResponseDto] })
  blocks!: PlannerBlockResponseDto[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class GeneratePlannerResponseDto extends PlannerDayResponseDto {
  @ApiProperty({
    type: [String],
    description:
      "Due-today task IDs that didn't fit anywhere in the day window.",
  })
  unscheduledTaskIds!: string[];

  @ApiProperty({
    type: [String],
    description:
      "Active, not-yet-completed-today habit IDs that didn't fit anywhere.",
  })
  unscheduledHabitIds!: string[];
}
