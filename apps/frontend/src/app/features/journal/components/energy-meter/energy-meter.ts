import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { Energy } from '@lifeos/shared-types';
import { ENERGY_LABELS, ENERGY_ORDER, energyLevel } from '../../utils/journal-display';

/** Five bolt icons, filled up to the selected Energy level — used by Morning/Evening entry forms
 * and, in read-only mode, by Journal Card/Detail. */
@Component({
  selector: 'app-energy-meter',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './energy-meter.html',
  styleUrl: './energy-meter.scss',
})
export class EnergyMeter {
  readonly value = input<Energy | null>(null);
  readonly disabled = input(false);
  readonly valueChange = output<Energy>();

  protected readonly levels = ENERGY_ORDER;
  protected readonly labels = ENERGY_LABELS;

  protected filled(level: Energy): boolean {
    const current = this.value();
    return current !== null && energyLevel(level) <= energyLevel(current);
  }

  protected select(level: Energy): void {
    if (!this.disabled()) {
      this.valueChange.emit(level);
    }
  }
}
