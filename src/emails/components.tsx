// Layout y componentes base compartidos para emails.

import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { getAppUrl } from '@/lib/env';

const COLORS = {
  bg: '#0A192F',
  fg: '#F8F9FA',
  accent: '#E8E0D5',
  muted: 'rgba(248, 249, 250, 0.6)',
  border: 'rgba(232, 224, 213, 0.2)',
};

const FONT_DISPLAY = "'Cormorant Garamond', Georgia, serif";
const FONT_BODY = "'Inter', system-ui, -apple-system, sans-serif";

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
  /** Ancho del container. Default 560px */
  width?: number;
}

export function EmailLayout({ preview, children, width = 560 }: EmailLayoutProps) {
  const appUrl = getAppUrl();
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: COLORS.bg,
          fontFamily: FONT_BODY,
          margin: 0,
          padding: 0,
        }}
      >
        <Container
          style={{
            backgroundColor: COLORS.bg,
            margin: '0 auto',
            padding: '40px 24px',
            maxWidth: width,
          }}
        >
          {/* Header con logo */}
          <Section style={{ textAlign: 'center', marginBottom: 32 }}>
            <Text
              style={{
                color: COLORS.fg,
                fontFamily: FONT_DISPLAY,
                fontSize: 32,
                fontWeight: 500,
                letterSpacing: '0.05em',
                margin: 0,
              }}
            >
              LUMEN
              <span style={{ color: COLORS.accent }}> · </span>
              <span
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: 11,
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                  color: COLORS.muted,
                }}
              >
                Estudio
              </span>
            </Text>
          </Section>

          <Hr style={{ borderColor: COLORS.border, margin: '0 0 32px 0' }} />

          {children}

          <Hr style={{ borderColor: COLORS.border, margin: '32px 0 24px 0' }} />

          {/* Footer */}
          <Section style={{ textAlign: 'center' }}>
            <Text
              style={{
                color: COLORS.muted,
                fontSize: 11,
                letterSpacing: '0.1em',
                margin: 0,
              }}
            >
              © {new Date().getFullYear()} LUMEN Estudio · Costa Rica
            </Text>
            <Text style={{ color: COLORS.muted, fontSize: 11, margin: '8px 0 0 0' }}>
              <Link href={`${appUrl}/privacidad`} style={{ color: COLORS.muted }}>
                Privacidad
              </Link>
              {' · '}
              <Link href={`${appUrl}/terminos`} style={{ color: COLORS.muted }}>
                Términos
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

interface EmailHeadingProps {
  children: React.ReactNode;
  level?: 1 | 2;
}

export function EmailHeading({ children, level = 1 }: EmailHeadingProps) {
  const fontSize = level === 1 ? 28 : 22;
  return (
    <Text
      style={{
        color: COLORS.fg,
        fontFamily: FONT_DISPLAY,
        fontSize,
        fontWeight: 500,
        lineHeight: 1.2,
        margin: '0 0 16px 0',
      }}
    >
      {children}
    </Text>
  );
}

export function EmailText({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        color: COLORS.fg,
        fontSize: 15,
        lineHeight: 1.6,
        margin: '0 0 16px 0',
      }}
    >
      {children}
    </Text>
  );
}

export function EmailMutedText({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        color: COLORS.muted,
        fontSize: 13,
        lineHeight: 1.6,
        margin: '0 0 16px 0',
      }}
    >
      {children}
    </Text>
  );
}

interface EmailButtonProps {
  href: string;
  children: React.ReactNode;
}

export function EmailButton({ href, children }: EmailButtonProps) {
  return (
    <Section style={{ textAlign: 'center', margin: '24px 0' }}>
      <Link
        href={href}
        style={{
          backgroundColor: COLORS.accent,
          color: COLORS.bg,
          display: 'inline-block',
          fontFamily: FONT_BODY,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.15em',
          padding: '14px 32px',
          textDecoration: 'none',
          textTransform: 'uppercase',
        }}
      >
        {children}
      </Link>
    </Section>
  );
}

export const EMAIL_COLORS = COLORS;
