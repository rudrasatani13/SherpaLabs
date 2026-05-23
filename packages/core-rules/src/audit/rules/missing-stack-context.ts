import type { StackFramework, StackLanguage, StackPackageManager } from '@sherpa-labs/shared-types';
import type { AuditRule } from '../types.js';
import { escapeRegExp, fileOnlyLocation, locationInput } from './helpers.js';

export const MISSING_STACK_CONTEXT_RULE_ID = 'heuristic.missing-stack-context';

const LANGUAGE_LABELS = {
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  python: 'Python',
  rust: 'Rust',
  go: 'Go',
  php: 'PHP',
  ruby: 'Ruby',
} as const satisfies Record<StackLanguage, string>;

const LANGUAGE_TERMS = {
  typescript: ['typescript', 'tsconfig', '.ts', '.tsx'],
  javascript: ['javascript', 'node.js', 'nodejs', 'package.json'],
  python: ['python', 'pyproject', 'requirements.txt'],
  rust: ['rust', 'cargo.toml', 'cargo'],
  go: ['go', 'go.mod', 'gofmt'],
  php: ['php', 'composer.json', 'composer'],
  ruby: ['ruby', 'gemfile', 'bundler'],
} as const satisfies Record<StackLanguage, readonly string[]>;

const FRAMEWORK_LABELS = {
  nextjs: 'Next.js',
  nuxt: 'Nuxt',
  remix: 'Remix',
  react: 'React',
  vue: 'Vue',
  svelte: 'Svelte',
  sveltekit: 'SvelteKit',
  astro: 'Astro',
  vite: 'Vite',
  express: 'Express',
  hono: 'Hono',
  fastify: 'Fastify',
  nestjs: 'NestJS',
  fastapi: 'FastAPI',
  starlette: 'Starlette',
  django: 'Django',
  flask: 'Flask',
  'actix-web': 'Actix Web',
  rocket: 'Rocket',
  axum: 'Axum',
  gin: 'Gin',
  echo: 'Echo',
  fiber: 'Fiber',
  laravel: 'Laravel',
  symfony: 'Symfony',
  rails: 'Rails',
  sinatra: 'Sinatra',
} as const satisfies Record<StackFramework, string>;

const FRAMEWORK_TERMS = {
  nextjs: ['next.js', 'nextjs', 'next'],
  nuxt: ['nuxt'],
  remix: ['remix'],
  react: ['react', 'jsx', 'tsx'],
  vue: ['vue'],
  svelte: ['svelte'],
  sveltekit: ['sveltekit', 'svelte kit'],
  astro: ['astro'],
  vite: ['vite'],
  express: ['express'],
  hono: ['hono'],
  fastify: ['fastify'],
  nestjs: ['nestjs', 'nest.js'],
  fastapi: ['fastapi', 'fast api'],
  starlette: ['starlette'],
  django: ['django'],
  flask: ['flask'],
  'actix-web': ['actix-web', 'actix web'],
  rocket: ['rocket'],
  axum: ['axum'],
  gin: ['gin'],
  echo: ['echo'],
  fiber: ['fiber'],
  laravel: ['laravel'],
  symfony: ['symfony'],
  rails: ['rails', 'ruby on rails'],
  sinatra: ['sinatra'],
} as const satisfies Record<StackFramework, readonly string[]>;

const PACKAGE_MANAGER_LABELS = {
  npm: 'npm',
  pnpm: 'pnpm',
  yarn: 'Yarn',
  bun: 'Bun',
  pip: 'pip',
  poetry: 'Poetry',
  uv: 'uv',
  cargo: 'Cargo',
  'go-modules': 'Go modules',
  composer: 'Composer',
  bundler: 'Bundler',
} as const satisfies Record<StackPackageManager, string>;

export const missingStackContextRule: AuditRule = {
  id: MISSING_STACK_CONTEXT_RULE_ID,
  severity: 'warning',
  title: 'Rules mention the detected stack',
  description: 'Flags rule sets that ignore detected languages, frameworks, and package tooling.',
  check(context) {
    const labels = [
      ...context.stack.languages.map((language) => LANGUAGE_LABELS[language]),
      ...context.stack.frameworks.map((framework) => FRAMEWORK_LABELS[framework]),
      ...context.stack.packageManagers.map((manager) => PACKAGE_MANAGER_LABELS[manager]),
    ];
    const terms = [
      ...context.stack.languages.flatMap((language) => LANGUAGE_TERMS[language]),
      ...context.stack.frameworks.flatMap((framework) => FRAMEWORK_TERMS[framework]),
      ...context.stack.packageManagers,
    ];

    if (terms.length === 0 || context.ruleSet.files.length === 0) {
      return [];
    }

    const combinedContent = context.ruleSet.files.map((file) => file.content).join('\n');

    if (terms.some((term) => containsTerm(combinedContent, term))) {
      return [];
    }

    const uniqueLabels = Array.from(new Set(labels)).join(', ');
    const firstFile = context.ruleSet.files[0];

    return [
      {
        message: `Detected ${uniqueLabels}, but none of the rule files mention those stack terms.`,
        category: 'missing-context' as const,
        ...locationInput(firstFile === undefined ? undefined : fileOnlyLocation(firstFile.path)),
        fixHint:
          'Add stack-specific guidance that names the detected language, framework, package manager, or test commands.',
      },
    ];
  },
};

function containsTerm(content: string, term: string): boolean {
  const lowerContent = content.toLowerCase();
  const lowerTerm = term.toLowerCase();

  if (/[^a-z0-9]/iu.test(lowerTerm)) {
    return lowerContent.includes(lowerTerm);
  }

  return new RegExp(`\\b${escapeRegExp(lowerTerm)}\\b`, 'iu').test(lowerContent);
}
