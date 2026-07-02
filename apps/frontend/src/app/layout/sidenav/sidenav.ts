import { Component, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LayoutService } from '../../core/layout/layout.service';
import { NAV_ITEMS } from './nav-items';

/**
 * Pure nav-item list. Collapse state (icon-only vs. icon+label) comes from LayoutService so the
 * same component works unmodified inside either the desktop `mat-sidenav` (mode="side") or the
 * mobile drawer (mode="over") — Shell decides which one to render, see layout/shell/shell.ts.
 */
@Component({
  selector: 'app-sidenav',
  imports: [RouterLink, RouterLinkActive, MatIconModule, MatListModule, MatTooltipModule],
  templateUrl: './sidenav.html',
  styleUrl: './sidenav.scss',
})
export class Sidenav {
  private readonly layoutService = inject(LayoutService);

  protected readonly navItems = NAV_ITEMS;
  protected readonly collapsed = this.layoutService.sidenavCollapsed;

  /** Emitted on nav-item click so Shell can close the mobile drawer after navigating. */
  readonly navigated = output<void>();
}
