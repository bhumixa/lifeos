import { Component, input } from '@angular/core';

export type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

/**
 * Domain-agnostic label+color chip. Deliberately knows nothing about "priority" or "status" —
 * callers (e.g. the tasks feature's priority/status label-color maps) decide what a given
 * variant means, so this stays reusable by any future feature needing the same visual pattern.
 */
@Component({
  selector: 'app-badge',
  templateUrl: './badge.html',
  styleUrl: './badge.scss',
})
export class Badge {
  readonly label = input.required<string>();
  readonly variant = input<BadgeVariant>('neutral');
}
