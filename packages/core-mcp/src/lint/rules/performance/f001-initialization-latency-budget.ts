import type { LintRule } from '../../types.js';
import { createViolation, getRuleThreshold } from '../helpers.js';

export const F001_INITIALIZATION_LATENCY_BUDGET_RULE_ID = 'F001';
export const DEFAULT_INITIALIZE_LATENCY_BUDGET_MS = 5_000;

export const f001InitializationLatencyBudgetRule: LintRule = {
  id: F001_INITIALIZATION_LATENCY_BUDGET_RULE_ID,
  category: 'performance',
  severity: 'warning',
  title: 'Initialization latency stays within budget',
  description: 'Flags initialize timings above the configured latency budget.',
  check(context) {
    const initializeMs = context.timings.initializeMs;
    const threshold = getRuleThreshold(
      context,
      F001_INITIALIZATION_LATENCY_BUDGET_RULE_ID,
      'initializeLatencyMs',
      DEFAULT_INITIALIZE_LATENCY_BUDGET_MS,
    );

    if (initializeMs === undefined || initializeMs <= threshold) {
      return [];
    }

    return [
      createViolation({
        message: `initialize took ${initializeMs}ms, above the ${threshold}ms budget.`,
        location: 'timings.initializeMs',
        fixHint: 'Defer expensive startup work until after initialization or cache discovery data.',
      }),
    ];
  },
};
