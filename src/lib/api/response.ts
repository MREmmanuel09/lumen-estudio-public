// Helpers para respuestas API consistentes.
// Shape: { success: true, data } | { success: false, error: { code, message, details } }
// Ver CONTRATOS_TECNICOS.md §3.

import { NextResponse } from 'next/server';

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTH_REQUIRED'
  | 'AUTH_INVALID'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'INTERNAL_ERROR';

export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiErrorBody };

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  AUTH_INVALID: 401,
  AUTH_REQUIRED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  toResponse(): NextResponse<ApiResponse<never>> {
    const status = STATUS_BY_CODE[this.code];
    const body: ApiResponse<never> = {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    };
    const headers: HeadersInit = {};
    if (this.code === 'RATE_LIMITED' && this.details?.['retryAfter']) {
      headers['Retry-After'] = String(this.details['retryAfter']);
    }
    return NextResponse.json(body, { status, headers });
  }
}

export function ok<T>(data: T, init?: ResponseInit): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, init);
}

export function err(
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>,
): NextResponse<ApiResponse<never>> {
  return new ApiError(code, message, details).toResponse();
}

/**
 * CSRF mitigation (P0): para métodos que mutan estado, si el request trae
 * `Origin` o `Referer`, el host debe coincidir con el host del request.
 * Sin headers (curl, apps nativas, mismo origen fetch sin Origin) se permite.
 * `SameSite=Lax` solo no alcanza para top-level GET ni subdominios.
 *
 * Confianza en `X-Forwarded-Host`: solo se acepta si viene de la red de
 * Docker (peer del proxy: Caddy, Cloudflare Tunnel, Tailscale Funnel).
 * En producción este header llega desde el reverse proxy; si la app está
 * expuesta directamente, los atacantes pueden falsificarlo. Mitigación:
 * Caddy/Tunnel deben ser los únicos frontends (puerto 3000 NO se publica,
 * ver docker-compose.prod.yml).
 */
export function assertSameOrigin(req: Request): void {
  const method = req.method?.toUpperCase() ?? 'GET';
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return;

  const headers = req.headers;
  const origin = headers.get('origin');
  const referer = headers.get('referer');
  if (!origin && !referer) return;

  // Host esperado: `host` directo o `x-forwarded-host` tras Caddy/Tunnel.
  const forwardedHost = headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost ?? headers.get('host');
  if (!host) return;

  const expectedHost = host.toLowerCase();
  const matches = (url: string): boolean => {
    try {
      return new URL(url).host.toLowerCase() === expectedHost;
    } catch {
      return false;
    }
  };

  if (origin ? !matches(origin) : referer ? !matches(referer) : false) {
    throw new ApiError('FORBIDDEN', 'Origen no permitido');
  }
}

function extractRequest(args: unknown[]): Request | null {
  const candidate = args[0] as Partial<Request> | undefined;
  if (
    candidate &&
    typeof candidate.method === 'string' &&
    typeof (candidate as { url?: unknown }).url === 'string' &&
    candidate.headers instanceof Headers
  ) {
    return candidate as Request;
  }
  return null;
}

/**
 * Wrapper para route handlers. Captura ApiError y excepciones genéricas,
 * devolviendo el shape correcto.
 */
export function withApiHandler<TArgs extends unknown[], T>(
  handler: (...args: TArgs) => Promise<NextResponse<ApiResponse<T>>>,
): (...args: TArgs) => Promise<NextResponse<ApiResponse<T>>> {
  return async (...args: TArgs) => {
    try {
      const req = extractRequest(args);
      if (req) assertSameOrigin(req);
      return await handler(...args);
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        return error.toResponse();
      }
      console.error('[api] Unhandled error:', error);
      return err('INTERNAL_ERROR', 'Error interno del servidor');
    }
  };
}
