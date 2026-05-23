import type { AuditRule } from '../types.js';
import { fileOnlyLocation, locationInput } from './helpers.js';

export const MISSING_EXAMPLES_RULE_ID = 'heuristic.missing-examples';

const EXAMPLE_MARKER_PATTERN = /\b(?:for example|e\.g\.|example:|examples:|such as)\b/i;

export const missingExamplesRule: AuditRule = {
  id: MISSING_EXAMPLES_RULE_ID,
  severity: 'info',
  title: 'Rules include concrete examples',
  description: 'Flags rule sets that include no code blocks and no explicit example markers.',
  check(context) {
    const hasCodeBlock = context.ruleSet.codeBlocks.length > 0;
    const hasExampleMarker = context.ruleSet.files.some((file) =>
      EXAMPLE_MARKER_PATTERN.test(file.content),
    );

    if (hasCodeBlock || hasExampleMarker) {
      return [];
    }

    const firstFile = context.ruleSet.files[0];

    return [
      {
        message:
          'Rule set has no code blocks and no concrete example markers such as "for example" or "e.g.".',
        category: 'examples' as const,
        ...locationInput(firstFile === undefined ? undefined : fileOnlyLocation(firstFile.path)),
        fixHint:
          'Add at least one short code block, command, or before/after example showing how to apply a rule.',
      },
    ];
  },
};
