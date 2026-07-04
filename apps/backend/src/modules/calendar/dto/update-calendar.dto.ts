import { PartialType } from '@nestjs/swagger';
import { CreateCalendarDto } from './create-calendar.dto.js';

// `provider` is inherited from CreateCalendarDto and freely re-settable — switching a Calendar's
// provider after creation is still just a local column update today (see the class doc on
// Calendar); there's no live external connection to tear down or re-establish yet.
export class UpdateCalendarDto extends PartialType(CreateCalendarDto) {}
