import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
import { DATE_ONLY_PATTERN } from '../dto/create-planner-block.dto.js';

/** Validates a `:date` path param is "YYYY-MM-DD" — the path-param equivalent of `ParseUUIDPipe`
 * used elsewhere for `:id`, so GET /planner/:date rejects malformed dates before hitting Prisma. */
@Injectable()
export class ParseDateParamPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!DATE_ONLY_PATTERN.test(value)) {
      throw new BadRequestException('date must be in "YYYY-MM-DD" format');
    }
    return value;
  }
}
