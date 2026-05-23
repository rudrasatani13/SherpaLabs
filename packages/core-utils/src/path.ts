import { posix } from 'node:path';
import process from 'node:process';

export interface SplitNormalizedPath {
  root: string;
  rest: string;
}

export function normalizePath(inputPath: string): string {
  const slashedPath = inputPath.replace(/\\/g, '/');
  const hasUncRoot = slashedPath.startsWith('//') && !slashedPath.startsWith('///');
  const normalizedPath = posix.normalize(slashedPath);
  const restoredPath = hasUncRoot ? `//${normalizedPath.replace(/^\/+/, '')}` : normalizedPath;

  return normalizeDriveLetter(restoredPath);
}

export function isAbsolutePath(inputPath: string): boolean {
  const slashedPath = inputPath.replace(/\\/g, '/');

  return slashedPath.startsWith('/') || /^[a-zA-Z]:\//.test(slashedPath);
}

export function toRelativeDisplayPath(targetPath: string, basePath = process.cwd()): string {
  const normalizedTarget = normalizePath(targetPath);

  if (!isAbsolutePath(normalizedTarget)) {
    return normalizedTarget;
  }

  const normalizedBase = normalizePath(basePath);

  if (!isAbsolutePath(normalizedBase)) {
    return normalizedTarget;
  }

  const targetParts = splitNormalizedPath(normalizedTarget);
  const baseParts = splitNormalizedPath(normalizedBase);

  if (targetParts.root !== baseParts.root) {
    return normalizedTarget;
  }

  const relativePath = posix.relative(
    toComparablePath(baseParts.rest),
    toComparablePath(targetParts.rest),
  );

  return relativePath === '' ? '.' : relativePath;
}

export function splitNormalizedPath(inputPath: string): SplitNormalizedPath {
  const normalizedPath = normalizePath(inputPath);
  const uncMatch = /^\/\/([^/]+)(?:\/([^/]+))?/.exec(normalizedPath);

  if (uncMatch != null) {
    const host = uncMatch[1];
    const share = uncMatch[2];

    if (host != null && share != null) {
      const root = `//${host}/${share}`;
      const rest = normalizedPath.slice(root.length).replace(/^\/+/, '');

      return { root: root.toLowerCase(), rest };
    }

    return { root: normalizedPath.toLowerCase(), rest: '' };
  }

  const driveMatch = /^([a-zA-Z]):(?:\/|$)/.exec(normalizedPath);

  if (driveMatch?.[1] != null) {
    const root = `${driveMatch[1].toLowerCase()}:/`;
    const rest = normalizedPath.slice(root.length).replace(/^\/+/, '');

    return { root, rest };
  }

  if (normalizedPath.startsWith('/')) {
    return { root: '/', rest: normalizedPath.replace(/^\/+/, '') };
  }

  return { root: '', rest: normalizedPath };
}

function normalizeDriveLetter(inputPath: string): string {
  return inputPath.replace(/^([a-zA-Z]):/, (match) => match.toLowerCase());
}

function toComparablePath(rest: string): string {
  return rest === '' ? '/' : `/${rest}`;
}
