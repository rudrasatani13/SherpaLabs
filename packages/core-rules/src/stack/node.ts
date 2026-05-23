import type {
  StackDetectionWarning,
  StackFramework,
  StackManifest,
  StackPackageManager,
} from '@sherpa-labs/shared-types';
import { buildManifest, isExistingFile, makeMalformedWarning, readManifest } from './fs.js';

export interface NodeDetectionResult {
  readonly detected: boolean;
  readonly hasJavaScript: boolean;
  readonly hasTypeScriptInDeps: boolean;
  readonly frameworks: readonly StackFramework[];
  readonly packageManagers: readonly StackPackageManager[];
  readonly manifests: readonly StackManifest[];
  readonly warnings: readonly StackDetectionWarning[];
}

interface ParsedPackageJson {
  readonly dependencies: ReadonlySet<string>;
  readonly hasTypeScript: boolean;
}

type DependencyMap = Readonly<Record<string, unknown>>;

const FRAMEWORK_PACKAGE_MAP: readonly (readonly [string, StackFramework])[] = [
  ['next', 'nextjs'],
  ['nuxt', 'nuxt'],
  ['@remix-run/react', 'remix'],
  ['@remix-run/node', 'remix'],
  ['@remix-run/serve', 'remix'],
  ['react', 'react'],
  ['vue', 'vue'],
  ['svelte', 'svelte'],
  ['@sveltejs/kit', 'sveltekit'],
  ['astro', 'astro'],
  ['vite', 'vite'],
  ['express', 'express'],
  ['hono', 'hono'],
  ['fastify', 'fastify'],
  ['@nestjs/core', 'nestjs'],
  ['@nestjs/common', 'nestjs'],
];

export async function detectNode(rootPath: string): Promise<NodeDetectionResult> {
  const warnings: StackDetectionWarning[] = [];
  const manifests: StackManifest[] = [];
  const packageManagers = new Set<StackPackageManager>();
  const frameworks: StackFramework[] = [];

  const packageJsonResult = await readManifest(rootPath, 'package.json', 'package.json');

  let parsed: ParsedPackageJson | undefined;

  if (packageJsonResult.status === 'unreadable') {
    warnings.push(packageJsonResult.failure.warning);
  } else if (packageJsonResult.status === 'ok') {
    manifests.push(packageJsonResult.read.manifest);

    const parsedResult = parsePackageJson(packageJsonResult.read.content);

    if (parsedResult.type === 'malformed') {
      warnings.push(
        makeMalformedWarning(
          'package.json',
          packageJsonResult.read.manifest.path,
          parsedResult.reason,
        ),
      );
    } else {
      parsed = parsedResult.value;

      for (const [packageName, framework] of FRAMEWORK_PACKAGE_MAP) {
        if (parsed.dependencies.has(packageName) && !frameworks.includes(framework)) {
          frameworks.push(framework);
        }
      }
    }
  }

  for (const [filename, manager] of LOCKFILE_MAP) {
    if (await isExistingFile(rootPath, filename)) {
      manifests.push(buildManifest(rootPath, filename, filename));
      packageManagers.add(manager);
    }
  }

  const hasPackageJson = packageJsonResult.status === 'ok';
  const detected = hasPackageJson || packageManagers.size > 0;

  if (detected && packageManagers.size === 0 && hasPackageJson) {
    packageManagers.add('npm');
  }

  return {
    detected,
    hasJavaScript: detected,
    hasTypeScriptInDeps: parsed?.hasTypeScript ?? false,
    frameworks,
    packageManagers: Array.from(packageManagers),
    manifests,
    warnings,
  };
}

const LOCKFILE_MAP: readonly (readonly [
  'pnpm-lock.yaml' | 'package-lock.json' | 'yarn.lock' | 'bun.lock' | 'bun.lockb',
  StackPackageManager,
])[] = [
  ['pnpm-lock.yaml', 'pnpm'],
  ['package-lock.json', 'npm'],
  ['yarn.lock', 'yarn'],
  ['bun.lock', 'bun'],
  ['bun.lockb', 'bun'],
];

type ParsePackageJsonResult =
  | { readonly type: 'ok'; readonly value: ParsedPackageJson }
  | { readonly type: 'malformed'; readonly reason: string };

function parsePackageJson(content: string): ParsePackageJsonResult {
  let raw: unknown;

  try {
    raw = JSON.parse(content);
  } catch (error) {
    return { type: 'malformed', reason: describeError(error) };
  }

  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { type: 'malformed', reason: 'package.json root must be a JSON object.' };
  }

  const obj = raw as Record<string, unknown>;
  const dependencies = new Set<string>();

  for (const field of [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ]) {
    const value = obj[field];
    if (isDependencyMap(value)) {
      for (const name of Object.keys(value)) {
        dependencies.add(name);
      }
    }
  }

  const hasTypeScript = dependencies.has('typescript');

  return { type: 'ok', value: { dependencies, hasTypeScript } };
}

function isDependencyMap(value: unknown): value is DependencyMap {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
