import type { LintRuleCategory, LintRuleSeverity, LintViolation } from '../types.js';
import {
  MCP_LINT_CATEGORY_LABELS,
  MCP_LINT_REPORT_PRIORITY_CATEGORIES,
  type GroupedMcpLintReportViolations,
  type McpLintReportViolation,
} from './types.js';

export function prioritizeMcpLintViolations(
  violations: readonly LintViolation[],
): readonly LintViolation[] {
  return [...violations].sort(compareMcpLintViolations);
}

export function compareMcpLintViolations(left: LintViolation, right: LintViolation): number {
  return (
    categoryPriorityRank(left.category) - categoryPriorityRank(right.category) ||
    severityPriorityRank(left.severity) - severityPriorityRank(right.severity) ||
    left.ruleId.localeCompare(right.ruleId) ||
    left.id.localeCompare(right.id) ||
    left.message.localeCompare(right.message) ||
    (left.location ?? '').localeCompare(right.location ?? '') ||
    (left.evidence ?? '').localeCompare(right.evidence ?? '')
  );
}

export function severityPriorityRank(severity: LintRuleSeverity): number {
  if (severity === 'error') {
    return 0;
  }

  if (severity === 'warning') {
    return 1;
  }

  return 2;
}

export function categoryPriorityRank(category: LintRuleCategory): number {
  const index = MCP_LINT_REPORT_PRIORITY_CATEGORIES.indexOf(category);
  return index === -1 ? MCP_LINT_REPORT_PRIORITY_CATEGORIES.length : index;
}

export function toMcpLintReportViolation(violation: LintViolation): McpLintReportViolation {
  return {
    id: violation.id,
    ruleId: violation.ruleId,
    category: violation.category,
    categoryLabel: MCP_LINT_CATEGORY_LABELS[violation.category],
    severity: violation.severity,
    message: violation.message,
    fixHint: violation.fixHint,
    ...(violation.location !== undefined ? { location: violation.location } : {}),
    ...(violation.evidence !== undefined ? { evidence: violation.evidence } : {}),
  };
}

export function groupMcpLintViolationsByCategory(
  violations: readonly McpLintReportViolation[],
): GroupedMcpLintReportViolations {
  return {
    protocol: violations.filter((violation) => violation.category === 'protocol'),
    schema: violations.filter((violation) => violation.category === 'schema'),
    security: violations.filter((violation) => violation.category === 'security'),
    performance: violations.filter((violation) => violation.category === 'performance'),
  };
}
