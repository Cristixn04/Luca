import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const FORBIDDEN_GLOBALS = [
  'window',
  'document',
  'navigator',
  'location',
  'history',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'HTMLElement',
  'SVGElement',
  'alert',
  'confirm',
  'prompt',
  'process',
  'Buffer',
];

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
      },
    },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        ...FORBIDDEN_GLOBALS.map((name) => ({
          name,
          message: `El dominio puro (@luca/domain) no puede usar "${name}". Mantén el dominio libre de navegador, red y runtime.`,
        })),
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-*',
                'dexie',
                'axios',
                'node:*',
                'fs',
                'fs/*',
                'path',
                'http',
                'https',
                'net',
                'child_process',
                'os',
                'url',
              ],
              message:
                'El dominio puro (@luca/domain) no puede importar frameworks, APIs de red ni módulos de Node/navegador.',
            },
          ],
        },
      ],
    },
  },
);
