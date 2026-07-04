import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import type { DashboardScheduleItem } from '../../services/dashboard-calendar.service';

/** The Dashboard's "Today's Schedule" widget — PlannerBlocks and CalendarEvents merged into one
 * chronological list (see DashboardCalendarService.load), the same compact-card shape
 * PlannerTimelineCard already establishes for Today's Timeline. */
@Component({
  selector: 'app-calendar-schedule-card',
  imports: [DatePipe, RouterLink, MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './calendar-schedule-card.html',
  styleUrl: './calendar-schedule-card.scss',
})
export class CalendarScheduleCard {
  readonly items = input<DashboardScheduleItem[]>([]);
  readonly loading = input(false);
}
