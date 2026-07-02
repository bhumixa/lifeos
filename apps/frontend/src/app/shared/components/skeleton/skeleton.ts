import { Component, input } from '@angular/core';

/** Shimmering placeholder block for loading states — size via inputs, repeat with @for for lists. */
@Component({
  selector: 'app-skeleton',
  templateUrl: './skeleton.html',
  styleUrl: './skeleton.scss',
})
export class Skeleton {
  readonly width = input('100%');
  readonly height = input('1rem');
}
