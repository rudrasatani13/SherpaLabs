import { countApproximateTokens, deterministicHash } from '@sherpa-labs/core-utils';
import type { RuleDirective, RuleFile, RuleLocation, RuleSection } from '@sherpa-labs/shared-types';
import { buildLocation, computeLineStarts } from '../../parser/location.js';
import type { AuditContext } from '../types.js';

export type DirectivePolarity = 'positive' | 'negative';

export interface DirectiveFact {
  readonly polarity: DirectivePolarity;
  readonly concept: string;
  readonly clause: string;
  readonly directive: RuleDirective;
  readonly filePath?: string;
  readonly location?: RuleLocation;
}

export interface ContradictionPair {
  readonly concept: string;
  readonly positive: DirectiveFact;
  readonly negative: DirectiveFact;
}

export interface TextMatch {
  readonly file: RuleFile;
  readonly value: string;
  readonly location: RuleLocation;
}

export const PRIORITY_SIGNAL_PATTERN =
  /\b(?:MUST(?:\s+NOT)?|SHOULD(?:\s+NOT)?|MAY|DO\s+NOT|DON'T|NEVER|ALWAYS|REQUIRED|SHALL(?:\s+NOT)?)\b/i;

const NEGATIVE_SIGNAL_PATTERN =
  /\b(?:must\s+not|shall\s+not|should\s+not|do\s+not|don't|dont|never|forbid(?:s|den)?|disallow|prohibit(?:s)?|avoid)\b/i;

const POSITIVE_SIGNAL_PATTERN =
  /\b(?:always|must|shall|required(?:\s+to)?|require(?:s|d)?|use|allow(?:s|ed)?|prefer|enforce)\b/i;

const LEADING_CONCEPT_WORD_PATTERN =
  /^(?:please\s+)?(?:you\s+)?(?:must\s+not|shall\s+not|should\s+not|do\s+not|don't|dont|must|shall|should|may|can|always|never|required\s+to|recommended\s+to|required|require(?:s|d)?|use|allow(?:s|ed)?|forbid(?:s|den)?|avoid|prefer|enforce|disallow|prohibit(?:s)?|write|run|add|create|keep|make|enable|disable)\s+/i;

const NON_ACTIONABLE_VAGUE_PATTERN =
  /\b(?:write good code|make it better|be smart|do the right thing|use best practices|make it nice)\b/i;

export function getRuleThreshold(
  context: AuditContext,
  ruleId: string,
  key: string,
  fallback: number,
): number {
  const override = context.config.ruleOverrides[ruleId]?.thresholds?.[key];

  if (typeof override === 'number' && Number.isFinite(override) && override > 0) {
    return override;
  }

  return fallback;
}

export function fileOnlyLocation(filePath: string | undefined): RuleLocation | undefined {
  return filePath === undefined || filePath === '' ? undefined : { filePath };
}

export function locationInput(location: RuleLocation | undefined): {
  readonly location?: RuleLocation;
} {
  return location === undefined ? {} : { location };
}

export function formatFilePath(filePath: string | undefined): string {
  return filePath === undefined || filePath === '' ? 'rule file' : filePath;
}

export function shorten(value: string, maxLength = 96): string {
  const collapsed = collapseWhitespace(value);

  if (collapsed.length <= maxLength) {
    return collapsed;
  }

  return `${collapsed.slice(0, maxLength - 1).trimEnd()}...`;
}

export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function splitDirectiveClauses(text: string): readonly string[] {
  return stripInlineMarkdown(text)
    .split(/(?:[;!?]\s+|\.\s+|\n+)/)
    .map((clause) => collapseWhitespace(clause.replace(/[.;!?]+$/u, '')))
    .filter((clause) => clause !== '');
}

export function stripInlineMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/gu, ' ')
    .replace(/`+([^`]+)`+/gu, '$1')
    .replace(/\*\*([^*]+)\*\*/gu, '$1')
    .replace(/__([^_]+)__/gu, '$1')
    .replace(/\*([^*\n]+)\*/gu, '$1')
    .replace(/(?<!\w)_([^_\n]+)_(?!\w)/gu, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/gu, '$1');
}

export function isActionableDirectiveText(text: string): boolean {
  if (NON_ACTIONABLE_VAGUE_PATTERN.test(text)) {
    return false;
  }

  return (
    PRIORITY_SIGNAL_PATTERN.test(text) ||
    /\b(?:use|avoid|require|forbid|run|test|lint|format|document|review|update|create|add|remove|prefer|keep|validate|enforce)\b/i.test(
      text,
    )
  );
}

export function extractDirectiveFacts(
  directives: readonly RuleDirective[],
): readonly DirectiveFact[] {
  const facts: DirectiveFact[] = [];

  for (const directive of directives) {
    for (const clause of splitDirectiveClauses(directive.text)) {
      const polarity = detectPolarity(clause);
      const concept = normalizeConcept(clause);

      if (polarity === undefined || concept === undefined) {
        continue;
      }

      facts.push({
        polarity,
        concept,
        clause,
        directive,
        ...(directive.location?.filePath !== undefined
          ? { filePath: directive.location.filePath }
          : {}),
        ...(directive.location !== undefined ? { location: directive.location } : {}),
      });
    }
  }

  return facts;
}

export function findContradictionPairs(
  facts: readonly DirectiveFact[],
  scope: 'same-file' | 'cross-file',
): readonly ContradictionPair[] {
  const byConcept = new Map<string, DirectiveFact[]>();

  for (const fact of facts) {
    const existing = byConcept.get(fact.concept) ?? [];
    existing.push(fact);
    byConcept.set(fact.concept, existing);
  }

  const pairs: ContradictionPair[] = [];
  const seen = new Set<string>();

  for (const [concept, conceptFacts] of byConcept) {
    const positives = conceptFacts.filter((fact) => fact.polarity === 'positive');
    const negatives = conceptFacts.filter((fact) => fact.polarity === 'negative');

    for (const positive of positives) {
      for (const negative of negatives) {
        if (!isInScope(positive, negative, scope)) {
          continue;
        }

        const key = [
          concept,
          positive.filePath ?? '',
          positive.location?.startLine ?? 0,
          negative.filePath ?? '',
          negative.location?.startLine ?? 0,
        ].join(':');

        if (seen.has(key)) {
          continue;
        }

        seen.add(key);
        pairs.push({ concept, positive, negative });
      }
    }
  }

  return pairs.sort((left, right) => {
    const leftFile = left.negative.filePath ?? left.positive.filePath ?? '';
    const rightFile = right.negative.filePath ?? right.positive.filePath ?? '';
    const fileCompare = leftFile.localeCompare(rightFile);

    if (fileCompare !== 0) {
      return fileCompare;
    }

    return (
      (left.negative.location?.startLine ?? left.positive.location?.startLine ?? 0) -
      (right.negative.location?.startLine ?? right.positive.location?.startLine ?? 0)
    );
  });
}

export function locationToOffset(content: string, location: RuleLocation | undefined): number {
  if (location?.startLine === undefined || location.startColumn === undefined) {
    return 0;
  }

  const lineStarts = computeLineStarts(content);
  const lineIndex = Math.max(0, Math.min(location.startLine - 1, lineStarts.length - 1));
  const lineStart = lineStarts[lineIndex] ?? 0;

  return Math.max(0, Math.min(content.length, lineStart + location.startColumn - 1));
}

export function locationForTextRange(
  file: RuleFile,
  startOffset: number,
  endOffset: number,
): RuleLocation {
  return buildLocation(file.path, startOffset, endOffset, computeLineStarts(file.content));
}

export function findTextMatches(files: readonly RuleFile[], pattern: RegExp): readonly TextMatch[] {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const regex = new RegExp(pattern.source, flags);
  const matches: TextMatch[] = [];

  for (const file of files) {
    regex.lastIndex = 0;

    for (const match of file.content.matchAll(regex)) {
      if (match.index === undefined || match[0] === '') {
        continue;
      }

      matches.push({
        file,
        value: match[0],
        location: locationForTextRange(file, match.index, match.index + match[0].length),
      });
    }
  }

  return matches;
}

export function normalizedSectionText(section: RuleSection): string {
  return collapseWhitespace(
    stripInlineMarkdown(section.text)
      .toLowerCase()
      .replace(/^#{1,6}\s+/gmu, '')
      .replace(/[^\p{L}\p{N}_./@#:+-]+/gu, ' '),
  );
}

export function sectionContentHash(section: RuleSection): string {
  return deterministicHash(normalizedSectionText(section));
}

export function sectionTokenCount(section: RuleSection): number {
  return countApproximateTokens(section.text);
}

export function sectionFilePath(section: RuleSection): string | undefined {
  return section.location?.filePath;
}

export function sectionLabel(section: RuleSection): string {
  return section.heading?.text ?? `section starting at line ${section.location?.startLine ?? 1}`;
}

export function trigramSimilarity(left: string, right: string): number {
  const leftTrigrams = wordTrigrams(left);
  const rightTrigrams = wordTrigrams(right);

  if (leftTrigrams.size === 0 || rightTrigrams.size === 0) {
    return 0;
  }

  let intersection = 0;

  for (const trigram of leftTrigrams) {
    if (rightTrigrams.has(trigram)) {
      intersection += 1;
    }
  }

  return intersection / (leftTrigrams.size + rightTrigrams.size - intersection);
}

export function median(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle] ?? 0;
  }

  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function detectPolarity(clause: string): DirectivePolarity | undefined {
  if (NEGATIVE_SIGNAL_PATTERN.test(clause)) {
    return 'negative';
  }

  if (POSITIVE_SIGNAL_PATTERN.test(clause)) {
    return 'positive';
  }

  return undefined;
}

function normalizeConcept(clause: string): string | undefined {
  let normalized = stripInlineMarkdown(clause)
    .toLowerCase()
    .replace(/['"]/gu, '')
    .replace(/[^\p{L}\p{N}_./@#:+-]+/gu, ' ')
    .trim();

  for (let index = 0; index < 6; index += 1) {
    const next = normalized.replace(LEADING_CONCEPT_WORD_PATTERN, '').trim();

    if (next === normalized) {
      break;
    }

    normalized = next;
  }

  normalized = normalized
    .replace(/^(?:the|a|an|any)\s+/iu, '')
    .replace(/\s+(?:in|for)\s+(?:this\s+)?(?:repo|repository|project|codebase)$/iu, '')
    .replace(/[.:;,!?]+$/u, '')
    .trim();

  const words = normalized.split(/\s+/u).filter(Boolean);

  if (
    words.length === 0 ||
    words.length > 10 ||
    ['it', 'this', 'that', 'best practices', 'good code', 'right thing'].includes(normalized)
  ) {
    return undefined;
  }

  return words.join(' ');
}

function isInScope(
  positive: DirectiveFact,
  negative: DirectiveFact,
  scope: 'same-file' | 'cross-file',
): boolean {
  const positivePath = positive.filePath ?? '';
  const negativePath = negative.filePath ?? '';

  if (scope === 'same-file') {
    return positivePath === negativePath;
  }

  return positivePath !== negativePath;
}

function wordTrigrams(value: string): Set<string> {
  const words = value.split(/\s+/u).filter(Boolean);
  const trigrams = new Set<string>();

  if (words.length < 3) {
    return trigrams;
  }

  for (let index = 0; index <= words.length - 3; index += 1) {
    trigrams.add(words.slice(index, index + 3).join(' '));
  }

  return trigrams;
}
