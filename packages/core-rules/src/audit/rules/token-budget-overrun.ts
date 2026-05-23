import type { AuditRule } from '../types.js';
import { fileOnlyLocation, formatFilePath, getRuleThreshold, locationInput } from './helpers.js';

export const TOKEN_BUDGET_OVERRUN_RULE_ID = 'heuristic.token-budget-overrun';
export const DEFAULT_MAX_FILE_TOKENS = 8_000;

export const tokenBudgetOverrunRule: AuditRule = {
  id: TOKEN_BUDGET_OVERRUN_RULE_ID,
  severity: 'error',
  title: 'Rule files stay within the token budget',
  description: 'Flags rule files that exceed the configured maximum token count.',
  check(context) {
    const threshold = getRuleThreshold(
      context,
      TOKEN_BUDGET_OVERRUN_RULE_ID,
      'maxFileTokens',
      context.thresholds.maxFileTokens ?? DEFAULT_MAX_FILE_TOKENS,
    );

    return context.fileMetadata
      .filter((file) => file.tokenCount > threshold)
      .map((file) => ({
        message: `${formatFilePath(file.path)} is ${file.tokenCount} tokens, which exceeds the ${threshold} token file budget.`,
        category: 'token-budget' as const,
        ...locationInput(fileOnlyLocation(file.path)),
        fixHint:
          'Split this rule file into focused sections or move rarely used guidance into a linked reference file.',
      }));
  },
};
