import type {
  StackDetectionWarning,
  StackFramework,
  StackManifest,
  StackPackageManager,
} from '@sherpa-labs/shared-types';
import { isExistingFile, makeMalformedWarning, readManifest, buildManifest } from './fs.js';

export interface RubyDetectionResult {
  readonly detected: boolean;
  readonly frameworks: readonly StackFramework[];
  readonly packageManagers: readonly StackPackageManager[];
  readonly manifests: readonly StackManifest[];
  readonly warnings: readonly StackDetectionWarning[];
}

const FRAMEWORK_GEM_MAP: readonly (readonly [string, StackFramework])[] = [
  ['rails', 'rails'],
  ['sinatra', 'sinatra'],
];

export async function detectRuby(rootPath: string): Promise<RubyDetectionResult> {
  const manifests: StackManifest[] = [];
  const warnings: StackDetectionWarning[] = [];
  const frameworks = new Set<StackFramework>();
  const packageManagers = new Set<StackPackageManager>();

  const gemfileResult = await readManifest(rootPath, 'Gemfile', 'Gemfile');

  if (gemfileResult.status === 'unreadable') {
    warnings.push(gemfileResult.failure.warning);
  } else if (gemfileResult.status === 'ok') {
    manifests.push(gemfileResult.read.manifest);
    packageManagers.add('bundler');

    const parsed = parseGemfile(gemfileResult.read.content);
    if (parsed.type === 'malformed') {
      warnings.push(
        makeMalformedWarning('Gemfile', gemfileResult.read.manifest.path, parsed.reason),
      );
    } else {
      for (const gem of parsed.value) {
        for (const [gemName, framework] of FRAMEWORK_GEM_MAP) {
          if (gem === gemName) {
            frameworks.add(framework);
          }
        }
      }
    }
  }

  if (await isExistingFile(rootPath, 'Gemfile.lock')) {
    manifests.push(buildManifest(rootPath, 'Gemfile.lock', 'Gemfile.lock'));
    packageManagers.add('bundler');
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

type ParseGemfileResult =
  | { readonly type: 'ok'; readonly value: readonly string[] }
  | { readonly type: 'malformed'; readonly reason: string };

function parseGemfile(content: string): ParseGemfileResult {
  const lines = content.split(/\r?\n/);
  const gems: string[] = [];

  for (const rawLine of lines) {
    const line = stripRubyComment(rawLine).trim();
    if (line === '' || !line.startsWith('gem')) {
      continue;
    }

    const match = /^gem\s+(?:"([^"]+)"|'([^']+)')/.exec(line);
    if (match !== null) {
      const name = match[1] ?? match[2];
      if (name !== undefined) {
        gems.push(name);
      }
    }
  }

  if (gems.length === 0 && /\bgem\b/.test(content)) {
    const looksLikeUnclosed = /gem\s+["'][^"'\n]*$/m.test(content);
    if (looksLikeUnclosed) {
      return { type: 'malformed', reason: 'Gemfile contains gem entry without closing quote.' };
    }
  }

  return { type: 'ok', value: gems };
}

function stripRubyComment(line: string): string {
  const idx = line.indexOf('#');
  return idx === -1 ? line : line.slice(0, idx);
}
