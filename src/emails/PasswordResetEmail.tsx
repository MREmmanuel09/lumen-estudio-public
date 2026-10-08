import {
  EmailLayout,
  EmailHeading,
  EmailText,
  EmailMutedText,
  EmailButton,
} from './components';

interface PasswordResetEmailProps {
  name: string;
  resetUrl: string;
}

export function PasswordResetEmail({ name, resetUrl }: PasswordResetEmailProps) {
  return (
    <EmailLayout preview="Restablecé tu contraseña de LUMEN">
      <EmailHeading>Restablecer contraseña</EmailHeading>
      <EmailText>
        Hola {name}, recibimos una solicitud para restablecer la contraseña de tu
        cuenta. Si fuiste vos, hacé clic en el botón para continuar:
      </EmailText>
      <EmailButton href={resetUrl}>Crear nueva contraseña</EmailButton>
      <EmailMutedText>
        Si el botón no funciona, copiá y pegá este enlace en tu navegador:
        <br />
        <br />
        <span style={{ wordBreak: 'break-all' }}>{resetUrl}</span>
      </EmailMutedText>
      <EmailMutedText>
        Este enlace expira en 24 horas. Si no solicitaste restablecer tu contraseña,
        podés ignorar este mensaje — tu cuenta sigue segura.
      </EmailMutedText>
    </EmailLayout>
  );
}

export default PasswordResetEmail;
