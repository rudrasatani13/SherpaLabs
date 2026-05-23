import { countApproximateTokens } from '@sherpa-labs/core-utils';
import type { RuleDirective, RuleFile } from '@sherpa-labs/shared-types';
import type { AuditRule } from '../types.js';
import {
  formatFilePath,
  getRuleThreshold,
  isActionableDirectiveText,
  locationToOffset,
} from './helpers.js';

export const VERBOSE_PREAMBLE_RULE_ID = 'heuristic.verbose-preamble';
const DEFAULT_MAX_PREAMBLE_TOKENS = 120;

export const verbosePreambleRule: AuditRule = {
  id: VERBOSE_PREAMBLE_RULE_ID,
  severity: 'warning',
  title: 'Preamble is short before actionable rules',
  description: 'Flags files that spend too many tokens before the first actionable directive.',
  check(context) {
    const threshold = getRuleThreshold(
      context,
      VERBOSE_PREAMBLE_RULE_ID,
      'maxPreambleTokens',
      DEFAULT_MAX_PREAMBLE_TOKENS,
    );

    return context.ruleSet.files.flatMap((file) => {
      const directive = firstActionableDirectiveForFile(file, context.ruleSet.directives);

      if (directive === undefined) {
        return [];
      }

      const directiveOffset = locationToOffset(file.content, directive.location);
      const preambleTokens = countApproximateTokens(file.content.slice(0, directiveOffset));

      if (preambleTokens <= threshold) {
        return [];
      }

      return [
        {
          message: `${formatFilePath(file.path)} has ${preambleTokens} tokens before its first actionable directive, exceeding the ${threshold} token preamble budget.`,
          category: 'structure' as const,
          ...(directive.location !== undefined ? { location: directive.location } : {}),
          fixHint:
            'Move project background below the rules or replace it with a short purpose statement before the first directive.',
        },
      ];
    });
  },
};

function firstActionableDirectiveForFile(
  file: RuleFile,
  directives: readonly RuleDirective[],
): RuleDirective | undefined {
  return directives
    .filter((directive) => {
      const directivePath = directive.location?.filePath;
      return (directivePath === undefined && file.path === '') || directivePath === file.path;
    })
    .filter((directive) => isActionableDirectiveText(directive.text))
    .sort(
      (left, right) =>
        locationToOffset(file.content, left.location) -
        locationToOffset(file.content, right.location),
    )[0];
}
