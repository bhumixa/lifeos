import { Component, input } from '@angular/core';

/** Small numeric count chip for the Notification Bell — deliberately its own component rather
 * than reusing shared/components/badge/Badge (a label+color chip, not a count pill): this one
 * caps display at "9+" and renders nothing at all when count is 0, neither of which Badge's
 * generic label/variant shape is meant to express. */
@Component({
  selector: 'app-notification-badge',
  templateUrl: './notification-badge.html',
  styleUrl: './notification-badge.scss',
})
export class NotificationBadge {
  readonly count = input.required<number>();

  protected get display(): string {
    return this.count() > 9 ? '9+' : String(this.count());
  }
}
