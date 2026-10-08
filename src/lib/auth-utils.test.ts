import { describe, expect, it } from 'vitest';
import type { User } from '@prisma/client';
import {
  generateVerificationToken,
  hashPassword,
  hashToken,
  normalizeEmail,
  sanitizeUser,
  slugify,
  validatePasswordStrength,
  verifyPassword,
} from './auth-utils';

const HOUR_MS = 60 * 60 * 1000;

describe('validatePasswordStrength', () => {
  it('rechaza contraseñas cortas', () => {
    const result = validatePasswordStrength('Ab1!');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('exige al menos una mayúscula', () => {
    expect(validatePasswordStrength('abcdefg1!').valid).toBe(false);
  });

  it('exige al menos un número', () => {
    expect(validatePasswordStrength('Abcdefg!').valid).toBe(false);
  });

  it('exige al menos un símbolo', () => {
    expect(validatePasswordStrength('Abcdefg1').valid).toBe(false);
  });

  it('acepta una contraseña fuerte', () => {
    const result = validatePasswordStrength('S3gura!Pass');
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

describe('hashPassword / verifyPassword', () => {
  it('hashea con bcrypt y verifica correctamente', async () => {
    const hash = await hashPassword('S3gura!Pass');
    expect(hash).not.toContain('S3gura!Pass');
    expect(hash.startsWith('$2')).toBe(true);
    await expect(verifyPassword('S3gura!Pass', hash)).resolves.toBe(true);
    await expect(verifyPassword('Otra!Pass1', hash)).resolves.toBe(false);
  }, 20_000);
});

describe('tokens de verificación', () => {
  it('hashToken es sha256 hex determinista', () => {
    expect(hashToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('genera token base64url, hash consistente y expiración ~24 h', () => {
    const generated = generateVerificationToken();
    expect(generated.token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(generated.tokenHash).toBe(hashToken(generated.token));
    expect(generated.tokenHash).toMatch(/^[0-9a-f]{64}$/);

    const ttl = generated.expires.getTime() - Date.now();
    expect(ttl).toBeGreaterThan(23 * HOUR_MS);
    expect(ttl).toBeLessThan(25 * HOUR_MS);
  });

  it('genera tokens únicos en cada llamada', () => {
    expect(generateVerificationToken().token).not.toBe(
      generateVerificationToken().token,
    );
  });
});

describe('normalizeEmail', () => {
  it('recorta espacios y pasa a minúsculas', () => {
    expect(normalizeEmail('  Foo@BAR.com ')).toBe('foo@bar.com');
  });
});

describe('slugify', () => {
  it('quita acentos y normaliza', () => {
    expect(slugify('Sesión en Terraza')).toBe('sesion-en-terraza');
  });

  it('colapsa espacios y guiones repetidos', () => {
    expect(slugify('  Hola   Mundo  ')).toBe('hola-mundo');
    expect(slugify('con--dashes')).toBe('con-dashes');
  });

  it('elimina símbolos y recorta guiones de los bordes', () => {
    expect(slugify('-Ñandú & Cía!-')).toBe('nandu-cia');
  });

  it('limita el largo a 64 caracteres', () => {
    expect(slugify('a'.repeat(200)).length).toBeLessThanOrEqual(64);
  });
});

describe('sanitizeUser', () => {
  it('expone solo campos públicos (no passwordHash)', () => {
    const user = {
      id: 'u1',
      name: 'Ana',
      email: 'ana@example.com',
      passwordHash: 'hash-secreto',
      role: 'ADMIN',
      emailVerified: null,
      image: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date(),
    } as unknown as User;

    const publicUser = sanitizeUser(user);

    expect(publicUser).toEqual({
      id: 'u1',
      name: 'Ana',
      email: 'ana@example.com',
      role: 'ADMIN',
      emailVerified: null,
      image: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    expect('passwordHash' in publicUser).toBe(false);
  });
});
