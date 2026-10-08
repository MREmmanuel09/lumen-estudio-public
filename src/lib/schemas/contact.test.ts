import { describe, expect, it } from 'vitest';
import { contactSchema } from './contact';

const validInput = {
  name: 'Juan Pérez',
  email: ' JUAN@Example.COM ',
  message: 'Hola, quiero agendar una sesión de fotos.',
};

describe('contactSchema', () => {
  it('acepta y normaliza entrada válida', () => {
    const parsed = contactSchema.parse(validInput);
    expect(parsed.name).toBe('Juan Pérez');
    expect(parsed.email).toBe('juan@example.com');
  });

  it('escapa HTML en nombre, asunto y mensaje', () => {
    const parsed = contactSchema.parse({
      ...validInput,
      name: '<b>Juan</b>',
      subject: '<i>Sesión</i>',
      message: '<script>alert(1)</script> hola mundo',
    });

    expect(parsed.name).toBe('&lt;b&gt;Juan&lt;/b&gt;');
    expect(parsed.subject).toBe('&lt;i&gt;Sesión&lt;/i&gt;');
    expect(parsed.message).toContain('&lt;script&gt;');
    expect(parsed.message).not.toContain('<script>');
  });

  it('rechaza nombre demasiado corto', () => {
    expect(() => contactSchema.parse({ ...validInput, name: 'J' })).toThrow();
  });

  it('rechaza mensaje demasiado corto', () => {
    expect(() =>
      contactSchema.parse({ ...validInput, message: 'corto' }),
    ).toThrow();
  });

  it('rechaza email inválido', () => {
    expect(() =>
      contactSchema.parse({ ...validInput, email: 'no-es-un-email' }),
    ).toThrow();
  });

  it('acepta subject opcional y consentimiento true', () => {
    const parsed = contactSchema.parse({ ...validInput, consent: true });
    expect(parsed.subject).toBeUndefined();
    expect(parsed.consent).toBe(true);
  });

  it('rechaza consentimiento false', () => {
    expect(() =>
      contactSchema.parse({ ...validInput, consent: false }),
    ).toThrow();
  });

  it('acepta el honeypot (se descarta en la ruta, no acá)', () => {
    const parsed = contactSchema.parse({ ...validInput, website: 'spam' });
    expect(parsed.website).toBe('spam');
  });
});
