// ESLint 9 flat config — LUMEN Estudio
// Configuración mínima viable. Se re-introducirá el preset de Next
// (next/core-web-vitals) cuando se resuelva la incompatibilidad con
// FlatCompat en Next 16. Ver README sección "Pendientes".

import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '.next/**',
      '_next_*.bak/**',
      '_next_old.bak/**',
      '**/*.bak',
      'node_modules/**',
      'public/uploads/**',
      'out/**',
      'next-env.d.ts',
      '*.config.mjs',
      '*.config.ts',
    ],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-expressions': 'off',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    },
  },
);
