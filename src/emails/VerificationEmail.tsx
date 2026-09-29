import {
  EmailLayout,
  EmailHeading,
  EmailText,
  EmailMutedText,
  EmailButton,
} from './components';

interface VerificationEmailProps {
  name: string;
  verifyUrl: string;
}

export function VerificationEmail({ name, verifyUrl }: VerificationEmailProps) {
  return (
    <EmailLayout preview="Verificá tu email para activar tu cuenta">
      <EmailHeading>Verificá tu email</EmailHeading>
      <EmailText>
        Hola {name}, gracias por registrarte en LUMEN Estudio. Para activar tu cuenta
        y empezar a disfrutar del sitio, hacé clic en el siguiente botón:
      </EmailText>
      <EmailButton href={verifyUrl}>Verificar email</EmailButton>
      <EmailMutedText>
        Si el botón no funciona, copiá y pegá este enlace en tu navegador:
        <br />
        <br />
        <span style={{ wordBreak: 'break-all' }}>{verifyUrl}</span>
      </EmailMutedText>
      <EmailMutedText>
        Este enlace expira en 24 horas. Si no solicitaste esta cuenta, podés ignorar
        este mensaje.
      </EmailMutedText>
    </EmailLayout>
  );
}

export default VerificationEmail;
