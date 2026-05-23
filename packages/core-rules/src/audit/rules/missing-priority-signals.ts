import type { AuditRule } from '../types.js';
import { fileOnlyLocation, locationInput, PRIORITY_SIGNAL_PATTERN } from './helpers.js';

export const MISSING_PRIORITY_SIGNALS_RULE_ID = 'heuristic.missing-priority-signals';

export const missingPrioritySignalsRule: AuditRule = {
  id: MISSING_PRIORITY_SIGNALS_RULE_ID,
  severity: 'warning',
  title: 'Rules include priority signals',
  description:
    'Flags rule sets that never use MUST, SHOULD, MAY, DO NOT, NEVER, or ALWAYS signals.',
  check(context) {
    const hasPrioritySignal =
      context.ruleSet.directives.some(
        (directive) => directive.priority !== undefined && directive.priority !== 'unknown',
      ) || context.ruleSet.files.some((file) => PRIORITY_SIGNAL_PATTERN.test(file.content));

    if (hasPrioritySignal) {
      return [];
    }

    const firstFile = context.ruleSet.files[0];

    return [
      {
        message:
          'Rule set has no priority signals such as MUST, SHOULD, MAY, DO NOT, NEVER, or ALWAYS.',
        category: 'priority-signal' as const,
        ...locationInput(firstFile === undefined ? undefined : fileOnlyLocation(firstFile.path)),
        fixHint:
          'Mark required rules with MUST or DO NOT, recommendations with SHOULD, and optional guidance with MAY.',
      },
    ];
  },
};
