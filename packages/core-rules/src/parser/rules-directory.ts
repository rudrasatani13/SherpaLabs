import { stat } from 'node:fs/promises';
import { posix } from 'node:path';
import { deterministicId, safeReadFile } from '@sherpa-labs/core-utils';
import type {
  RuleCodeBlock,
  RuleDirective,
  RuleFile,
  RuleParseError,
  RuleSection,
  RuleSet,
} from '@sherpa-labs/shared-types';
import fg from 'fast-glob';
import { makeParseError, type ParseOptions } from './errors.js';
import { parseMarkdownContent } from './markdown.js';

export interface ParseRulesDirectoryOptions extends ParseOptions {
  readonly pattern?: string | readonly string[];
  readonly maxBytes?: number;
}

export async function parseRulesDirectory(
  rootPath: string,
  options: ParseRulesDirectoryOptions = {},
): Promise<RuleSet> {
  const parseErrors: RuleParseError[] = [];
  const files: RuleFile[] = [];
  const sections: RuleSection[] = [];
  const directives: RuleDirective[] = [];
  const codeBlocks: RuleCodeBlock[] = [];

  const searchRoot = await resolveSearchRoot(rootPath, parseErrors);

  if (searchRoot === undefined) {
    return buildEmptyDirectoryRuleSet(rootPath, parseErrors);
  }

  const pattern = options.pattern ?? '**/*.md';

  let matchedPaths: string[];

  try {
    matchedPaths = await fg(pattern as string | string[], {
      cwd: searchRoot,
      absolute: true,
      onlyFiles: true,
      dot: true,
      followSymbolicLinks: false,
    });
  } catch (error) {
    parseErrors.push(
      makeParseError(`Failed to enumerate rules directory: ${describeError(error)}`, 'error'),
    );
    matchedPaths = [];
  }

  matchedPaths.sort();

  for (const filePath of matchedPaths) {
    const normalized = filePath.replace(/\\/g, '/');
    const readOptions = options.maxBytes !== undefined ? { maxBytes: options.maxBytes } : {};
    const readResult = await safeReadFile(normalized, readOptions);

    if (!readResult.ok) {
      parseErrors.push(
        makeParseError(
          `Could not read ${normalized}: ${readResult.error.code} — ${readResult.error.message}`,
          'warning',
          { filePath: normalized },
        ),
      );
      continue;
    }

    const ruleSet = parseMarkdownContent(readResult.content, 'cursor-rule', {
      filePath: normalized,
    });

    files.push(...ruleSet.files);
    sections.push(...ruleSet.sections);
    directives.push(...ruleSet.directives);
    codeBlocks.push(...ruleSet.codeBlocks);
    parseErrors.push(...ruleSet.parseErrors);
  }

  return {
    id: deterministicId({ kind: 'rules-directory', path: searchRoot, files: files.length }),
    format: 'cursor-rule',
    files,
    sections,
    directives,
    codeBlocks,
    parseErrors,
  };
}

async function resolveSearchRoot(
  rootPath: string,
  parseErrors: RuleParseError[],
): Promise<string | undefined> {
  const normalized = rootPath.replace(/\\/g, '/').replace(/\/+$/, '');

  try {
    const rootStat = await stat(normalized);
    if (!rootStat.isDirectory()) {
      parseErrors.push(
        makeParseError(`Path is not a directory: ${normalized}`, 'error', { filePath: normalized }),
      );
      return undefined;
    }
  } catch (error) {
    parseErrors.push(
      makeParseError(`Cannot access directory ${normalized}: ${describeError(error)}`, 'error', {
        filePath: normalized,
      }),
    );
    return undefined;
  }

  if (normalized.endsWith('/.cursor/rules') || normalized === '.cursor/rules') {
    return normalized;
  }

  const candidate = posix.join(normalized, '.cursor/rules');

  try {
    const candidateStat = await stat(candidate);
    if (candidateStat.isDirectory()) {
      return candidate;
    }
  } catch {
    // Fall through — caller may have pointed at a custom directory of markdown files.
  }

  return normalized;
}

function buildEmptyDirectoryRuleSet(
  rootPath: string,
  parseErrors: readonly RuleParseError[],
): RuleSet {
  return {
    id: deterministicId({ kind: 'rules-directory', path: rootPath, empty: true }),
    format: 'cursor-rule',
    files: [],
    sections: [],
    directives: [],
    codeBlocks: [],
    parseErrors,
  };
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
