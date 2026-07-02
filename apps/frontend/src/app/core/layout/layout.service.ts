import { Injectable, signal } from '@angular/core';

const COLLAPSED_STORAGE_KEY = 'lifeos-sidenav-collapsed';

/**
 * Owns shell layout state as signals (docs/08-tech-stack.md — Signals for cross-feature shared
 * state). Two independent concerns: the desktop sidebar's collapsed/expanded width, and the
 * mobile drawer's open/closed state — kept separate because they're mutually exclusive UI modes
 * (Shell picks one or the other based on viewport width, see layout/shell/shell.ts).
 */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  private readonly sidenavCollapsedSignal = signal(this.readStoredCollapsed());
  private readonly mobileDrawerOpenSignal = signal(false);

  readonly sidenavCollapsed = this.sidenavCollapsedSignal.asReadonly();
  readonly mobileDrawerOpen = this.mobileDrawerOpenSignal.asReadonly();

  toggleSidenavCollapsed(): void {
    const next = !this.sidenavCollapsedSignal();
    this.sidenavCollapsedSignal.set(next);
    localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
  }

  toggleMobileDrawer(): void {
    this.mobileDrawerOpenSignal.update((open) => !open);
  }

  closeMobileDrawer(): void {
    this.mobileDrawerOpenSignal.set(false);
  }

  private readStoredCollapsed(): boolean {
    return localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true';
  }
}
