import { TestBed } from '@angular/core/testing';
import { LayoutService } from './layout.service';

describe('LayoutService', () => {
  let service: LayoutService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(LayoutService);
  });

  it('starts with the sidenav expanded and the mobile drawer closed', () => {
    expect(service.sidenavCollapsed()).toBe(false);
    expect(service.mobileDrawerOpen()).toBe(false);
  });

  it('toggles and persists the sidenav collapsed state', () => {
    service.toggleSidenavCollapsed();
    expect(service.sidenavCollapsed()).toBe(true);
    expect(localStorage.getItem('lifeos-sidenav-collapsed')).toBe('true');

    service.toggleSidenavCollapsed();
    expect(service.sidenavCollapsed()).toBe(false);
  });

  it('toggles the mobile drawer independently of the sidenav collapsed state', () => {
    service.toggleMobileDrawer();
    expect(service.mobileDrawerOpen()).toBe(true);
    expect(service.sidenavCollapsed()).toBe(false);

    service.closeMobileDrawer();
    expect(service.mobileDrawerOpen()).toBe(false);
  });
});
