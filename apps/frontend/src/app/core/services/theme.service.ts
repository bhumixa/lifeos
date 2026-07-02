import { Injectable, signal } from '@angular/core';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'lifeos-theme-preference';
const DARK_CLASS = 'dark-theme';

/**
 * Toggles the `.dark-theme` class on <html> that styles.scss's `mat.theme()` blocks key off of.
 * Preference is persisted so it survives reloads, and defaults to the OS-level color scheme for
 * first-time visitors.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly preferenceSignal = signal<ThemePreference>(this.readStoredPreference());
  readonly preference = this.preferenceSignal.asReadonly();

  constructor() {
    this.applyPreference(this.preferenceSignal());
  }

  setPreference(preference: ThemePreference): void {
    this.preferenceSignal.set(preference);
    localStorage.setItem(STORAGE_KEY, preference);
    this.applyPreference(preference);
  }

  toggle(): void {
    this.setPreference(this.isDarkActive() ? 'light' : 'dark');
  }

  private isDarkActive(): boolean {
    return document.documentElement.classList.contains(DARK_CLASS);
  }

  private applyPreference(preference: ThemePreference): void {
    const prefersDark = preference === 'dark' || (preference === 'system' && this.systemPrefersDark());
    document.documentElement.classList.toggle(DARK_CLASS, prefersDark);
  }

  private systemPrefersDark(): boolean {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private readStoredPreference(): ThemePreference {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  }
}
