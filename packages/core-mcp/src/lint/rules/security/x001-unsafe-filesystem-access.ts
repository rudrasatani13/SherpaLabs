import { isAbsolutePath, normalizePath } from '@sherpa-labs/core-utils';

import type {
  LintFilesystemAccessObservation,
  LintResourceObservation,
  LintRule,
  LintRuleViolationInput,
} from '../../types.js';
import { createViolation, truncateEvidence } from '../helpers.js';

export const X001_UNSAFE_FILESYSTEM_ACCESS_RULE_ID = 'X001';

export const x001UnsafeFilesystemAccessRule: LintRule = {
  id: X001_UNSAFE_FILESYSTEM_ACCESS_RULE_ID,
  category: 'security',
  severity: 'error',
  title: 'Filesystem access stays within declared roots',
  description: 'Flags traversal, null-byte paths, and file resources outside allowed roots.',
  check(context) {
    const violations: LintRuleViolationInput[] = [];
    const allowedRoots = context.metadata.allowedRoots ?? [];

    (context.metadata.filesystemAccess ?? []).forEach((access, index) => {
      violations.push(
        ...validateAccess(access, allowedRoots, `metadata.filesystemAccess[${index}]`),
      );
    });

    context.resources.forEach((resource, index) => {
      violations.push(...validateResource(resource, allowedRoots, `resources[${index}]`));
    });

    return violations;
  },
};

function validateAccess(
  access: LintFilesystemAccessObservation,
  allowedRoots: readonly string[],
  path: string,
): readonly LintRuleViolationInput[] {
  const violations: LintRuleViolationInput[] = [];
  const unsafeInput = containsNullByte(access.path) || containsTraversal(access.path);

  if (unsafeInput && access.outcome !== 'rejected') {
    violations.push(
      createViolation({
        message: `Filesystem access accepted unsafe path ${access.path}.`,
        location: `${path}.path`,
        evidence: truncateEvidence(access.reason ?? access.path),
        fixHint: 'Reject traversal and null-byte paths before resolving filesystem access.',
      }),
    );
  }

  const roots = access.allowedRoot !== undefined ? [access.allowedRoot] : allowedRoots;
  if (access.outcome === 'allowed' && access.resolvedPath !== undefined && roots.length > 0) {
    if (!isPathInsideAnyRoot(access.resolvedPath, roots)) {
      violations.push(
        createViolation({
          message: `Filesystem access resolved outside allowed roots: ${access.resolvedPath}.`,
          location: `${path}.resolvedPath`,
          evidence: roots.join(', '),
          fixHint:
            'Resolve real paths and reject symlinks or traversals that escape allowed roots.',
        }),
      );
    }
  }

  return violations;
}

function validateResource(
  resource: LintResourceObservation,
  allowedRoots: readonly string[],
  path: string,
): readonly LintRuleViolationInput[] {
  if (!resource.uri?.startsWith('file://')) {
    return [];
  }

  const filePath = filePathFromUri(resource.uri);
  const violations: LintRuleViolationInput[] = [];

  if (filePath === undefined) {
    return [
      createViolation({
        message: `Resource URI ${resource.uri} is not a valid file URI.`,
        location: `${path}.uri`,
        fixHint: 'Expose valid RFC 3986 file URIs for filesystem resources.',
      }),
    ];
  }

  if (containsTraversal(filePath)) {
    violations.push(
      createViolation({
        message: `Resource URI contains path traversal: ${resource.uri}.`,
        location: `${path}.uri`,
        fixHint: 'Normalize resource URIs and never expose ../ traversal segments.',
      }),
    );
  }

  if (
    allowedRoots.length > 0 &&
    isAbsolutePath(filePath) &&
    !isPathInsideAnyRoot(filePath, allowedRoots)
  ) {
    violations.push(
      createViolation({
        message: `File resource ${resource.uri} is outside allowed roots.`,
        location: `${path}.uri`,
        evidence: allowedRoots.join(', '),
        fixHint: 'Only list file resources under configured MCP roots or allowed directories.',
      }),
    );
  }

  return violations;
}

function containsNullByte(value: string): boolean {
  return value.includes('\0') || value.toLowerCase().includes('%00');
}

function containsTraversal(value: string): boolean {
  const decoded = decodePath(value).replace(/\\/g, '/');

  return decoded.split('/').includes('..');
}

function isPathInsideAnyRoot(path: string, roots: readonly string[]): boolean {
  const normalizedPath = normalizePath(path);

  return roots.some((root) => {
    const normalizedRoot = normalizePath(root).replace(/\/$/, '');

    return normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot}/`);
  });
}

function filePathFromUri(uri: string): string | undefined {
  try {
    const parsed = new URL(uri);

    return decodePath(parsed.pathname);
  } catch {
    return undefined;
  }
}

function decodePath(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
