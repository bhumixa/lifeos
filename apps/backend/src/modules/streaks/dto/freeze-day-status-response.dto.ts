import { ApiProperty } from '@nestjs/swagger';

export class FreezeDayStatusResponseDto {
  @ApiProperty({ example: '2026-07-03' })
  date!: string;
  @ApiProperty() usedThisMonth!: number;
  @ApiProperty() remainingThisMonth!: number;
  @ApiProperty() monthlyQuota!: number;
  @ApiProperty() isDateFrozen!: boolean;
}
