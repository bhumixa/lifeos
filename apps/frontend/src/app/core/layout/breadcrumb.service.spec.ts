import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BreadcrumbService } from './breadcrumb.service';

@Component({ template: '' })
class DummyComponent {}

describe('BreadcrumbService', () => {
  let service: BreadcrumbService;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'dashboard', component: DummyComponent, data: { breadcrumb: 'Dashboard' } },
          { path: 'tasks', component: DummyComponent, data: { breadcrumb: 'Tasks' } },
          { path: 'no-breadcrumb', component: DummyComponent },
        ]),
      ],
    });
    service = TestBed.inject(BreadcrumbService);
    harness = await RouterTestingHarness.create();
  });

  it('builds a breadcrumb for a route with breadcrumb data', async () => {
    await harness.navigateByUrl('/dashboard');
    expect(service.breadcrumbs()).toEqual([{ label: 'Dashboard', url: '/dashboard' }]);
  });

  it('updates when navigating to a different route', async () => {
    await harness.navigateByUrl('/dashboard');
    await harness.navigateByUrl('/tasks');
    expect(service.breadcrumbs()).toEqual([{ label: 'Tasks', url: '/tasks' }]);
  });

  it('produces no breadcrumbs for a route without breadcrumb data', async () => {
    await harness.navigateByUrl('/no-breadcrumb');
    expect(service.breadcrumbs()).toEqual([]);
  });
});
