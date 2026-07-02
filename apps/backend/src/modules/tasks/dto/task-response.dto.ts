import { ApiProperty } from '@nestjs/swagger';
import {
  TaskPriority,
  TaskStatus,
} from '../../../../generated/prisma/index.js';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';

/** Swagger-only response shape — TasksService returns the Prisma Task shape directly, which is
 * structurally compatible (no fields are hidden, unlike User/passwordHash). */
export class TaskResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ nullable: true }) description!: string | null;
  @ApiProperty({ enum: TaskPriority }) priority!: TaskPriority;
  @ApiProperty({ enum: TaskStatus }) status!: TaskStatus;
  @ApiProperty({ nullable: true }) dueDate!: Date | null;
  @ApiProperty({ nullable: true }) estimatedMinutes!: number | null;
  @ApiProperty({ nullable: true }) completedAt!: Date | null;
  @ApiProperty({ type: [String] }) tags!: string[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class PaginatedTasksResponseDto {
  @ApiProperty({ type: [TaskResponseDto] })
  data!: TaskResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
