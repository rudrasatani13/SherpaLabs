import type {
  StackDetectionWarning,
  StackFramework,
  StackManifest,
  StackPackageManager,
} from '@sherpa-labs/shared-types';
import { isExistingFile, makeMalformedWarning, readManifest, buildManifest } from './fs.js';

export interface GoDetectionResult {
  readonly detected: boolean;
  readonly frameworks: readonly StackFramework[];
  readonly packageManagers: readonly StackPackageManager[];
  readonly manifests: readonly StackManifest[];
  readonly warnings: readonly StackDetectionWarning[];
}

const FRAMEWORK_PACKAGE_MAP: readonly (readonly [RegExp, StackFramework])[] = [
  [/^github\.com\/gin-gonic\/gin($|\/)/, 'gin'],
  [/^github\.com\/labstack\/echo(\/.*)?$/, 'echo'],
  [/^github\.com\/gofiber\/fiber($|\/)/, 'fiber'],
];

export async function detectGo(rootPath: string): Promise<GoDetectionResult> {
  const manifests: StackManifest[] = [];
  const warnings: StackDetectionWarning[] = [];
  const frameworks = new Set<StackFramework>();
  const packageManagers = new Set<StackPackageManager>();

  const goModResult = await readManifest(rootPath, 'go.mod', 'go.mod');

  if (goModResult.status === 'unreadable') {
    warnings.push(goModResult.failure.warning);
  } else if (goModResult.status === 'ok') {
    manifests.push(goModResult.read.manifest);
    packageManagers.add('go-modules');

    const parsed = parseGoMod(goModResult.read.content);
    if (parsed.type === 'malformed') {
      warnings.push(makeMalformedWarning('go.mod', goModResult.read.manifest.path, parsed.reason));
    } else {
      for (const requirement of parsed.value) {
        for (const [pattern, framework] of FRAMEWORK_PACKAGE_MAP) {
          if (pattern.test(requirement)) {
            frameworks.add(framework);
          }
        }
      }
    }
  }

  if (await isExistingFile(rootPath, 'go.sum')) {
    manifests.push(buildManifest(rootPath, 'go.sum', 'go.sum'));
    packageManagers.add('go-modules');
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

type ParseGoModResult =
  | { readonly type: 'ok'; readonly value: readonly string[] }
  | { readonly type: 'malformed'; readonly reason: string };

function parseGoMod(content: string): ParseGoModResult {
  const lines = content.split(/\r?\n/);
  const requirements: string[] = [];
  let inBlock = false;
  let hasModuleDirective = false;

  for (const rawLine of lines) {
    const line = stripGoComment(rawLine).trim();
    if (line === '') {
      continue;
    }

    if (line.startsWith('module ')) {
      hasModuleDirective = true;
      continue;
    }

    if (line.startsWith('require (')) {
      inBlock = true;
      continue;
    }

    if (inBlock && line === ')') {
      inBlock = false;
      continue;
    }

    if (inBlock) {
      const match = /^([^\s]+)\s+([^\s]+)/.exec(line);
      if (match?.[1] !== undefined) {
        requirements.push(match[1]);
      }
      continue;
    }

    if (line.startsWith('require ')) {
      const rest = line.slice('require '.length).trim();
      const match = /^([^\s]+)\s+([^\s]+)/.exec(rest);
      if (match?.[1] !== undefined) {
        requirements.push(match[1]);
      }
    }
  }

  if (!hasModuleDirective && requirements.length === 0 && content.trim() !== '') {
    if (!/\bmodule\b/.test(content) && !/\brequire\b/.test(content)) {
      return { type: 'malformed', reason: 'go.mod is missing module/require directives.' };
    }
  }

  return { type: 'ok', value: requirements };
}

function stripGoComment(line: string): string {
  const idx = line.indexOf('//');
  return idx === -1 ? line : line.slice(0, idx);
}
