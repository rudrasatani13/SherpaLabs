import type { LintRule, LintRuleViolationInput } from '../../types.js';
import { createViolation, getRuleThreshold } from '../helpers.js';

export const F002_LIST_METHOD_LATENCY_BUDGET_RULE_ID = 'F002';
export const DEFAULT_LIST_METHOD_LATENCY_BUDGET_MS = 2_000;

export const f002ListMethodLatencyBudgetRule: LintRule = {
  id: F002_LIST_METHOD_LATENCY_BUDGET_RULE_ID,
  category: 'performance',
  severity: 'warning',
  title: 'List methods stay within latency budget',
  description:
    'Flags tools/list, resources/list, and prompts/list timings above the configured budget.',
  check(context) {
    const threshold = getRuleThreshold(
      context,
      F002_LIST_METHOD_LATENCY_BUDGET_RULE_ID,
      'listLatencyMs',
      DEFAULT_LIST_METHOD_LATENCY_BUDGET_MS,
    );
    const timings = [
      { method: 'tools/list', path: 'timings.toolsListMs', value: context.timings.toolsListMs },
      {
        method: 'resources/list',
        path: 'timings.resourcesListMs',
        value: context.timings.resourcesListMs,
      },
      {
        method: 'prompts/list',
        path: 'timings.promptsListMs',
        value: context.timings.promptsListMs,
      },
    ] as const;
    const violations: LintRuleViolationInput[] = [];

    for (const timing of timings) {
      if (timing.value !== undefined && timing.value > threshold) {
        violations.push(
          createViolation({
            message: `${timing.method} took ${timing.value}ms, above the ${threshold}ms budget.`,
            location: timing.path,
            fixHint:
              'Keep discovery methods fast by caching static metadata and paginating large lists.',
          }),
        );
      }
    }

    return violations;
  },
};
