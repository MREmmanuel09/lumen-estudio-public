// Validación de entorno fail-closed (P0 Seguridad).
// En dev se permiten defaults; en prod se lanza si falta config crítica.

const isProd = process.env.NODE_ENV === 'production';

function requiredInProd(name: string, value: string | undefined): string | undefined {
  if (value && value.length > 0) return value;
  if (isProd) {
    throw new Error(`[env] Falta variable requerida en producción: ${name}`);
  }
  return undefined;
}

/** URL pública canónica. En prod nunca permite localhost ni vacío. */
export function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  if (!raw) {
    if (isProd) throw new Error('[env] NEXT_PUBLIC_APP_URL requerido en producción');
    return 'http://localhost:3000';
  }
  if (isProd) {
    try {
      const url = new URL(raw);
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        throw new Error('[env] NEXT_PUBLIC_APP_URL no puede ser localhost en producción');
      }
      return url.origin;
    } catch (err) {
      if (err instanceof Error && err.message.includes('localhost')) throw err;
      throw new Error('[env] NEXT_PUBLIC_APP_URL inválida en producción');
    }
  }
  return raw.replace(/\/$/, '');
}

/** Remitente de emails. En prod exige EMAIL_FROM configurado. */
export function getEmailFrom(): string {
  const raw = requiredInProd('EMAIL_FROM', process.env.EMAIL_FROM);
  return raw ?? 'LUMEN Estudio <noreply@example.com>';
}

/** Email admin destino. En prod exige EMAIL_ADMIN configurado. */
export function getAdminEmail(): string {
  const raw = requiredInProd('EMAIL_ADMIN', process.env.EMAIL_ADMIN);
  return raw ?? 'admin@example.com';
}

/** Sanitiza strings que van a headers de email (previene header-injection). */
export function sanitizeEmailSubject(input: string): string {
  return input.replace(/[\r\n]+/g, ' ').trim().slice(0, 200);
}
