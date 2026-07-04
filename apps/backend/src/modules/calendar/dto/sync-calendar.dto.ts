import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SyncCalendarDto {
  @ApiProperty({
    description: 'The Calendar to sync — must belong to the requesting user.',
  })
  @IsUUID('4')
  calendarId!: string;
}
