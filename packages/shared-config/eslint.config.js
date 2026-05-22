// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

const ignores = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/.next/**',
  '**/.wrangler/**',
  '**/coverage/**',
  '**/*.tsbuildinfo',
  '**/.turbo/**',
  '**/.cache/**',
  '**/pnpm-lock.yaml',
];

/**
 * Base flat config used by every package in the monorepo.
 *
 * Apps with framework-specific needs (Next.js, Workers, Node CLIs) can spread
 * this array and append their own overrides — see `createNodeConfig`,
 * `createReactConfig` for ready-made starting points.
 */
const baseConfig = [
  { ignores },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        projectService: true,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      curly: ['error', 'multi-line'],
    },
  },
  {
    files: ['**/*.{test,spec}.{ts,tsx,js,mjs,cjs}', '**/test/**', '**/__tests__/**'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: [
      '**/*.config.{js,mjs,cjs,ts}',
      '**/*.cjs',
      '**/scripts/**',
      '**/tools/**/*.{js,mjs,cjs}',
    ],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
  },
  eslintConfigPrettier,
];

/** Node CLI / server preset: adds Node globals. */
export function createNodeConfig(extra = []) {
  return [
    ...baseConfig,
    {
      languageOptions: {
        globals: { ...globals.node },
      },
    },
    ...extra,
  ];
}

/** React / Next.js preset: adds browser globals + JSX parsing. */
export function createReactConfig(extra = []) {
  return [
    ...baseConfig,
    {
      languageOptions: {
        globals: { ...globals.browser, ...globals.node },
        parserOptions: {
          ecmaFeatures: { jsx: true },
        },
      },
    },
    ...extra,
  ];
}

export default baseConfig;
