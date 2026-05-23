import type { RuleSet } from '@sherpa-labs/shared-types';
import type { ParseOptions } from './errors.js';
import { parseMarkdownContent } from './markdown.js';

export type { ParseOptions } from './errors.js';
export { RuleParseRuntimeError, makeParseError } from './errors.js';
export {
  detectFormat,
  detectFormatFromContent,
  detectFormatFromPath,
  type DetectFormatInput,
} from './detect-format.js';
export {
  buildLocation,
  computeLineStarts,
  offsetToLineColumn,
  type LineColumn,
} from './location.js';
export { parseMarkdownContent } from './markdown.js';
export { parseCursorRules } from './cursor-rules.js';
export { parseContinueConfig } from './continue-config.js';
export { parseRulesDirectory, type ParseRulesDirectoryOptions } from './rules-directory.js';
export {
  normalizeForRoundTrip,
  roundTripEquals,
  serializeRuleSet,
  serializeRuleSetByFile,
  type SerializedFile,
} from './serialize.js';

export function parseClaudeMd(content: string, options: ParseOptions = {}): RuleSet {
  return parseMarkdownContent(content, 'claude-md', options);
}

export function parseAgentsMd(content: string, options: ParseOptions = {}): RuleSet {
  return parseMarkdownContent(content, 'agents-md', options);
}

export function parseWindsurfRules(content: string, options: ParseOptions = {}): RuleSet {
  return parseMarkdownContent(content, 'windsurf-rules', options);
}
