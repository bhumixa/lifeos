import { Routes } from '@angular/router';

// 'morning'/'evening'/'history'/'search' are literal segments, declared before ':date/:id' —
// the same literal-before-param rule every other feature's routes already document (see
// habits.routes.ts/goals.routes.ts). Journal Detail is addressed by "YYYY-MM-DD"/id (`:date/:id`)
// rather than a plain `/journal/:id`, since GET /journal/:date already returns the whole day's
// entries — see the class doc on JournalDetailPage.
export const journalRoutes: Routes = [
  {
    path: '',
    data: { breadcrumb: 'Journal' },
    loadComponent: () =>
      import('./pages/journal-dashboard-page/journal-dashboard-page').then((m) => m.JournalDashboardPage),
  },
  {
    path: 'morning',
    data: { breadcrumb: 'Morning Journal' },
    loadComponent: () =>
      import('./pages/morning-journal-page/morning-journal-page').then((m) => m.MorningJournalPage),
  },
  {
    path: 'evening',
    data: { breadcrumb: 'Evening Journal' },
    loadComponent: () =>
      import('./pages/evening-journal-page/evening-journal-page').then((m) => m.EveningJournalPage),
  },
  {
    path: 'history',
    data: { breadcrumb: 'Journal History' },
    loadComponent: () =>
      import('./pages/journal-history-page/journal-history-page').then((m) => m.JournalHistoryPage),
  },
  {
    path: 'search',
    data: { breadcrumb: 'Search Journals' },
    loadComponent: () =>
      import('./pages/search-journals-page/search-journals-page').then((m) => m.SearchJournalsPage),
  },
  {
    path: ':date/:id',
    data: { breadcrumb: 'Journal Entry' },
    loadComponent: () =>
      import('./pages/journal-detail-page/journal-detail-page').then((m) => m.JournalDetailPage),
  },
];
