import type { RuleSection } from '@sherpa-labs/shared-types';
import type { AuditRule } from '../types.js';
import {
  formatFilePath,
  getRuleThreshold,
  normalizedSectionText,
  sectionContentHash,
  sectionFilePath,
  sectionLabel,
  sectionTokenCount,
  trigramSimilarity,
} from './helpers.js';

export const DUPLICATE_SECTIONS_RULE_ID = 'heuristic.duplicate-sections';
const DEFAULT_MIN_DUPLICATE_SECTION_TOKENS = 45;
const DEFAULT_NEAR_DUPLICATE_SIMILARITY = 0.92;

export const duplicateSectionsRule: AuditRule = {
  id: DUPLICATE_SECTIONS_RULE_ID,
  severity: 'warning',
  title: 'Sections are not duplicated across rule files',
  description: 'Detects exact and near-exact duplicate sections across different rule files.',
  check(context) {
    const minTokens = getRuleThreshold(
      context,
      DUPLICATE_SECTIONS_RULE_ID,
      'minSectionTokens',
      DEFAULT_MIN_DUPLICATE_SECTION_TOKENS,
    );
    const similarityThreshold = getRuleThreshold(
      context,
      DUPLICATE_SECTIONS_RULE_ID,
      'similarity',
      DEFAULT_NEAR_DUPLICATE_SIMILARITY,
    );
    const candidates = context.ruleSet.sections.filter(
      (section) =>
        sectionTokenCount(section) >= minTokens && sectionFilePath(section) !== undefined,
    );
    const duplicatePairs = findDuplicatePairs(candidates, similarityThreshold);

    return duplicatePairs.map(([left, right]) => ({
      message: `Section "${sectionLabel(right)}" in ${formatFilePath(sectionFilePath(right))} duplicates "${sectionLabel(left)}" in ${formatFilePath(sectionFilePath(left))}.`,
      category: 'duplication' as const,
      ...(right.location !== undefined ? { location: right.location } : {}),
      fixHint:
        'Keep the shared guidance in one canonical file or replace the duplicate with a short cross-reference.',
    }));
  },
};

function findDuplicatePairs(
  sections: readonly RuleSection[],
  similarityThreshold: number,
): readonly (readonly [RuleSection, RuleSection])[] {
  const pairs: [RuleSection, RuleSection][] = [];
  const exactSeen = new Map<string, RuleSection>();
  const pairedKeys = new Set<string>();

  for (const section of sections) {
    const hash = sectionContentHash(section);
    const existing = exactSeen.get(hash);

    if (existing !== undefined && sectionFilePath(existing) !== sectionFilePath(section)) {
      pairs.push([existing, section]);
      pairedKeys.add(pairKey(existing, section));
      continue;
    }

    exactSeen.set(hash, section);
  }

  for (let leftIndex = 0; leftIndex < sections.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < sections.length; rightIndex += 1) {
      const left = sections[leftIndex];
      const right = sections[rightIndex];

      if (
        left === undefined ||
        right === undefined ||
        sectionFilePath(left) === sectionFilePath(right) ||
        pairedKeys.has(pairKey(left, right))
      ) {
        continue;
      }

      const similarity = trigramSimilarity(
        normalizedSectionText(left),
        normalizedSectionText(right),
      );

      if (similarity >= similarityThreshold) {
        pairs.push([left, right]);
        pairedKeys.add(pairKey(left, right));
      }
    }
  }

  return pairs;
}

function pairKey(left: RuleSection, right: RuleSection): string {
  return [left.id, right.id].sort().join(':');
}
