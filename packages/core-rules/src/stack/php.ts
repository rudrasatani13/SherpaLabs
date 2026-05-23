import type {
  StackDetectionWarning,
  StackFramework,
  StackManifest,
  StackPackageManager,
} from '@sherpa-labs/shared-types';
import { isExistingFile, makeMalformedWarning, readManifest, buildManifest } from './fs.js';

export interface PhpDetectionResult {
  readonly detected: boolean;
  readonly frameworks: readonly StackFramework[];
  readonly packageManagers: readonly StackPackageManager[];
  readonly manifests: readonly StackManifest[];
  readonly warnings: readonly StackDetectionWarning[];
}

const FRAMEWORK_PACKAGE_MAP: readonly (readonly [RegExp, StackFramework])[] = [
  [/^laravel\//, 'laravel'],
  [/^symfony\//, 'symfony'],
];

export async function detectPhp(rootPath: string): Promise<PhpDetectionResult> {
  const manifests: StackManifest[] = [];
  const warnings: StackDetectionWarning[] = [];
  const frameworks = new Set<StackFramework>();
  const packageManagers = new Set<StackPackageManager>();

  const composerResult = await readManifest(rootPath, 'composer.json', 'composer.json');

  if (composerResult.status === 'unreadable') {
    warnings.push(composerResult.failure.warning);
  } else if (composerResult.status === 'ok') {
    manifests.push(composerResult.read.manifest);
    packageManagers.add('composer');

    const parsed = parseComposerJson(composerResult.read.content);

    if (parsed.type === 'malformed') {
      warnings.push(
        makeMalformedWarning('composer.json', composerResult.read.manifest.path, parsed.reason),
      );
    } else {
      for (const dep of parsed.value) {
        for (const [pattern, framework] of FRAMEWORK_PACKAGE_MAP) {
          if (pattern.test(dep)) {
            frameworks.add(framework);
          }
        }
      }
    }
  }

  if (await isExistingFile(rootPath, 'composer.lock')) {
    manifests.push(buildManifest(rootPath, 'composer.lock', 'composer.lock'));
    packageManagers.add('composer');
  }

  const detected = manifests.length > 0;

  return {
    detected,
    frameworks: Array.from(frameworks),
    packageManagers: Array.from(packageManagers),
    manifests,
    warnings,
  };
}

type ParseComposerResult =
  | { readonly type: 'ok'; readonly value: readonly string[] }
  | { readonly type: 'malformed'; readonly reason: string };

function parseComposerJson(content: string): ParseComposerResult {
  let raw: unknown;

  try {
    raw = JSON.parse(content);
  } catch (error) {
    return { type: 'malformed', reason: describeError(error) };
  }

  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { type: 'malformed', reason: 'composer.json root must be a JSON object.' };
  }

  const obj = raw as Record<string, unknown>;
  const dependencies: string[] = [];

  for (const field of ['require', 'require-dev']) {
    const value = obj[field];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      for (const key of Object.keys(value)) {
        dependencies.push(key);
      }
    }
  }

  return { type: 'ok', value: dependencies };
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
