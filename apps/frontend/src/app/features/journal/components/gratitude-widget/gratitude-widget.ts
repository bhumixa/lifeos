import { Component, input, output } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

/** A labeled chip list for a free-text array field (Gratitude, Today's Wins) — edit mode lets the
 * user add/remove entries one at a time; read-only mode (Journal Detail) just lists them. */
@Component({
  selector: 'app-gratitude-widget',
  imports: [MatChipsModule, MatFormFieldModule, MatIconModule, MatInputModule],
  templateUrl: './gratitude-widget.html',
  styleUrl: './gratitude-widget.scss',
})
export class GratitudeWidget {
  readonly items = input<string[]>([]);
  readonly readonly = input(false);
  readonly label = input('Gratitude');
  readonly placeholder = input('Add one…');
  readonly itemsChange = output<string[]>();

  protected add(value: string, inputEl: HTMLInputElement): void {
    const trimmed = value.trim();
    if (trimmed) {
      this.itemsChange.emit([...this.items(), trimmed]);
    }
    inputEl.value = '';
  }

  protected remove(index: number): void {
    this.itemsChange.emit(this.items().filter((_, i) => i !== index));
  }
}
