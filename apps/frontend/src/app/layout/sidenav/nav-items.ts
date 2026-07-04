export interface NavItem {
  label: string;
  icon: string;
  route: string;
}

/** Single source of truth for the primary nav — also referenced by app.routes.ts route data. */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
  { label: 'Tasks', icon: 'checklist', route: '/tasks' },
  { label: 'Routines', icon: 'event_repeat', route: '/routines' },
  { label: 'Schedule', icon: 'calendar_month', route: '/schedule' },
  { label: 'Habits', icon: 'repeat', route: '/habits' },
  { label: 'Streaks', icon: 'local_fire_department', route: '/streaks' },
  { label: 'Goals', icon: 'flag', route: '/goals' },
  { label: 'Journal', icon: 'book', route: '/journal' },
  { label: 'Calendar', icon: 'event', route: '/calendar' },
  { label: 'Notifications', icon: 'notifications', route: '/notifications' },
  { label: 'AI Coach', icon: 'psychology', route: '/ai-coach' },
  { label: 'Analytics', icon: 'insights', route: '/analytics' },
  { label: 'Settings', icon: 'settings', route: '/settings' },
];
