import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class ListRoutinesQueryDto {
  @ApiPropertyOptional({
    description: 'Filter to only active (or only inactive) routines.',
  })
  @IsOptional()
  // Query strings arrive as "true"/"false" — Boolean("false") is true, so this needs an explicit
  // string comparison rather than the implicit `Type(() => Boolean)` coercion.
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  isActive?: boolean;
}
