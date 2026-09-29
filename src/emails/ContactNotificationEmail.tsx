import {
  EmailLayout,
  EmailHeading,
  EmailText,
  EmailMutedText,
  EmailButton,
} from './components';

interface ContactNotificationEmailProps {
  fromName: string;
  fromEmail: string;
  subject: string | null;
  message: string;
  /** URL al panel admin para ver el mensaje */
  adminUrl: string;
}

export function ContactNotificationEmail({
  fromName,
  fromEmail,
  subject,
  message,
  adminUrl,
}: ContactNotificationEmailProps) {
  return (
    <EmailLayout preview={`Nuevo mensaje de ${fromName}`}>
      <EmailHeading>Nuevo mensaje de contacto</EmailHeading>
      <EmailText>
        <strong>{fromName}</strong> ({fromEmail}) te escribió:
      </EmailText>
      {subject && (
        <EmailText>
          <strong>Asunto:</strong> {subject}
        </EmailText>
      )}
      <EmailMutedText>
        <em>"{message}"</em>
      </EmailMutedText>
      <EmailButton href={adminUrl}>Ver en el panel</EmailButton>
    </EmailLayout>
  );
}

export default ContactNotificationEmail;
