// Tipos de la interfaz RateLimiter — referenciado por src/lib/rate-limit.ts
// y consumido por API routes. Definido aparte para que los route handlers
// no necesiten importar la implementación in-memory.

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Unix ms cuando se resetea la ventana */
  resetAt: number;
  /** Total de requests en la ventana actual */
  current: number;
}

export interface RateLimiter {
  check(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
  increment(key: string, windowMs: number): Promise<number>;
  reset(key: string): Promise<void>;
  cleanup(): Promise<{ removed: number }>;
  startAutoCleanup(intervalMs: number): { stop: () => void };
}
