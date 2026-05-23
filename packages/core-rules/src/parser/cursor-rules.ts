import { deterministicId } from '@sherpa-labs/core-utils';
import type {
  RuleCodeBlock,
  RuleDirective,
  RuleDirectivePriority,
  RuleParseError,
  RuleSection,
  RuleSet,
} from '@sherpa-labs/shared-types';
import { makeParseError, type ParseOptions } from './errors.js';
import { computeLineStarts, buildLocation } from './location.js';
import { parseMarkdownContent, buildRuleFile } from './markdown.js';

interface JsonShapeCandidate {
  readonly version?: unknown;
  readonly rules?: unknown;
  readonly globs?: unknown;
  readonly description?: unknown;
  readonly name?: unknown;
}

export function parseCursorRules(content: string, options: ParseOptions = {}): RuleSet {
  const trimmed = content.trimStart();

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const jsonResult = tryParseJsonCursorRules(content, options);
    if (jsonResult !== undefined) {
      return jsonResult;
    }
  }

  return parseMarkdownContent(content, 'cursor-rules', options);
}

function tryParseJsonCursorRules(content: string, options: ParseOptions): RuleSet | undefined {
  const filePath = options.filePath;
  const parseErrors: RuleParseError[] = [];

  let payload: unknown;

  try {
    payload = JSON.parse(content);
  } catch (error) {
    parseErrors.push(
      makeParseError(`Invalid JSON in .cursorrules: ${describeError(error)}`, 'error'),
    );

    return buildEmptyJsonRuleSet(content, filePath, parseErrors);
  }

  const lineStarts = computeLineStarts(content);
  const directives: RuleDirective[] = [];
  const codeBlocks: RuleCodeBlock[] = [];
  const sections: RuleSection[] = [];

  const directiveTexts = extractDirectiveStrings(payload);

  for (const text of directiveTexts) {
    if (text === '') {
      continue;
    }

    directives.push({
      id: deterministicId({ kind: 'directive', path: filePath ?? '', text }),
      text,
      priority: detectPriority(text),
      location: buildLocation(filePath, 0, content.length, lineStarts),
    });
  }

  sections.push({
    id: deterministicId({ kind: 'cursor-json', path: filePath ?? '', len: content.length }),
    text: content,
    directives,
    codeBlocks,
    location: buildLocation(filePath, 0, content.length, lineStarts),
  });

  const file = buildRuleFile(content, 'cursor-rules', filePath);

  return {
    id: deterministicId({ kind: 'cursor-rules', path: file.path, len: content.length }),
    format: 'cursor-rules',
    files: [file],
    sections,
    directives,
    codeBlocks,
    parseErrors,
  };
}

function buildEmptyJsonRuleSet(
  content: string,
  filePath: string | undefined,
  parseErrors: readonly RuleParseError[],
): RuleSet {
  const file = buildRuleFile(content, 'cursor-rules', filePath);
  const lineStarts = computeLineStarts(content);

  return {
    id: deterministicId({
      kind: 'cursor-rules',
      path: file.path,
      len: content.length,
      invalid: true,
    }),
    format: 'cursor-rules',
    files: [file],
    sections: [
      {
        id: deterministicId({ kind: 'cursor-json', path: file.path, invalid: true }),
        text: content,
        directives: [],
        codeBlocks: [],
        location: buildLocation(filePath, 0, content.length, lineStarts),
      },
    ],
    directives: [],
    codeBlocks: [],
    parseErrors,
  };
}

function extractDirectiveStrings(value: unknown): string[] {
  const out: string[] = [];
  collectStrings(value, out);
  return out;
}

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed !== '') {
      out.push(trimmed);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      collectStrings(entry, out);
    }
    return;
  }

  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown> & JsonShapeCandidate;

    for (const key of [
      'rule',
      'rules',
      'content',
      'description',
      'prompt',
      'instructions',
      'message',
    ]) {
      if (key in obj) {
        collectStrings(obj[key], out);
      }
    }
  }
}

function detectPriority(text: string): RuleDirectivePriority {
  const upper = text.toUpperCase();

  if (
    /\bMUST NOT\b|\bMUST\b|\bREQUIRED\b|\bSHALL NOT\b|\bSHALL\b|\bDO NOT\b|\bDON'?T\b|\bNEVER\b|\bALWAYS\b|\bIMPORTANT\b/.test(
      upper,
    )
  ) {
    return 'must';
  }

  if (/\bSHOULD NOT\b|\bSHOULD\b|\bRECOMMENDED\b|\bPREFER\b|\bAVOID\b/.test(upper)) {
    return 'should';
  }

  if (/\bMAY\b|\bOPTIONAL\b|\bCAN\b|\bMIGHT\b/.test(upper)) {
    return 'may';
  }

  return 'unknown';
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
