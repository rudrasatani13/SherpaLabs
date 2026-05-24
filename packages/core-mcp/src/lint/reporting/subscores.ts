import { calculateLintScore, summarizeLint } from '../scoring.js';
import type { LintResult, LintRuleCategory, LintViolation } from '../types.js';
import { prioritizeMcpLintViolations } from './prioritize.js';
import {
  MCP_LINT_CATEGORY_LABELS,
  type McpLintCategorySubscore,
  type McpLintCategorySubscores,
} from './types.js';

export function calculateMcpLintCategorySubscores(
  result: Pick<LintResult, 'violations'>,
): McpLintCategorySubscores {
  return {
    protocol: buildCategorySubscore('protocol', result.violations),
    schema: buildCategorySubscore('schema', result.violations),
    security: buildCategorySubscore('security', result.violations),
    performance: buildCategorySubscore('performance', result.violations),
  };
}

function buildCategorySubscore(
  category: LintRuleCategory,
  allViolations: readonly LintViolation[],
): McpLintCategorySubscore {
  const violations = allViolations.filter((violation) => violation.category === category);
  const score = calculateLintScore(violations);
  const summary = summarizeLint(violations);

  return {
    category,
    label: MCP_LINT_CATEGORY_LABELS[category],
    score: score.score,
    maxScore: score.maxScore,
    baseline: score.baseline,
    deduction: score.deduction,
    violationCount: summary.violationCount,
    errorCount: summary.errorCount,
    warningCount: summary.warningCount,
    infoCount: summary.infoCount,
    failingRuleIds: uniqueRuleIds(prioritizeMcpLintViolations(violations)),
  };
}

function uniqueRuleIds(violations: readonly LintViolation[]): readonly string[] {
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const violation of violations) {
    if (seen.has(violation.ruleId)) {
      continue;
    }

    seen.add(violation.ruleId);
    ids.push(violation.ruleId);
  }

  return ids;
}
