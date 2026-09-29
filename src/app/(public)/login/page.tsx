import type { Metadata } from 'next';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: 'Iniciar sesión',
  description: 'Accede a tu cuenta de LUMEN Estudio.',
};

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-bg px-6 py-24">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <p className="font-detail text-xs uppercase tracking-[0.3em] text-accent">
            Bienvenido de vuelta
          </p>
          <h1 className="mt-3 font-display text-4xl text-fg">Iniciar sesión</h1>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
