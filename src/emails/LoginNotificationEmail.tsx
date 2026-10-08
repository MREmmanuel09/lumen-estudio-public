import {
  EmailLayout,
  EmailHeading,
  EmailText,
  EmailMutedText,
} from './components';

interface LoginNotificationEmailProps {
  name: string;
  loginAt: string;
  ip?: string;
  userAgent?: string;
}

export function LoginNotificationEmail({ name, loginAt, ip, userAgent }: LoginNotificationEmailProps) {
  return (
    <EmailLayout preview="Nuevo inicio de sesión en tu cuenta">
      <EmailHeading>Nuevo inicio de sesión</EmailHeading>
      <EmailText>
        Hola {name}, te avisamos que se inició sesión en tu cuenta de LUMEN Estudio
        el <strong>{loginAt}</strong>.
      </EmailText>
      {(ip || userAgent) && (
        <EmailMutedText>
          <strong>Detalles:</strong>
          <br />
          {ip && <>IP: {ip}<br /></>}
          {userAgent && <>Navegador: {userAgent}</>}
        </EmailMutedText>
      )}
      <EmailMutedText>
        Si no fuiste vos, cambiá tu contraseña inmediatamente y contactanos a{' '}
        <a href="mailto:privacidad@example.com" style={{ color: '#E8E0D5' }}>
          privacidad@example.com
        </a>
        .
      </EmailMutedText>
    </EmailLayout>
  );
}

export default LoginNotificationEmail;
