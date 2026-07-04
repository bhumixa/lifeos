import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsPositive,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
} from 'class-validator';

/** Registers metadata for a file the client already hosted elsewhere — see the schema comment on
 * JournalAttachment for why this isn't a multipart upload endpoint. */
export class CreateJournalAttachmentDto {
  @ApiProperty({
    description:
      'The JournalEntry this attachment belongs to (same user only).',
  })
  @IsUUID('4')
  journalId!: string;

  @ApiProperty({ example: 'sunrise-run.jpg' })
  @IsString()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @MaxLength(100)
  fileType!: string;

  @ApiProperty({ example: 482_133, description: 'Bytes.' })
  @IsInt()
  @IsPositive()
  fileSize!: number;

  @ApiProperty({ example: 'https://cdn.example.com/uploads/sunrise-run.jpg' })
  @IsUrl()
  @MaxLength(2000)
  url!: string;
}
