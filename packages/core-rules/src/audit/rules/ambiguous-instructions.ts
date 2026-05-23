import type { AuditRule } from '../types.js';
import { shorten, splitDirectiveClauses } from './helpers.js';

export const AMBIGUOUS_INSTRUCTIONS_RULE_ID = 'heuristic.ambiguous-instructions';

const ALWAYS_AMBIGUOUS_PATTERNS = [
  { label: 'maybe', pattern: /\bmaybe\b/i },
  { label: 'probably', pattern: /\bprobably\b/i },
  { label: 'try to', pattern: /\btry to\b/i },
  { label: 'when appropriate', pattern: /\bwhen appropriate\b/i },
  { label: 'if possible', pattern: /\bif possible\b/i },
  { label: 'as needed', pattern: /\bas needed\b/i },
] as const;

const CONDITIONALLY_AMBIGUOUS_PATTERNS = [
  { label: 'sometimes', pattern: /\bsometimes\b/i },
  { label: 'usually', pattern: /\busually\b/i },
  { label: 'generally', pattern: /\bgenerally\b/i },
] as const;

export const ambiguousInstructionsRule: AuditRule = {
  id: AMBIGUOUS_INSTRUCTIONS_RULE_ID,
  severity: 'info',
  title: 'Instructions avoid ambiguous qualifiers',
  description: 'Flags ambiguous terms when a directive does not include a clear condition.',
  check(context) {
    return context.ruleSet.directives.flatMap((directive) => {
      return splitDirectiveClauses(directive.text).flatMap((clause) => {
        const alwaysAmbiguous = ALWAYS_AMBIGUOUS_PATTERNS.find((candidate) =>
          candidate.pattern.test(clause),
        );
        const conditionalAmbiguous = CONDITIONALLY_AMBIGUOUS_PATTERNS.find(
          (candidate) => candidate.pattern.test(clause) && !hasClearCondition(clause),
        );
        const ambiguous = alwaysAmbiguous ?? conditionalAmbiguous;

        if (ambiguous === undefined) {
          return [];
        }

        return [
          {
            message: `Directive "${shorten(clause)}" uses ambiguous qualifier "${ambiguous.label}" without a clear decision condition.`,
            category: 'ambiguity' as const,
            ...(directive.location !== undefined ? { location: directive.location } : {}),
            fixHint:
              'Replace the qualifier with an explicit condition, threshold, or exception that tells the agent exactly when it applies.',
          },
        ];
      });
    });
  },
};

function hasClearCondition(clause: string): boolean {
  if (/\b(?:when appropriate|if possible|as needed)\b/i.test(clause)) {
    return false;
  }

  return /\b(?:unless|except|only when|if|when)\b.{8,}/i.test(clause);
}
