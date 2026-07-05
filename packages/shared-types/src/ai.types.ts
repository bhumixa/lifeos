import type { PaginatedResult, SortOrder } from './task.types.js';

export type InsightType = 'PRODUCTIVITY' | 'HABITS' | 'GOALS' | 'PLANNER' | 'JOURNAL' | 'STREAKS' | 'SYSTEM';
export type InsightStatus = 'ACTIVE' | 'ARCHIVED' | 'DISMISSED';
export type AiRole = 'USER' | 'ASSISTANT' | 'SYSTEM';

/** `sourceData` shape varies by `type` — see docs/API.md's AI Coach section for the documented
 * per-type contract (e.g. PRODUCTIVITY/PLANNER carry `completionRateThisWeek`/`deltaPercent`;
 * GOALS carries `atRiskGoals`). Every shape includes a `flags` array — `'risk'` is the one the
 * Dashboard's Risk Alerts widget filters on. */
export interface AiInsight {
  id: string;
  type: InsightType;
  title: string;
  summary: string;
  content: string;
  /** 0.0-1.0 */
  confidence: number;
  status: InsightStatus;
  sourceData: Record<string, unknown> | null;
  generatedAt: string;
  expiresAt: string | null;
  createdAt: string;
}

export type PaginatedAiInsights = PaginatedResult<AiInsight>;

export interface AiInsightQueryParams {
  type?: InsightType;
  status?: InsightStatus;
  sortBy?: 'generatedAt' | 'createdAt' | 'confidence';
  sortOrder?: SortOrder;
  page?: number;
  pageSize?: number;
}

/** Omitting `type` generates one insight for every auto-generatable domain (PRODUCTIVITY/HABITS/
 * GOALS/PLANNER/JOURNAL/STREAKS — SYSTEM is excluded, see docs/API.md). */
export interface GenerateInsightRequest {
  type?: InsightType;
}

export interface AiMessage {
  id: string;
  conversationId: string;
  role: AiRole;
  content: string;
  createdAt: string;
}

export interface AiConversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messages: AiMessage[];
}

/** GET /ai/conversations' list-item shape — omits `messages` so the list stays cheap. */
export interface AiConversationSummary {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface CreateConversationRequest {
  title?: string;
}

/** Omitting `conversationId` starts a new conversation, auto-titled from `message`. */
export interface ChatRequest {
  conversationId?: string;
  message: string;
}

export interface ChatResponse {
  conversationId: string;
  userMessage: AiMessage;
  assistantMessage: AiMessage;
}
