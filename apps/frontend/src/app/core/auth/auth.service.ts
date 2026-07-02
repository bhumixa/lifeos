import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import type { AuthResponse, AuthUser, LoginRequest, RegisterRequest } from '@lifeos/shared-types';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Owns client-side auth state as signals (per docs/08-tech-stack.md — Signals for cross-feature
 * shared state). The access token lives only in memory (this signal), never localStorage, so an
 * XSS bug can't read it off disk; the refresh token is an httpOnly cookie the browser manages and
 * this service never touches directly. Losing the access token on page reload is expected and
 * handled by tryRestoreSession() re-deriving a new one from the refresh cookie at startup.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  private readonly userSignal = signal<AuthUser | null>(null);
  private readonly accessTokenSignal = signal<string | null>(null);
  // Distinguishes "haven't attempted session restore yet" from "restored, not authenticated" so
  // route guards don't redirect to /login before app-startup's tryRestoreSession() has resolved.
  private readonly initializedSignal = signal(false);

  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  readonly isAdmin = computed(() => this.userSignal()?.role === 'ADMIN');
  readonly initialized = this.initializedSignal.asReadonly();

  get accessToken(): string | null {
    return this.accessTokenSignal();
  }

  register(request: RegisterRequest): Observable<AuthUser> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/register`, request, { withCredentials: true })
      .pipe(
        tap((response) => this.applySession(response)),
        map((response) => response.user),
      );
  }

  login(request: LoginRequest): Observable<AuthUser> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/login`, request, { withCredentials: true })
      .pipe(
        tap((response) => this.applySession(response)),
        map((response) => response.user),
      );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/logout`, {}, { withCredentials: true }).pipe(
      map(() => undefined),
      catchError(() => of(undefined)), // best-effort: the local session is cleared either way
      tap(() => this.clearLocalSession()),
    );
  }

  /**
   * Called once at app startup (see provideAppInitializer in app.config.ts) to silently exchange
   * the httpOnly refresh cookie for a fresh access token, restoring the session after a reload.
   */
  tryRestoreSession(): Observable<boolean> {
    return this.refreshAccessToken().pipe(
      map(() => true),
      catchError(() => {
        this.clearLocalSession();
        return of(false);
      }),
      tap(() => this.initializedSignal.set(true)),
    );
  }

  /** Also used by the HTTP interceptor to obtain a fresh access token after a 401. */
  refreshAccessToken(): Observable<AuthUser> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/refresh`, {}, { withCredentials: true })
      .pipe(
        tap((response) => this.applySession(response)),
        map((response) => response.user),
      );
  }

  /** Clears in-memory state without a network call — used when a refresh attempt itself fails. */
  clearLocalSession(): void {
    this.accessTokenSignal.set(null);
    this.userSignal.set(null);
  }

  private applySession(response: AuthResponse): void {
    this.accessTokenSignal.set(response.accessToken);
    this.userSignal.set(response.user);
  }
}
