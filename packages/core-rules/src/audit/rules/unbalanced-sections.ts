import type { AuditRule } from '../types.js';
import {
  formatFilePath,
  getRuleThreshold,
  median,
  sectionFilePath,
  sectionLabel,
  sectionTokenCount,
} from './helpers.js';

export const UNBALANCED_SECTIONS_RULE_ID = 'heuristic.unbalanced-sections';
const DEFAULT_MAX_SECTION_IMBALANCE_RATIO = 4;
const DEFAULT_MIN_LONG_SECTION_TOKENS = 180;

export const unbalancedSectionsRule: AuditRule = {
  id: UNBALANCED_SECTIONS_RULE_ID,
  severity: 'warning',
  title: 'Sections have balanced detail',
  description: 'Flags one section that is significantly longer than peer sections.',
  check(context) {
    const maxRatio = getRuleThreshold(
      context,
      UNBALANCED_SECTIONS_RULE_ID,
      'maxImbalanceRatio',
      DEFAULT_MAX_SECTION_IMBALANCE_RATIO,
    );
    const minLongSectionTokens = getRuleThreshold(
      context,
      UNBALANCED_SECTIONS_RULE_ID,
      'minLongSectionTokens',
      DEFAULT_MIN_LONG_SECTION_TOKENS,
    );

    return Array.from(new Set(context.ruleSet.files.map((file) => file.path))).flatMap(
      (filePath) => {
        const sections = context.ruleSet.sections.filter(
          (section) => (sectionFilePath(section) ?? '') === filePath,
        );

        if (sections.length < 3) {
          return [];
        }

        const ranked = sections
          .map((section) => ({ section, tokens: sectionTokenCount(section) }))
          .filter((entry) => entry.tokens > 0)
          .sort((left, right) => right.tokens - left.tokens);
        const longest = ranked[0];

        if (longest === undefined) {
          return [];
        }

        const peerMedian = median(ranked.slice(1).map((entry) => entry.tokens));
        const ratio = peerMedian === 0 ? Number.POSITIVE_INFINITY : longest.tokens / peerMedian;

        if (longest.tokens < minLongSectionTokens || ratio < maxRatio) {
          return [];
        }

        return [
          {
            message: `Section "${sectionLabel(longest.section)}" in ${formatFilePath(filePath)} is ${longest.tokens} tokens, ${ratio.toFixed(1)}x longer than the median peer section.`,
            category: 'structure' as const,
            ...(longest.section.location !== undefined
              ? { location: longest.section.location }
              : {}),
            fixHint:
              'Split the oversized section into smaller focused sections or move deep background into a referenced document.',
          },
        ];
      },
    );
  },
};
