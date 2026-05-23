import type { AuditRule } from '../types.js';
import { shorten, splitDirectiveClauses } from './helpers.js';

export const VAGUE_DIRECTIVES_RULE_ID = 'heuristic.vague-directives';

const VAGUE_DIRECTIVE_PATTERNS = [
  { label: 'write good code', pattern: /\bwrite good code\b/i },
  { label: 'make it better', pattern: /\bmake it better\b/i },
  { label: 'be smart', pattern: /\bbe smart\b/i },
  { label: 'do the right thing', pattern: /\bdo the right thing\b/i },
  { label: 'use best practices', pattern: /\buse best practices\b/i },
  { label: 'make it nice', pattern: /\bmake it nice\b/i },
  { label: 'keep it clean', pattern: /\bkeep it clean\b/i },
] as const;

export const vagueDirectivesRule: AuditRule = {
  id: VAGUE_DIRECTIVES_RULE_ID,
  severity: 'warning',
  title: 'Directives are concrete and actionable',
  description: 'Flags vague directives that do not name a concrete action, standard, or command.',
  check(context) {
    return context.ruleSet.directives.flatMap((directive) => {
      return splitDirectiveClauses(directive.text).flatMap((clause) => {
        const vaguePattern = VAGUE_DIRECTIVE_PATTERNS.find((candidate) => {
          const match = candidate.pattern.exec(clause);
          return match !== null && !hasConcreteQualifier(clause, match.index + match[0].length);
        });

        if (vaguePattern === undefined) {
          return [];
        }

        return [
          {
            message: `Directive "${shorten(clause)}" is vague: "${vaguePattern.label}" does not name a concrete action or quality bar.`,
            category: 'vague-directive' as const,
            ...(directive.location !== undefined ? { location: directive.location } : {}),
            fixHint:
              'Replace it with a measurable rule that names the command, file pattern, review criterion, or expected behavior.',
          },
        ];
      });
    });
  },
};

function hasConcreteQualifier(clause: string, startIndex: number): boolean {
  const suffix = clause.slice(startIndex);

  return /\b(?:for|by|when|with|using|including|such as|instead of)\b.{4,}/i.test(suffix);
}
