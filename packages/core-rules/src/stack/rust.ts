import type {
  StackDetectionWarning,
  StackFramework,
  StackManifest,
  StackPackageManager,
} from '@sherpa-labs/shared-types';
import { isExistingFile, makeMalformedWarning, readManifest, buildManifest } from './fs.js';

export interface RustDetectionResult {
  readonly detected: boolean;
  readonly frameworks: readonly StackFramework[];
  readonly packageManagers: readonly StackPackageManager[];
  readonly manifests: readonly StackManifest[];
  readonly warnings: readonly StackDetectionWarning[];
}

const FRAMEWORK_PACKAGE_MAP: readonly (readonly [string, StackFramework])[] = [
  ['actix-web', 'actix-web'],
  ['rocket', 'rocket'],
  ['axum', 'axum'],
];

export async function detectRust(rootPath: string): Promise<RustDetectionResult> {
  const manifests: StackManifest[] = [];
  const warnings: StackDetectionWarning[] = [];
  const frameworks = new Set<StackFramework>();
  const packageManagers = new Set<StackPackageManager>();

  const cargoResult = await readManifest(rootPath, 'Cargo.toml', 'Cargo.toml');

  if (cargoResult.status === 'unreadable') {
    warnings.push(cargoResult.failure.warning);
  } else if (cargoResult.status === 'ok') {
    manifests.push(cargoResult.read.manifest);
    packageManagers.add('cargo');

    const parsed = parseCargoToml(cargoResult.read.content);
    if (parsed.type === 'malformed') {
      warnings.push(
        makeMalformedWarning('Cargo.toml', cargoResult.read.manifest.path, parsed.reason),
      );
    } else {
      for (const [packageName, framework] of FRAMEWORK_PACKAGE_MAP) {
        if (parsed.value.has(packageName)) {
          frameworks.add(framework);
        }
      }
    }
  }

  if (await isExistingFile(rootPath, 'Cargo.lock')) {
    manifests.push(buildManifest(rootPath, 'Cargo.lock', 'Cargo.lock'));
    packageManagers.add('cargo');
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

type ParseCargoResult =
  | { readonly type: 'ok'; readonly value: ReadonlySet<string> }
  | { readonly type: 'malformed'; readonly reason: string };

function parseCargoToml(content: string): ParseCargoResult {
  const sections = splitTomlSections(content);
  const dependencies = new Set<string>();
  let sawDependencySection = false;
  let malformedReason: string | undefined;

  for (const section of sections) {
    if (
      section.name === 'dependencies' ||
      section.name === 'dev-dependencies' ||
      section.name === 'build-dependencies'
    ) {
      sawDependencySection = true;
      const keys = extractTomlKeys(section.body);
      for (const key of keys) {
        dependencies.add(key);
      }
      continue;
    }

    const inlineMatch = /^dependencies\.([A-Za-z0-9_-]+)$/.exec(section.name);
    if (inlineMatch?.[1] !== undefined) {
      dependencies.add(inlineMatch[1]);
    }
  }

  if (!sawDependencySection && /\bdependencies\b/.test(content)) {
    const unbalancedBracket =
      (content.match(/\[/g) ?? []).length !== (content.match(/\]/g) ?? []).length;
    if (unbalancedBracket) {
      malformedReason = 'Unbalanced brackets in Cargo.toml.';
    }
  }

  if (malformedReason !== undefined) {
    return { type: 'malformed', reason: malformedReason };
  }

  return { type: 'ok', value: dependencies };
}

interface TomlSection {
  readonly name: string;
  readonly body: string;
}

function splitTomlSections(content: string): readonly TomlSection[] {
  const lines = content.split(/\r?\n/);
  const sections: TomlSection[] = [];
  let currentName = '';
  let currentBody: string[] = [];

  const push = (): void => {
    sections.push({ name: currentName, body: currentBody.join('\n') });
  };

  for (const line of lines) {
    const headerMatch = /^\s*\[([^[\]]+)\]\s*$/.exec(line);
    if (headerMatch?.[1] !== undefined) {
      push();
      currentName = headerMatch[1].trim();
      currentBody = [];
      continue;
    }
    currentBody.push(line);
  }

  push();
  return sections;
}

function extractTomlKeys(body: string): readonly string[] {
  const keys: string[] = [];
  const lines = body.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) {
      continue;
    }

    const keyMatch = /^([A-Za-z0-9_.-]+|"[^"]+")\s*=/.exec(trimmed);
    if (keyMatch?.[1] !== undefined) {
      const rawKey = keyMatch[1].replace(/^"|"$/g, '');
      keys.push(rawKey);
    }
  }

  return keys;
}
