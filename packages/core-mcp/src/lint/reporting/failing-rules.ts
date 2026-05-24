import type { LintResult, LintRuleSeverity, LintViolation } from '../types.js';
import {
  categoryPriorityRank,
  prioritizeMcpLintViolations,
  severityPriorityRank,
} from './prioritize.js';
import { MCP_LINT_CATEGORY_LABELS, type McpLintFailingRuleSummary } from './types.js';

export function getFailingMcpLintRules(
  result: Pick<LintResult, 'violations'>,
): readonly McpLintFailingRuleSummary[] {
  const groups = new Map<string, LintViolation[]>();

  for (const violation of prioritizeMcpLintViolations(result.violations)) {
    const group = groups.get(violation.ruleId);

    if (group === undefined) {
      groups.set(violation.ruleId, [violation]);
    } else {
      group.push(violation);
    }
  }

  return [...groups.entries()]
    .map(([ruleId, violations]) => buildFailingRuleSummary(ruleId, violations))
    .sort(compareMcpLintFailingRuleSummaries);
}

export function compareMcpLintFailingRuleSummaries(
  left: McpLintFailingRuleSummary,
  right: McpLintFailingRuleSummary,
): number {
  return (
    categoryPriorityRank(left.category) - categoryPriorityRank(right.category) ||
    severityPriorityRank(left.worstSeverity) - severityPriorityRank(right.worstSeverity) ||
    left.ruleId.localeCompare(right.ruleId) ||
    left.message.localeCompare(right.message)
  );
}

function buildFailingRuleSummary(
  ruleId: string,
  violations: readonly LintViolation[],
): McpLintFailingRuleSummary {
  const sorted = prioritizeMcpLintViolations(violations);
  const first = sorted[0];

  if (first === undefined) {
    throw new Error(`Cannot summarize failing rule ${ruleId} without violations.`);
  }

  return {
    ruleId,
    category: first.category,
    categoryLabel: MCP_LINT_CATEGORY_LABELS[first.category],
    worstSeverity: worstSeverity(sorted),
    count: sorted.length,
    message: first.message,
    fixHint: first.fixHint,
    violationIds: sorted.map((violation) => violation.id),
  };
}

function worstSeverity(violations: readonly LintViolation[]): LintRuleSeverity {
  return violations.reduce<LintRuleSeverity>((worst, violation) => {
    return severityPriorityRank(violation.severity) < severityPriorityRank(worst)
      ? violation.severity
      : worst;
  }, 'info');
}
