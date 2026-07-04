import { Component, input, output } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

/** Chip-based tag editor, reused by every entry form (Morning/Evening/Freeform) and by Search
 * Filters' own tag field — normalizes to lowercase and de-duplicates on add. */
@Component({
  selector: 'app-tags-input',
  imports: [MatChipsModule, MatFormFieldModule, MatIconModule, MatInputModule],
  templateUrl: './tags-input.html',
  styleUrl: './tags-input.scss',
})
export class TagsInput {
  readonly tags = input<string[]>([]);
  readonly disabled = input(false);
  readonly placeholder = input('Add a tag…');
  readonly tagsChange = output<string[]>();

  protected add(value: string, inputEl: HTMLInputElement): void {
    const trimmed = value.trim().toLowerCase();
    if (trimmed && !this.tags().includes(trimmed)) {
      this.tagsChange.emit([...this.tags(), trimmed]);
    }
    inputEl.value = '';
  }

  protected remove(tag: string): void {
    this.tagsChange.emit(this.tags().filter((t) => t !== tag));
  }
}
