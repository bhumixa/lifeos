import { Routes } from '@angular/router';

/** Mounted at the pre-existing `/ai-coach` path (see app.routes.ts) — that nav item already
 * existed pointing at the shared FeaturePlaceholder, the same "reuse an existing nav item, no nav
 * change needed" precedent Habits/Journal already set. `chat/:conversationId` is optional — see
 * AiChatPage for why. */
export const aiRoutes: Routes = [
  {
    path: '',
    data: { breadcrumb: 'AI Coach' },
    loadComponent: () => import('./pages/ai-dashboard-page/ai-dashboard-page').then((m) => m.AiDashboardPage),
  },
  {
    path: 'insights',
    data: { breadcrumb: 'AI Insights' },
    loadComponent: () => import('./pages/ai-insights-page/ai-insights-page').then((m) => m.AiInsightsPage),
  },
  {
    path: 'chat',
    data: { breadcrumb: 'AI Chat' },
    loadComponent: () => import('./pages/ai-chat-page/ai-chat-page').then((m) => m.AiChatPage),
  },
  {
    path: 'chat/:conversationId',
    data: { breadcrumb: 'AI Chat' },
    loadComponent: () => import('./pages/ai-chat-page/ai-chat-page').then((m) => m.AiChatPage),
  },
];
