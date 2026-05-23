import type { AuditRule } from '../types.js';
import {
  extractDirectiveFacts,
  findContradictionPairs,
  formatFilePath,
  locationInput,
  shorten,
} from './helpers.js';

export const CONFLICTING_DIRECTIVES_RULE_ID = 'heuristic.conflicting-directives';

export const conflictingDirectivesRule: AuditRule = {
  id: CONFLICTING_DIRECTIVES_RULE_ID,
  severity: 'error',
  title: 'Directives do not contradict each other within a file',
  description: 'Detects direct always/never, must/must-not, allow/forbid directive conflicts.',
  check(context) {
    const facts = extractDirectiveFacts(context.ruleSet.directives);
    const pairs = findContradictionPairs(facts, 'same-file');

    return pairs.map((pair) => ({
      message: `${formatFilePath(pair.negative.filePath)} contains contradictory directives for "${pair.concept}": "${shorten(pair.positive.clause)}" conflicts with "${shorten(pair.negative.clause)}".`,
      category: 'conflict' as const,
      ...locationInput(pair.negative.location ?? pair.positive.location),
      fixHint: `Choose one policy for "${pair.concept}" and remove or rewrite the opposing directive.`,
    }));
  },
};
