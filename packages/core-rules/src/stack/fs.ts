import { readdir, stat } from 'node:fs/promises';
import { isAbsolute, join, resolve, sep } from 'node:path';
import type {
  StackAiTool,
  StackAiToolKind,
  StackDetectionWarning,
  StackManifest,
  StackManifestKind,
} from '@sherpa-labs/shared-types';
import { normalizePath, safeReadFile, type SafeFileReadResult } from '@sherpa-labs/core-utils';

export interface DetectorContext {
  readonly rootPath: string;
}

export interface ManifestRead {
  readonly manifest: StackManifest;
  readonly content: string;
}

export interface ManifestReadFailure {
  readonly kind: StackManifestKind;
  readonly path: string;
  readonly warning: StackDetectionWarning;
}

export type ManifestReadResult =
  | { readonly status: 'absent' }
  | { readonly status: 'ok'; readonly read: ManifestRead }
  | { readonly status: 'unreadable'; readonly failure: ManifestReadFailure };

const MAX_MANIFEST_BYTES = 512 * 1024;
const MAX_TYPESCRIPT_SCAN_DEPTH = 4;
const MAX_TYPESCRIPT_SCAN_FILES = 200;

const SKIPPED_DIRS = new Set<string>([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'out',
  '.turbo',
  '.cache',
  '.parcel-cache',
  '.svelte-kit',
  '.nuxt',
  'target',
  'vendor',
  '__pycache__',
  '.venv',
  'venv',
  '.tox',
  '.pytest_cache',
  '.idea',
  '.vscode',
  'coverage',
  '.serverless',
  '.expo',
]);

export function buildManifest(
  rootPath: string,
  kind: StackManifestKind,
  relativePath: string,
): StackManifest {
  return {
    kind,
    path: normalizePath(joinPath(rootPath, relativePath)),
    relativePath: normalizePath(relativePath),
  };
}

export function buildAiTool(
  rootPath: string,
  kind: StackAiToolKind,
  relativePath: string,
): StackAiTool {
  return {
    kind,
    path: normalizePath(joinPath(rootPath, relativePath)),
    relativePath: normalizePath(relativePath),
  };
}

export async function readManifest(
  rootPath: string,
  kind: StackManifestKind,
  relativePath: string,
): Promise<ManifestReadResult> {
  const absolutePath = joinPath(rootPath, relativePath);
  const result: SafeFileReadResult = await safeReadFile(absolutePath, {
    maxBytes: MAX_MANIFEST_BYTES,
  });

  if (result.ok) {
    return {
      status: 'ok',
      read: {
        manifest: buildManifest(rootPath, kind, relativePath),
        content: result.content,
      },
    };
  }

  if (result.error.code === 'not_found' || result.error.code === 'not_file') {
    return { status: 'absent' };
  }

  return {
    status: 'unreadable',
    failure: {
      kind,
      path: normalizePath(absolutePath),
      warning: {
        code: 'unreadable_manifest',
        manifest: kind,
        path: normalizePath(absolutePath),
        message: `Could not read ${kind}: ${result.error.message}`,
      },
    },
  };
}

export async function pathExists(rootPath: string, relativePath: string): Promise<boolean> {
  try {
    await stat(joinPath(rootPath, relativePath));
    return true;
  } catch {
    return false;
  }
}

export async function isExistingFile(rootPath: string, relativePath: string): Promise<boolean> {
  try {
    const info = await stat(joinPath(rootPath, relativePath));
    return info.isFile();
  } catch {
    return false;
  }
}

export async function isExistingDirectory(
  rootPath: string,
  relativePath: string,
): Promise<boolean> {
  try {
    const info = await stat(joinPath(rootPath, relativePath));
    return info.isDirectory();
  } catch {
    return false;
  }
}

export function joinPath(rootPath: string, relativePath: string): string {
  if (isAbsolute(relativePath)) {
    return relativePath;
  }

  return join(rootPath, relativePath);
}

export function resolveRoot(rootPath: string): string {
  return resolve(rootPath);
}

export function makeMalformedWarning(
  kind: StackManifestKind,
  path: string,
  reason: string,
): StackDetectionWarning {
  return {
    code: 'malformed_manifest',
    manifest: kind,
    path: normalizePath(path),
    message: `Failed to parse ${kind}: ${reason}`,
  };
}

export interface TypeScriptScanResult {
  readonly found: boolean;
}

export async function scanForTypeScriptSources(rootPath: string): Promise<TypeScriptScanResult> {
  let filesSeen = 0;

  const found = await scanDir(rootPath, 0, () => {
    filesSeen += 1;
    return filesSeen >= MAX_TYPESCRIPT_SCAN_FILES;
  });

  return { found };
}

async function scanDir(
  dirPath: string,
  depth: number,
  onFileSeen: () => boolean,
): Promise<boolean> {
  if (depth > MAX_TYPESCRIPT_SCAN_DEPTH) {
    return false;
  }

  let entries;
  try {
    entries = await readdir(dirPath, { withFileTypes: true });
  } catch {
    return false;
  }

  for (const entry of entries) {
    const name = entry.name;

    if (entry.isDirectory()) {
      if (SKIPPED_DIRS.has(name) || name.startsWith('.')) {
        continue;
      }

      const found = await scanDir(joinPath(dirPath, name), depth + 1, onFileSeen);
      if (found) {
        return true;
      }

      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (name.endsWith('.d.ts')) {
      continue;
    }

    if (
      name.endsWith('.ts') ||
      name.endsWith('.tsx') ||
      name.endsWith('.mts') ||
      name.endsWith('.cts')
    ) {
      return true;
    }

    if (onFileSeen()) {
      return false;
    }
  }

  return false;
}

export function relativeFromRoot(rootPath: string, absolutePath: string): string {
  const normalizedRoot = normalizePath(rootPath);
  const normalizedAbsolute = normalizePath(absolutePath);
  const root = normalizedRoot.endsWith('/') ? normalizedRoot : `${normalizedRoot}/`;

  if (normalizedAbsolute.startsWith(root)) {
    return normalizedAbsolute.slice(root.length);
  }

  return normalizedAbsolute;
}

export function joinRelative(...parts: readonly string[]): string {
  return parts.filter((part) => part !== '').join('/');
}

export function pathSeparator(): string {
  return sep;
}
