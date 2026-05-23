import type { AuditRule } from '../types.js';
import {
  extractDirectiveFacts,
  findContradictionPairs,
  formatFilePath,
  locationInput,
  shorten,
} from './helpers.js';

export const CROSS_FILE_CONTRADICTIONS_RULE_ID = 'heuristic.cross-file-contradictions';

export const crossFileContradictionsRule: AuditRule = {
  id: CROSS_FILE_CONTRADICTIONS_RULE_ID,
  severity: 'error',
  title: 'Rule files do not contradict each other',
  description: 'Detects direct directive conflicts across different rule files.',
  check(context) {
    const facts = extractDirectiveFacts(context.ruleSet.directives);
    const pairs = findContradictionPairs(facts, 'cross-file');

    return pairs.map((pair) => ({
      message: `${formatFilePath(pair.positive.filePath)} requires "${pair.concept}" via "${shorten(pair.positive.clause)}", but ${formatFilePath(pair.negative.filePath)} forbids it via "${shorten(pair.negative.clause)}".`,
      category: 'conflict' as const,
      ...locationInput(pair.negative.location ?? pair.positive.location),
      fixHint: `Make the policy for "${pair.concept}" consistent across both files.`,
    }));
  },
};
