import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Notification Center's own header stat — "N unread" with an icon, distinct from
 * NotificationBadge's small numeric chip on the Bell (same underlying count, different context:
 * a page header readout vs. an icon-button overlay). */
@Component({
  selector: 'app-unread-counter',
  imports: [MatIconModule],
  templateUrl: './unread-counter.html',
  styleUrl: './unread-counter.scss',
})
export class UnreadCounter {
  readonly count = input.required<number>();
}
