import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

/** A curated list rather than the full IANA database (~600 zones) — enough coverage for a
 * Calendar's own timezone (see the class doc on Calendar in prisma/schema.prisma) without an
 * unusably long dropdown. `Intl.supportedValuesOf` would give the full list, but this codebase
 * has no existing timezone-picker precedent to extend, and a curated list keeps the UI usable. */
const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Africa/Cairo',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland',
];

/** IANA timezone dropdown — used by CalendarSettingsPage's create/edit form for a Calendar's own
 * `timezone` field (independent of the requesting User.timezone). */
@Component({
  selector: 'app-timezone-selector',
  imports: [FormsModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './timezone-selector.html',
  styleUrl: './timezone-selector.scss',
})
export class TimezoneSelector {
  readonly value = input<string>('UTC');
  readonly label = input('Timezone');
  readonly valueChange = output<string>();

  protected readonly timezones = COMMON_TIMEZONES;

  protected onChange(timezone: string): void {
    this.valueChange.emit(timezone);
  }
}
