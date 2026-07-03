import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateGoalMilestoneDto } from './create-goal-milestone.dto.js';

export class UpdateGoalMilestoneDto extends PartialType(
  CreateGoalMilestoneDto,
) {
  @ApiPropertyOptional({
    description:
      'Toggles completion; GoalsService stamps/clears completedAt to match.',
  })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
