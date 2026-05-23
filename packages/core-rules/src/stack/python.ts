import type {
  StackDetectionWarning,
  StackFramework,
  StackManifest,
  StackPackageManager,
} from '@sherpa-labs/shared-types';
import { isExistingFile, makeMalformedWarning, readManifest } from './fs.js';

export interface PythonDetectionResult {
  readonly detected: boolean;
  readonly frameworks: readonly StackFramework[];
  readonly packageManagers: readonly StackPackageManager[];
  readonly manifests: readonly StackManifest[];
  readonly warnings: readonly StackDetectionWarning[];
}

const FRAMEWORK_PACKAGE_MAP: readonly (readonly [string, StackFramework])[] = [
  ['fastapi', 'fastapi'],
  ['starlette', 'starlette'],
  ['django', 'django'],
  ['flask', 'flask'],
];

export async function detectPython(rootPath: string): Promise<PythonDetectionResult> {
  const manifests: StackManifest[] = [];
  const warnings: StackDetectionWarning[] = [];
  const packageManagers = new Set<StackPackageManager>();
  const frameworks = new Set<StackFramework>();
  const dependencies = new Set<string>();

  const pyprojectResult = await readManifest(rootPath, 'pyproject.toml', 'pyproject.toml');

  if (pyprojectResult.status === 'unreadable') {
    warnings.push(pyprojectResult.failure.warning);
  } else if (pyprojectResult.status === 'ok') {
    manifests.push(pyprojectResult.read.manifest);
    const parsed = parsePyproject(pyprojectResult.read.content);

    if (parsed.type === 'malformed') {
      warnings.push(
        makeMalformedWarning('pyproject.toml', pyprojectResult.read.manifest.path, parsed.reason),
      );
    } else {
      for (const dep of parsed.value.dependencies) {
        dependencies.add(dep);
      }
      for (const manager of parsed.value.packageManagers) {
        packageManagers.add(manager);
      }
    }
  }

  const requirementsResult = await readManifest(rootPath, 'requirements.txt', 'requirements.txt');

  if (requirementsResult.status === 'unreadable') {
    warnings.push(requirementsResult.failure.warning);
  } else if (requirementsResult.status === 'ok') {
    manifests.push(requirementsResult.read.manifest);
    packageManagers.add('pip');

    for (const dep of parseRequirementsTxt(requirementsResult.read.content)) {
      dependencies.add(dep);
    }
  }

  if (await isExistingFile(rootPath, 'poetry.lock')) {
    packageManagers.add('poetry');
  }

  if (await isExistingFile(rootPath, 'uv.lock')) {
    packageManagers.add('uv');
  }

  for (const [packageName, framework] of FRAMEWORK_PACKAGE_MAP) {
    if (dependencies.has(packageName)) {
      frameworks.add(framework);
    }
  }

  if (dependencies.has('starlette') && !frameworks.has('starlette')) {
    frameworks.add('starlette');
  }

  const detected = manifests.length > 0 || packageManagers.size > 0;

  if (detected && packageManagers.size === 0) {
    packageManagers.add('pip');
  }

  return {
    detected,
    frameworks: Array.from(frameworks),
    packageManagers: Array.from(packageManagers),
    manifests,
    warnings,
  };
}

interface ParsedPyproject {
  readonly dependencies: ReadonlySet<string>;
  readonly packageManagers: ReadonlySet<StackPackageManager>;
}

type ParsePyprojectResult =
  | { readonly type: 'ok'; readonly value: ParsedPyproject }
  | { readonly type: 'malformed'; readonly reason: string };

