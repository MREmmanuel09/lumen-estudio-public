// Email service con tres modos:
//   1. SMTP (Nodemailer) — producción self-hosted o servicio externo
//   2. Resend (API HTTP) — si SMTP_HOST no está configurado pero RESEND_API_KEY sí
//   3. Consola — modo dev (no enviar nada, solo loguear)

import { Resend } from 'resend';
import nodemailer, { type Transporter } from 'nodemailer';
import { render } from '@react-email/render';
import { VerificationEmail } from '@/emails/VerificationEmail';
import { WelcomeEmail } from '@/emails/WelcomeEmail';
import { PasswordResetEmail } from '@/emails/PasswordResetEmail';
import { LoginNotificationEmail } from '@/emails/LoginNotificationEmail';
import { ContactConfirmationEmail } from '@/emails/ContactConfirmationEmail';
import { ContactNotificationEmail } from '@/emails/ContactNotificationEmail';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

import { getAdminEmail, getAppUrl, getEmailFrom, sanitizeEmailSubject } from '@/lib/env';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';

// Cache de transporters
let smtpTransporter: Transporter | null = null;
let resendClient: Resend | null = null;

function getSmtpTransporter(): Transporter | null {
  if (!SMTP_HOST) return null;
  if (smtpTransporter) return smtpTransporter;
  smtpTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: SMTP_USER && SMTP_PASSWORD
      ? { user: SMTP_USER, pass: SMTP_PASSWORD }
      : undefined,
  });
  return smtpTransporter;
}

function getResend(): Resend | null {
  if (!RESEND_API_KEY) return null;
  if (!resendClient) {
    resendClient = new Resend(RESEND_API_KEY);
  }
  return resendClient;
}

async function send(message: EmailMessage): Promise<void> {
  const from = getEmailFrom();
  const subject = sanitizeEmailSubject(message.subject);
  // 1. Modo SMTP (preferido para self-hosted)
  const smtp = getSmtpTransporter();
  if (smtp) {
    try {
      const info = await smtp.sendMail({
        from,
        to: message.to,
        subject,
        html: message.html,
        ...(message.text ? { text: message.text } : {}),
      });
      console.info(`[email:smtp] Sent to ${message.to} (id: ${info.messageId})`);
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'desconocido';
      throw new Error(`Error SMTP al enviar email: ${msg}`);
    }
  }

  // 2. Modo Resend (API)
  const resend = getResend();
  if (resend) {
    const { error } = await resend.emails.send({
      from,
      to: message.to,
      subject,
      html: message.html,
      ...(message.text ? { text: message.text } : {}),
    });
    if (error) {
      throw new Error(`Error Resend al enviar email: ${error.message ?? 'desconocido'}`);
    }
    return;
  }

  // 3. Modo dev: loguear en consola
  console.info('\n[email:dev] ─────────────────────────────');
  console.info(`[email:dev] To:      ${message.to}`);
  console.info(`[email:dev] Subject: ${message.subject}`);
  console.info(`[email:dev] HTML:    ${message.html.length} chars`);
  if (message.text) {
    console.info(`[email:dev] Text:\n${message.text}`);
  } else {
    const preview = message.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    console.info(`[email:dev] Preview: ${preview.slice(0, 400)}...`);
  }
  console.info('[email:dev] ─────────────────────────────\n');
}

// --- API pública: plantillas de alto nivel ---

export async function sendVerificationEmail(
  to: string,
  name: string,
  token: string,
): Promise<void> {
  const verifyUrl = `${getAppUrl()}/api/auth/verify-email?token=${token}`;
  const html = await render(VerificationEmail({ name, verifyUrl }));
  await send({ to, subject: 'Verifica tu email — LUMEN Estudio', html });
}

export async function sendWelcomeEmail(
  to: string,
  name: string,
): Promise<void> {
  const siteUrl = getAppUrl();
  const html = await render(WelcomeEmail({ name, siteUrl }));
  await send({ to, subject: 'Bienvenido a LUMEN Estudio', html });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string,
): Promise<void> {
  const resetUrl = `${getAppUrl()}/reset-password?token=${token}`;
  const html = await render(PasswordResetEmail({ name, resetUrl }));
  await send({ to, subject: 'Restablecé tu contraseña — LUMEN Estudio', html });
}

export async function sendLoginNotification(
  to: string,
  name: string,
  meta?: { ip?: string; userAgent?: string },
): Promise<void> {
  const html = await render(
    LoginNotificationEmail({
      name,
      loginAt: new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' }),
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    }),
  );
  await send({ to, subject: 'Nuevo inicio de sesión en tu cuenta', html });
}

export async function sendContactConfirmation(
  to: string,
  name: string,
  message: string,
): Promise<void> {
  const html = await render(ContactConfirmationEmail({ name, message }));
  await send({ to, subject: 'Recibimos tu mensaje — LUMEN Estudio', html });
}

export async function sendContactNotification(
  fromName: string,
  fromEmail: string,
  subject: string | null,
  message: string,
): Promise<void> {
  const adminUrl = `${getAppUrl()}/admin/mensajes`;
  const html = await render(
    ContactNotificationEmail({ fromName, fromEmail, subject, message, adminUrl }),
  );
  await send({ to: getAdminEmail(), subject: `Nuevo mensaje de ${fromName}`, html });
}
