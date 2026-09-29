// Rate limiter in-memory — ver CONTRATOS_TECNICOS.md §2.
// En FASE 6 se reemplaza por Upstash Redis (mismo interfaz).

import type {
  RateLimitResult,
  RateLimiter,
} from '@/lib/rate-limit-types';

interface Entry {
  count: number;
  windowStart: number;
}

class MemoryRateLimiter implements RateLimiter {
  private store = new Map<string, Entry>();
  private autoCleanupTimer: ReturnType<typeof setInterval> | null = null;

  async check(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || entry.windowStart + windowMs < now) {
      return {
        allowed: true,
        remaining: limit,
        resetAt: now + windowMs,
        current: 0,
      };
    }

    return {
      allowed: entry.count < limit,
      remaining: Math.max(0, limit - entry.count),
      resetAt: entry.windowStart + windowMs,
      current: entry.count,
    };
  }

  async increment(key: string, windowMs: number): Promise<number> {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || entry.windowStart + windowMs < now) {
      this.store.set(key, { count: 1, windowStart: now });
      return 1;
    }

    entry.count += 1;
    this.store.set(key, entry);
    return entry.count;
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  async cleanup(): Promise<{ removed: number }> {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.store.entries()) {
      // Asumimos window máxima de 24h para entradas "huérfanas"
      if (entry.windowStart + 24 * 60 * 60 * 1000 < now) {
        this.store.delete(key);
        removed += 1;
      }
    }
    return { removed };
  }

  startAutoCleanup(intervalMs: number): { stop: () => void } {
    if (this.autoCleanupTimer) return { stop: () => {} };
    this.autoCleanupTimer = setInterval(() => {
      void this.cleanup();
    }, intervalMs);
    // Permitir que el proceso termine aunque haya interval activo
    if (typeof this.autoCleanupTimer.unref === 'function') {
      this.autoCleanupTimer.unref();
    }
    return {
      stop: () => {
        if (this.autoCleanupTimer) {
          clearInterval(this.autoCleanupTimer);
          this.autoCleanupTimer = null;
        }
      },
    };
  }
}

// Singleton para toda la app
const globalForRateLimit = globalThis as unknown as {
  rateLimiter: RateLimiter | undefined;
};

export const rateLimiter: RateLimiter =
  globalForRateLimit.rateLimiter ?? new MemoryRateLimiter();

if (process.env.NODE_ENV !== 'production') {
  globalForRateLimit.rateLimiter = rateLimiter;
}

// Auto-limpieza en background (cada 5 min)
if (process.env.NODE_ENV !== 'test') {
  rateLimiter.startAutoCleanup(5 * 60 * 1000);
}
