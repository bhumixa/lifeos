import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { AuthResponse } from '@lifeos/shared-types';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const mockResponse: AuthResponse = {
    accessToken: 'access-token',
    user: { id: 'user-1', email: 'ada@example.com', name: 'Ada Lovelace', avatarUrl: null, role: 'STANDARD' },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('login applies the returned session to the user/accessToken signals', () => {
    service.login({ email: mockResponse.user.email, password: 'Passw0rd1' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.withCredentials).toBe(true);
    req.flush(mockResponse);

    expect(service.user()).toEqual(mockResponse.user);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.accessToken).toBe('access-token');
  });

  it('register applies the returned session to the user/accessToken signals', () => {
    service.register({ name: 'Ada Lovelace', email: mockResponse.user.email, password: 'Passw0rd1' }).subscribe();

    httpMock.expectOne(`${environment.apiUrl}/auth/register`).flush(mockResponse);

    expect(service.isAuthenticated()).toBe(true);
  });

  it('logout clears the local session even if the server call fails', () => {
    service.login({ email: mockResponse.user.email, password: 'Passw0rd1' }).subscribe();
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(mockResponse);
    expect(service.isAuthenticated()).toBe(true);

    service.logout().subscribe();
    httpMock
      .expectOne(`${environment.apiUrl}/auth/logout`)
      .flush({ message: 'boom' }, { status: 500, statusText: 'Internal Server Error' });

    expect(service.isAuthenticated()).toBe(false);
    expect(service.accessToken).toBeNull();
  });

  it('tryRestoreSession resolves true and restores the session when the refresh cookie is valid', () => {
    let restored: boolean | undefined;
    service.tryRestoreSession().subscribe((result) => (restored = result));

    httpMock.expectOne(`${environment.apiUrl}/auth/refresh`).flush(mockResponse);

    expect(restored).toBe(true);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('tryRestoreSession resolves false and stays logged out when there is no valid refresh cookie', () => {
    let restored: boolean | undefined;
    service.tryRestoreSession().subscribe((result) => (restored = result));

    httpMock
      .expectOne(`${environment.apiUrl}/auth/refresh`)
      .flush({ message: 'No refresh token provided' }, { status: 401, statusText: 'Unauthorized' });

    expect(restored).toBe(false);
    expect(service.isAuthenticated()).toBe(false);
  });
});
