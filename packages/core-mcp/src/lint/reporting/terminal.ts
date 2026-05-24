import type { LintResult, LintRuleSeverity } from '../types.js';
import { createMcpLintReportModel } from './model.js';
import { groupMcpLintViolationsByCategory } from './prioritize.js';
import {
  MCP_LINT_REPORT_PRIORITY_CATEGORIES,
  MCP_LINT_REPORT_SCORE_CATEGORIES,
  type McpLintFailingRuleSummary,
  type McpLintReportTerminalOptions,
  type McpLintReportViolation,
} from './types.js';

export const DEFAULT_MCP_LINT_TERMINAL_VIOLATION_LIMIT = 10;

const ANSI = {
  reset: '\u001B[0m',
  bold: '\u001B[1m',
  red: '\u001B[31m',
  yellow: '\u001B[33m',
  cyan: '\u001B[36m',
  green: '\u001B[32m',
  gray: '\u001B[90m',
} as const;

export function formatMcpLintTerminalReport(
  result: LintResult,
  options: McpLintReportTerminalOptions = {},
): string {
  const report = createMcpLintReportModel(result, options);
  const color = createColorizer(options.colors ?? true);
  const lines: string[] = [];

  lines.push(color('MCP Lint Report', 'bold'));
  lines.push(
    `Score: ${color(`${report.score}/${report.maxScore}`, report.passed ? 'green' : 'red')} ${color(
      report.passed ? 'PASS' : 'FAIL',
      report.passed ? 'green' : 'red',
    )}`,
  );
  lines.push(
    `Summary: ${pluralize(report.resultSummary.errorCount, 'error')}, ${pluralize(
      report.resultSummary.warningCount,
      'warning',
    )}, ${pluralize(report.resultSummary.infoCount, 'info')}, ${pluralize(
      report.resultSummary.violationCount,
      'violation',
    )}`,
  );

  appendCategorySubscores(lines, report.categorySubscores, color);
  appendViolations(lines, report.violations, options, color);
  appendFailingRules(lines, report.failingRules, color);

  return lines.join('\n');
}

function appendCategorySubscores(
  lines: string[],
  categorySubscores: ReturnType<typeof createMcpLintReportModel>['categorySubscores'],
  color: Colorizer,
): void {
  lines.push('');
  lines.push(color('Category Subscores', 'bold'));
  lines.push('  Category     Score    Violations  Errors  Warnings  Info  Failing rules');

  for (const category of MCP_LINT_REPORT_SCORE_CATEGORIES) {
    const subscore = categorySubscores[category];
    const scoreText = `${subscore.score}/${subscore.maxScore}`;
    const failingRules =
      subscore.failingRuleIds.length === 0 ? '-' : subscore.failingRuleIds.join(', ');

    lines.push(
      `  ${subscore.label.padEnd(12)} ${scoreText.padEnd(8)} ${String(
        subscore.violationCount,
      ).padEnd(11)} ${String(subscore.errorCount).padEnd(7)} ${String(subscore.warningCount).padEnd(
        9,
      )} ${String(subscore.infoCount).padEnd(5)} ${failingRules}`,
    );
  }
}

function appendViolations(
  lines: string[],
  violations: readonly McpLintReportViolation[],
  options: McpLintReportTerminalOptions,
  color: Colorizer,
): void {
  lines.push('');
  lines.push(color('Violations', 'bold'));

  if (violations.length === 0) {
    lines.push('  No violations found.');
    return;
  }

  const grouped = groupMcpLintViolationsByCategory(violations);
  const limit = options.maxViolationsPerCategory ?? DEFAULT_MCP_LINT_TERMINAL_VIOLATION_LIMIT;

  for (const category of MCP_LINT_REPORT_PRIORITY_CATEGORIES) {
    const categoryViolations = grouped[category];

    if (categoryViolations.length === 0) {
      continue;
    }

    lines.push('');
    lines.push(
      color(
        `${categoryViolations[0]?.categoryLabel ?? category} (${categoryViolations.length})`,
        'bold',
      ),
    );
    appendViolationLines(lines, categoryViolations, limit, color);
  }
}

function appendViolationLines(
  lines: string[],
  violations: readonly McpLintReportViolation[],
  limit: number,
  color: Colorizer,
): void {
  const visibleViolations = violations.slice(0, limit);

  for (const violation of visibleViolations) {
    lines.push(
      `  - [${violation.ruleId}] ${color(violation.severity.toUpperCase(), colorForSeverity(violation.severity))} ${violation.message}`,
    );

    if (violation.location !== undefined) {
      lines.push(`    Location: ${color(violation.location, 'gray')}`);
    }

    if (violation.evidence !== undefined) {
      lines.push(`    Evidence: ${violation.evidence}`);
    }

    lines.push(`    Fix: ${violation.fixHint}`);
  }

  if (violations.length > visibleViolations.length) {
    lines.push(`  ... ${violations.length - visibleViolations.length} more not shown`);
  }
}

function appendFailingRules(
  lines: string[],
  failingRules: readonly McpLintFailingRuleSummary[],
  color: Colorizer,
): void {
  lines.push('');
  lines.push(color('Failing rules', 'bold'));

  if (failingRules.length === 0) {
    lines.push('  None.');
    return;
  }

  for (const rule of failingRules) {
    lines.push(
      `  - [${rule.ruleId}] ${rule.categoryLabel} ${color(
        rule.worstSeverity,
        colorForSeverity(rule.worstSeverity),
      )} x${rule.count} - ${rule.fixHint}`,
    );
  }
}

type TerminalColor = keyof typeof ANSI;
type Colorizer = (value: string, color: TerminalColor) => string;

function createColorizer(enabled: boolean): Colorizer {
  return (value, color) => (enabled ? `${ANSI[color]}${value}${ANSI.reset}` : value);
}

function colorForSeverity(severity: LintRuleSeverity): TerminalColor {
  if (severity === 'error') {
    return 'red';
  }

  if (severity === 'warning') {
    return 'yellow';
  }

  return 'cyan';
}

function pluralize(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}
