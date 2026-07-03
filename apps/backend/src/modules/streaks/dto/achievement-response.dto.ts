import { ApiProperty } from '@nestjs/swagger';

export class AchievementResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty() icon!: string;
  @ApiProperty() xpReward!: number;
  @ApiProperty() unlocked!: boolean;
  @ApiProperty({ nullable: true, type: Date })
  unlockedAt!: Date | null;
}
