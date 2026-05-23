import { deterministicId } from '@sherpa-labs/core-utils';
import type {
  RuleCodeBlock,
  RuleDirective,
  RuleDirectivePriority,
  RuleParseError,
  RuleSection,
  RuleSet,
} from '@sherpa-labs/shared-types';
import { parse as parseYaml } from 'yaml';
import { makeParseError, type ParseOptions } from './errors.js';
import { buildLocation, computeLineStarts } from './location.js';
import { buildRuleFile } from './markdown.js';

export function parseContinueConfig(content: string, options: ParseOptions = {}): RuleSet {
  const filePath = options.filePath;
  const parseErrors: RuleParseError[] = [];
  const lineStarts = computeLineStarts(content);

  let payload: unknown;

  try {
    payload = parseYaml(content);
  } catch (error) {
    parseErrors.push(
      makeParseError(`Invalid YAML in continue config: ${describeError(error)}`, 'error'),
    );
    payload = undefined;
  }

  const directives: RuleDirective[] = [];
  const codeBlocks: RuleCodeBlock[] = [];
  const sections: RuleSection[] = [];

  if (payload !== undefined && payload !== null) {
    const directiveTexts = extractContinueDirectives(payload);

    for (const text of directiveTexts) {
      directives.push({
        id: deterministicId({ kind: 'directive', path: filePath ?? '', text }),
        text,
        priority: detectPriority(text),
        location: buildLocation(filePath, 0, content.length, lineStarts),
      });
    }
  }

  sections.push({
    id: deterministicId({ kind: 'continue-config', path: filePath ?? '', len: content.length }),
    text: content,
    directives,
    codeBlocks,
    location: buildLocation(filePath, 0, content.length, lineStarts),
  });

  const file = buildRuleFile(content, 'continue-config', filePath);

  return {
    id: deterministicId({ kind: 'continue-config', path: file.path, len: content.length }),
    format: 'continue-config',
    files: [file],
    sections,
    directives,
    codeBlocks,
    parseErrors,
  };
}

function extractContinueDirectives(value: unknown): string[] {
  const out: string[] = [];

  if (value === null || typeof value !== 'object') {
    return out;
  }

  const obj = value as Record<string, unknown>;

  pushStrings(obj.systemMessage, out);
  pushStrings(obj.rules, out);
  pushStringsFromArrayOfObjects(obj.customCommands, ['prompt', 'description', 'name'], out);
  pushStringsFromArrayOfObjects(obj.slashCommands, ['prompt', 'description', 'name'], out);
  pushStringsFromArrayOfObjects(obj.contextProviders, ['description'], out);

  return out;
}

function pushStrings(value: unknown, out: string[]): void {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed !== '') {
      out.push(trimmed);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      pushStrings(entry, out);
    }
  }
}

function pushStringsFromArrayOfObjects(
  value: unknown,
  keys: readonly string[],
  out: string[],
): void {
  if (!Array.isArray(value)) {
    return;
  }

  for (const entry of value) {
    if (entry === null || typeof entry !== 'object') {
      continue;
    }

    const obj = entry as Record<string, unknown>;
    for (const key of keys) {
      pushStrings(obj[key], out);
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
