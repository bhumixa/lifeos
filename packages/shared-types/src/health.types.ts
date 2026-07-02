/**
 * Contract for the backend's liveness/readiness endpoint.
 * Shared so the frontend can type the response without duplicating the shape.
 */
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  database: 'connected' | 'disconnected';
}
