import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Generic "nothing here yet" panel — icon, title, message, and an optional projected action
 * (e.g. a "New Task" button) via <ng-content>. */
@Component({
  selector: 'app-empty-state',
  imports: [MatIconModule],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
})
export class EmptyState {
  readonly icon = input.required<string>();
  readonly title = input.required<string>();
  readonly message = input<string>('');
}
