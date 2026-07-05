import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

/** GET /analytics/export's own list query — plain pagination, no extra filters, matching this
 * milestone's own literal endpoint list (no `?type=`/`?format=` filtering was asked for). */
export class ListAnalyticsExportsQueryDto extends PaginationQueryDto {}
