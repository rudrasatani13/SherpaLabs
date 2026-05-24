import type { LintResult } from '../types.js';
import { createMcpLintReportModel } from './model.js';
import { groupMcpLintViolationsByCategory } from './prioritize.js';
import {
  MCP_LINT_REPORT_PRIORITY_CATEGORIES,
  MCP_LINT_REPORT_SCORE_CATEGORIES,
  type McpLintFailingRuleSummary,
  type McpLintReportMarkdownOptions,
  type McpLintReportModel,
  type McpLintReportViolation,
} from './types.js';

export const DEFAULT_MCP_LINT_MARKDOWN_TOP_VIOLATION_LIMIT = 10;
export const DEFAULT_MCP_LINT_MARKDOWN_CATEGORY_VIOLATION_LIMIT = 8;

export function formatMcpLintMarkdownReport(
  result: LintResult,
  options: McpLintReportMarkdownOptions = {},
): string {
  const report = createMcpLintReportModel(result, options);
  const lines: string[] = [];

  lines.push('## MCP Lint Report');
  lines.push('');
  lines.push(
    `**Score:** \`${report.score}/${report.maxScore}\` - **${report.passed ? 'PASS' : 'FAIL'}**`,
  );
  lines.push(
    `**Summary:** ${pluralize(report.resultSummary.errorCount, 'error')}, ${pluralize(
      report.resultSummary.warningCount,
      'warning',
    )}, ${pluralize(report.resultSummary.infoCount, 'info')}, ${pluralize(
      report.resultSummary.violationCount,
      'violation',
    )}`,
  );

  appendCategorySubscores(lines, report);
  appendTopViolations(lines, report.violations, options);
  appendGroupedViolations(lines, report.violations, options);
  appendFailingRules(lines, report.failingRules);

  return lines.join('\n');
}

function appendCategorySubscores(lines: string[], report: McpLintReportModel): void {
  lines.push('');
  lines.push('### Category Subscores');
  lines.push('');
  lines.push('| Category | Score | Violations | Errors | Warnings | Info | Failing rules |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | --- |');

  for (const category of MCP_LINT_REPORT_SCORE_CATEGORIES) {
    const subscore = report.categorySubscores[category];
    const failingRules =
      subscore.failingRuleIds.length === 0
        ? '-'
        : subscore.failingRuleIds.map(inlineCode).join(', ');

    lines.push(
      `| ${escapeMarkdownTableCell(subscore.label)} | ${subscore.score}/${subscore.maxScore} | ${subscore.violationCount} | ${subscore.errorCount} | ${subscore.warningCount} | ${subscore.infoCount} | ${failingRules} |`,
    );
  }
}

function appendTopViolations(
  lines: string[],
  violations: readonly McpLintReportViolation[],
  options: McpLintReportMarkdownOptions,
): void {
  lines.push('');
  lines.push('### Top Priority Violations');

  if (violations.length === 0) {
    lines.push('');
    lines.push('No violations found.');
    return;
  }

  const limit = options.maxTopViolations ?? DEFAULT_MCP_LINT_MARKDOWN_TOP_VIOLATION_LIMIT;
  const visibleViolations = violations.slice(0, limit);

  lines.push('');
  lines.push('| Category | Rule | Severity | Message | Location | Fix |');
  lines.push('| --- | --- | --- | --- | --- | --- |');

  for (const violation of visibleViolations) {
    lines.push(
      `| ${escapeMarkdownTableCell(violation.categoryLabel)} | ${inlineCode(
        violation.ruleId,
      )} | ${escapeMarkdownTableCell(violation.severity)} | ${escapeMarkdownTableCell(
        violation.message,
      )} | ${violation.location === undefined ? '-' : inlineCode(violation.location)} | ${escapeMarkdownTableCell(
        violation.fixHint,
      )} |`,
    );
  }

  if (violations.length > visibleViolations.length) {
    lines.push('');
    lines.push(
      `${violations.length - visibleViolations.length} more priority violations not shown.`,
    );
  }
}

function appendGroupedViolations(
  lines: string[],
  violations: readonly McpLintReportViolation[],
  options: McpLintReportMarkdownOptions,
): void {
  lines.push('');
  lines.push('### Violations by Category');

  if (violations.length === 0) {
    lines.push('');
    lines.push('No violations found.');
    return;
  }

  const grouped = groupMcpLintViolationsByCategory(violations);
  const limit =
    options.maxViolationsPerCategory ?? DEFAULT_MCP_LINT_MARKDOWN_CATEGORY_VIOLATION_LIMIT;

  for (const category of MCP_LINT_REPORT_PRIORITY_CATEGORIES) {
    const categoryViolations = grouped[category];

    if (categoryViolations.length === 0) {
      continue;
    }

    lines.push('');
    lines.push(`<details${category === 'security' ? ' open' : ''}>`);
    lines.push(
      `<summary>${escapeMarkdown(categoryViolations[0]?.categoryLabel ?? category)} (${categoryViolations.length})</summary>`,
    );
    lines.push('');
    appendMarkdownViolationList(lines, categoryViolations, limit);
    lines.push('');
    lines.push('</details>');
  }
}

function appendMarkdownViolationList(
  lines: string[],
  violations: readonly McpLintReportViolation[],
  limit: number,
): void {
  const visibleViolations = violations.slice(0, limit);

  for (const violation of visibleViolations) {
    const location =
      violation.location === undefined ? '' : ` at ${inlineCode(violation.location)}`;
    lines.push(
      `- ${inlineCode(violation.ruleId)} **${escapeMarkdown(
        violation.severity,
      )}**${location}: ${escapeMarkdown(violation.message)}`,
    );

    if (violation.evidence !== undefined) {
      lines.push(`  Evidence: ${escapeMarkdown(violation.evidence)}`);
    }

    lines.push(`  Fix: ${escapeMarkdown(violation.fixHint)}`);
  }

  if (violations.length > visibleViolations.length) {
    lines.push(`- ${violations.length - visibleViolations.length} more not shown.`);
  }
}

function appendFailingRules(
  lines: string[],
  failingRules: readonly McpLintFailingRuleSummary[],
): void {
  lines.push('');
  lines.push('### Failing Rules');

  if (failingRules.length === 0) {
    lines.push('');
    lines.push('None.');
    return;
  }

  lines.push('');
  lines.push('| Rule | Category | Worst severity | Count | First action |');
  lines.push('| --- | --- | --- | ---: | --- |');

  for (const rule of failingRules) {
    lines.push(
      `| ${inlineCode(rule.ruleId)} | ${escapeMarkdownTableCell(
        rule.categoryLabel,
      )} | ${escapeMarkdownTableCell(rule.worstSeverity)} | ${rule.count} | ${escapeMarkdownTableCell(
        rule.fixHint,
      )} |`,
    );
  }
}

function inlineCode(value: string): string {
  return `\`${value.replace(/`/gu, '\\`')}\``;
}

function escapeMarkdownTableCell(value: string): string {
  return escapeMarkdown(value).replace(/\|/gu, '\\|').replace(/\n/gu, '<br>');
}

function escapeMarkdown(value: string): string {
  return value
    .replace(/\\/gu, '\\\\')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/([*_`[\]])/gu, '\\$1');
}

function pluralize(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}
