import type { AuditResult, ViolationSeverity } from '@sherpa-labs/shared-types';
import { createAuditReportModel } from './model.js';
import { groupViolationsBySeverity } from './score.js';
import {
  AUDIT_REPORT_SEVERITIES,
  type AuditReportTerminalOptions,
  type AuditReportViolation,
} from './types.js';

export const DEFAULT_TERMINAL_VIOLATION_LIMIT = 10;

const ANSI = {
  reset: '\u001B[0m',
  bold: '\u001B[1m',
  red: '\u001B[31m',
  yellow: '\u001B[33m',
  cyan: '\u001B[36m',
  green: '\u001B[32m',
  gray: '\u001B[90m',
} as const;

export function formatAuditReportTerminal(
  result: AuditResult,
  options: AuditReportTerminalOptions = {},
): string {
  const report = createAuditReportModel(result, options);
  const color = createColorizer(options.colors ?? true);
  const lines: string[] = [];

  lines.push(color('Sherpa Labs Audit Report', 'bold'));
  lines.push(
    `Score: ${color(`${report.score}/${report.maxScore}`, report.passed ? 'green' : 'red')} ${color(
      report.passed ? 'PASS' : 'FAIL',
      report.passed ? 'green' : 'red',
    )}`,
  );
  lines.push(
    `Summary: ${pluralize(report.summary.errorCount, 'error')}, ${pluralize(
      report.summary.warningCount,
      'warning',
    )}, ${pluralize(report.summary.infoCount, 'info')}, ${pluralize(
      report.summary.recommendationCount,
      'recommendation',
    )}, ${pluralize(report.summary.quickWinCount, 'quick win')}`,
  );
  lines.push('');
  lines.push(color('Top Recommendations', 'bold'));

  if (report.recommendations.length === 0) {
    lines.push('  No recommendations.');
  } else {
    report.recommendations.forEach((recommendation, index) => {
      lines.push(
        `  ${index + 1}. [${recommendation.priority.toUpperCase()}] ${recommendation.message}`,
      );

      if (recommendation.fixHint !== undefined) {
        lines.push(`     Fix: ${recommendation.fixHint}`);
      }
    });
  }

  lines.push('');
  lines.push(color('Quick Wins', 'bold'));

  if (report.quickWins.length === 0) {
    lines.push('  No quick wins found.');
  } else {
    report.quickWins.forEach((quickWin, index) => {
      lines.push(`  ${index + 1}. ${quickWin.title} - ${quickWin.message}`);
      lines.push(`     Fix: ${quickWin.fixHint}`);
    });
  }

  lines.push('');
  lines.push(color('Violations', 'bold'));

  if (report.violations.length === 0) {
    lines.push('  No violations found.');
  } else {
    const grouped = groupViolationsBySeverity(report.violations);
    const limit = options.maxViolationsPerSeverity ?? DEFAULT_TERMINAL_VIOLATION_LIMIT;

    for (const severity of AUDIT_REPORT_SEVERITIES) {
      const violations = grouped[severity];

      if (violations.length === 0) {
        continue;
      }

      lines.push('');
      lines.push(
        color(`${severity.toUpperCase()} (${violations.length})`, colorForSeverity(severity)),
      );
      appendViolationLines(lines, violations, limit, color);
    }
  }

  return lines.join('\n');
}

function appendViolationLines(
  lines: string[],
  violations: readonly AuditReportViolation[],
  limit: number,
  color: Colorizer,
): void {
  const visibleViolations = violations.slice(0, limit);

  visibleViolations.forEach((violation) => {
    const location =
      violation.location === undefined ? '' : color(` (${violation.location.display})`, 'gray');
    lines.push(`  - [${violation.ruleId}] ${violation.message}${location}`);
    lines.push(`    Fix: ${violation.fixHint}`);
  });

  if (violations.length > visibleViolations.length) {
    lines.push(`  ... ${violations.length - visibleViolations.length} more not shown`);
  }
}

type TerminalColor = keyof typeof ANSI;
type Colorizer = (value: string, color: TerminalColor) => string;

function createColorizer(enabled: boolean): Colorizer {
  return (value, color) => (enabled ? `${ANSI[color]}${value}${ANSI.reset}` : value);
}

function colorForSeverity(severity: ViolationSeverity): TerminalColor {
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
