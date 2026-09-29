import {
  EmailLayout,
  EmailHeading,
  EmailText,
  EmailMutedText,
  EmailButton,
} from './components';

interface WelcomeEmailProps {
  name: string;
  /** URL opcional para explorar el sitio */
  siteUrl?: string;
}

export function WelcomeEmail({ name, siteUrl }: WelcomeEmailProps) {
  return (
    <EmailLayout preview={`Bienvenido a LUMEN Estudio, ${name}`}>
      <EmailHeading>Bienvenido a LUMEN</EmailHeading>
      <EmailText>
        Hola {name}, es un placer tenerte en nuestro estudio. Desde acá vas a poder
        seguir nuestro portafolio editorial y mantenerte al tanto de nuevos proyectos.
      </EmailText>
      {siteUrl && (
        <EmailButton href={siteUrl}>Explorar portafolio</EmailButton>
      )}
      <EmailMutedText>
        Si en algún momento querés ajustar tus datos o eliminar tu cuenta, podés
        hacerlo desde tu perfil.
      </EmailMutedText>
    </EmailLayout>
  );
}

export default WelcomeEmail;
