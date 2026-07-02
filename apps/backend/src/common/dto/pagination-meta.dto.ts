import { ApiProperty } from '@nestjs/swagger';

/** Shared response shape for any paginated list endpoint (see docs/07-folder-structure.md's
 * `common/dto/ # base pagination/response DTOs`). */
export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}
