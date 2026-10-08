import type { Metadata } from 'next';
import { RegisterForm } from './RegisterForm';

export const metadata: Metadata = {
  title: 'Crear cuenta',
  description: 'Registrate en LUMEN Estudio.',
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-bg px-6 py-24">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <p className="font-detail text-xs uppercase tracking-[0.3em] text-accent">
            Únete
          </p>
          <h1 className="mt-3 font-display text-4xl text-fg">Crear cuenta</h1>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