function parsePyproject(content: string): ParsePyprojectResult {
  const syntacticError = detectTomlSyntaxIssue(content);
  if (syntacticError !== undefined) {
    return { type: 'malformed', reason: syntacticError };
  }

  const sections = splitTomlSections(content);
  const dependencies = new Set<string>();
  const packageManagers = new Set<StackPackageManager>();
  let hasUnbalancedQuotes = false;

  for (const section of sections) {
    if (section.name === 'project') {
      const projectDeps = extractTomlArray(section.body, 'dependencies');
      if (projectDeps.unbalancedQuotes) {
        hasUnbalancedQuotes = true;
      }
      for (const dep of projectDeps.values) {
        const name = pep508Name(dep);
        if (name !== undefined) {
          dependencies.add(name);
        }
      }
    }

    if (section.name === 'tool.poetry') {
      packageManagers.add('poetry');
    }

    if (section.name === 'tool.poetry.dependencies') {
      packageManagers.add('poetry');
      for (const key of extractTomlKeys(section.body)) {
        if (key !== 'python') {
          dependencies.add(normalizePyName(key));
        }
      }
    }

    if (section.name === 'tool.uv' || section.name === 'tool.uv.sources') {
      packageManagers.add('uv');
    }

    if (section.name === 'tool.pdm') {
      packageManagers.add('pip');
    }
  }

  if (hasUnbalancedQuotes && dependencies.size === 0 && packageManagers.size === 0) {
    return {
      type: 'malformed',
      reason: 'Unable to parse [project] dependencies (unbalanced quotes).',
    };
  }

  return { type: 'ok', value: { dependencies, packageManagers } };
}

function detectTomlSyntaxIssue(content: string): string | undefined {
  const lines = content.split(/\r?\n/);
  let lineNumber = 0;

  for (const line of lines) {
    lineNumber += 1;
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) {
      continue;
    }

    if (trimmed.startsWith('[') && !/^\[\[?[A-Za-z0-9_.-]+(?:\]\]?|\])$/.test(trimmed)) {
      return `Unclosed section header on line ${lineNumber}.`;
    }
  }

  const quoteCount = (content.match(/"/g) ?? []).length;
  if (quoteCount % 2 !== 0) {
    return 'Unbalanced double quotes in file.';
  }

  return undefined;
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

interface TomlArrayExtract {
  readonly values: readonly string[];
  readonly unbalancedQuotes: boolean;
}

function extractTomlArray(body: string, key: string): TomlArrayExtract {
  const pattern = new RegExp(`(^|\\n)\\s*${escapeRegex(key)}\\s*=\\s*\\[([\\s\\S]*?)\\]`, 'm');
  const match = pattern.exec(body);

  if (match?.[2] === undefined) {
    return { values: [], unbalancedQuotes: false };
  }

  const inner = match[2];
  const values: string[] = [];
  let unbalancedQuotes = false;

  const stringPattern = /"((?:\\.|[^"\\])*)"|'((?:[^'])*)'/g;
  let stringMatch: RegExpExecArray | null;

  while ((stringMatch = stringPattern.exec(inner)) !== null) {
    const value = stringMatch[1] ?? stringMatch[2];
    if (value !== undefined) {
      values.push(value);
    }
  }

  const quoteCount = (inner.match(/"/g) ?? []).length;
  if (quoteCount % 2 !== 0) {
    unbalancedQuotes = true;
  }

  return { values, unbalancedQuotes };
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

function pep508Name(spec: string): string | undefined {
  const trimmed = spec.trim();
  if (trimmed === '') {
    return undefined;
  }

  const nameMatch = /^([A-Za-z0-9][A-Za-z0-9._-]*)/.exec(trimmed);
  if (nameMatch?.[1] === undefined) {
    return undefined;
  }

  return normalizePyName(nameMatch[1]);
}

function normalizePyName(name: string): string {
  return name.toLowerCase().replace(/[._-]+/g, '-');
}

function parseRequirementsTxt(content: string): readonly string[] {
  const result: string[] = [];
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const stripped = line.split('#')[0]?.trim() ?? '';
    if (stripped === '') {
      continue;
    }

    if (stripped.startsWith('-')) {
      continue;
    }

    const name = pep508Name(stripped);
    if (name !== undefined) {
      result.push(name);
    }
  }

  return result;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
