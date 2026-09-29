import {
  EmailLayout,
  EmailHeading,
  EmailText,
  EmailMutedText,
} from './components';

interface ContactConfirmationEmailProps {
  name: string;
  message: string;
}

export function ContactConfirmationEmail({ name, message }: ContactConfirmationEmailProps) {
  return (
    <EmailLayout preview="Recibimos tu mensaje, te respondemos pronto">
      <EmailHeading>Recibimos tu mensaje</EmailHeading>
      <EmailText>
        Hola {name}, gracias por escribirnos. Recibimos tu mensaje y te respondemos
        en menos de 48 horas hábiles.
      </EmailText>
      <EmailMutedText>
        <strong>Tu mensaje:</strong>
        <br />
        <br />
        <em>"{message}"</em>
      </EmailMutedText>
      <EmailMutedText>
        Mientras tanto, podés explorar nuestro portafolio para conocer más sobre
        nuestro trabajo.
      </EmailMutedText>
    </EmailLayout>
  );
}

export default ContactConfirmationEmail;
