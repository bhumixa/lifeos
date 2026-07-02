import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { map } from 'rxjs';
import { LayoutService } from '../../core/layout/layout.service';
import { Navbar } from '../navbar/navbar';
import { Sidenav } from '../sidenav/sidenav';

const MOBILE_BREAKPOINT = '(max-width: 768px)';

/**
 * The one layout every authenticated feature route renders inside (see app.routes.ts). Below
 * 768px the sidenav becomes an overlay drawer (mode="over", toggled open/closed); at or above it,
 * it's a permanently-visible side panel (mode="side") that can only collapse to icon-only width,
 * never fully hide — those are different UI concepts and mixing them into one boolean would make
 * both harder to reason about, hence LayoutService tracking them as separate signals.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, MatSidenavModule, Navbar, Sidenav],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly breakpointObserver = inject(BreakpointObserver);
  protected readonly layoutService = inject(LayoutService);

  protected readonly isMobile = toSignal(
    this.breakpointObserver.observe(MOBILE_BREAKPOINT).pipe(map((state) => state.matches)),
    { initialValue: this.breakpointObserver.isMatched(MOBILE_BREAKPOINT) },
  );

  protected readonly sidenavMode = computed(() => (this.isMobile() ? 'over' : 'side'));
  protected readonly sidenavOpened = computed(() => (this.isMobile() ? this.layoutService.mobileDrawerOpen() : true));
  protected readonly sidenavCollapsed = computed(() => !this.isMobile() && this.layoutService.sidenavCollapsed());

  protected onMenuToggle(): void {
    if (this.isMobile()) {
      this.layoutService.toggleMobileDrawer();
    } else {
      this.layoutService.toggleSidenavCollapsed();
    }
  }

  protected onNavigated(): void {
    if (this.isMobile()) {
      this.layoutService.closeMobileDrawer();
    }
  }

  protected onOpenedChange(opened: boolean): void {
    if (this.isMobile() && !opened) {
      this.layoutService.closeMobileDrawer();
    }
  }
}
