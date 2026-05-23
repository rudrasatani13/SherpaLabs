import type { AuditResult, ViolationSeverity } from '@sherpa-labs/shared-types';
import { createAuditReportModel } from './model.js';
import { groupViolationsBySeverity } from './score.js';
import {
  AUDIT_REPORT_SEVERITIES,
  type AuditReportMarkdownOptions,
  type AuditReportViolation,
} from './types.js';

export const DEFAULT_MARKDOWN_VIOLATION_LIMIT = 8;

export function formatAuditReportMarkdown(
  result: AuditResult,
  options: AuditReportMarkdownOptions = {},
): string {
  const report = createAuditReportModel(result, options);
  const lines: string[] = [];

  lines.push('## Sherpa Labs Audit Report');
  lines.push('');
  lines.push(
    `**Score:** \`${report.score}/${report.maxScore}\` - **${report.passed ? 'PASS' : 'FAIL'}**`,
  );
  lines.push(
    `**Summary:** ${pluralize(report.summary.errorCount, 'error')}, ${pluralize(
      report.summary.warningCount,
      'warning',
    )}, ${pluralize(report.summary.infoCount, 'info')}`,
  );
  lines.push('');
  lines.push('### Top Recommendations');
  appendMarkdownRecommendations(lines, report.recommendations);
  lines.push('');
  lines.push('### Quick Wins');
  appendMarkdownQuickWins(lines, report.quickWins);
  lines.push('');
  lines.push('### Violations');
  appendMarkdownViolations(lines, report.violations, options);

  return lines.join('\n');
}

function appendMarkdownRecommendations(
  lines: string[],
  recommendations: ReturnType<typeof createAuditReportModel>['recommendations'],
): void {
  if (recommendations.length === 0) {
    lines.push('');
    lines.push('No recommendations.');
    return;
  }

  lines.push('');
  recommendations.forEach((recommendation, index) => {
    lines.push(
      `${index + 1}. **${capitalize(recommendation.priority)}** - ${escapeMarkdown(
        recommendation.message,
      )}`,
    );

    if (recommendation.fixHint !== undefined) {
      lines.push(`   Fix: ${escapeMarkdown(recommendation.fixHint)}`);
    }
  });
}

function appendMarkdownQuickWins(
  lines: string[],
  quickWins: ReturnType<typeof createAuditReportModel>['quickWins'],
): void {
  if (quickWins.length === 0) {
    lines.push('');
    lines.push('No quick wins found.');
    return;
  }

  lines.push('');
  quickWins.forEach((quickWin, index) => {
    lines.push(
      `${index + 1}. **${escapeMarkdown(quickWin.title)}** - ${escapeMarkdown(quickWin.message)}`,
    );
    lines.push(`   Fix: ${escapeMarkdown(quickWin.fixHint)}`);
  });
}

function appendMarkdownViolations(
  lines: string[],
  violations: readonly AuditReportViolation[],
  options: AuditReportMarkdownOptions,
): void {
  if (violations.length === 0) {
    lines.push('');
    lines.push('No violations found.');
    return;
  }

  const grouped = groupViolationsBySeverity(violations);
  const limit = options.maxViolationsPerSeverity ?? DEFAULT_MARKDOWN_VIOLATION_LIMIT;

  for (const severity of AUDIT_REPORT_SEVERITIES) {
    const severityViolations = grouped[severity];

    if (severityViolations.length === 0) {
      continue;
    }

    lines.push('');
    lines.push(`<details${severity === 'error' ? ' open' : ''}>`);
    lines.push(`<summary>${formatSeverity(severity)} (${severityViolations.length})</summary>`);
    lines.push('');
    appendMarkdownViolationList(lines, severityViolations, limit);
    lines.push('');
    lines.push('</details>');
  }
}

function appendMarkdownViolationList(
  lines: string[],
  violations: readonly AuditReportViolation[],
  limit: number,
): void {
  const visibleViolations = violations.slice(0, limit);

  visibleViolations.forEach((violation) => {
    const location =
      violation.location === undefined ? '' : ` at ${inlineCode(violation.location.display)}`;
    lines.push(
      `- ${inlineCode(violation.ruleId)}${location}: ${escapeMarkdown(violation.message)}`,
    );
    lines.push(`  Fix: ${escapeMarkdown(violation.fixHint)}`);
  });

  if (violations.length > visibleViolations.length) {
    lines.push(`- ${violations.length - visibleViolations.length} more not shown.`);
  }
}

function formatSeverity(severity: ViolationSeverity): string {
  if (severity === 'error') {
    return 'Errors';
  }

  if (severity === 'warning') {
    return 'Warnings';
  }

  return 'Info';
}

function inlineCode(value: string): string {
  return `\`${value.replace(/`/gu, '\\`')}\``;
}

function escapeMarkdown(value: string): string {
  return value
    .replace(/\\/gu, '\\\\')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/([*_`[\]])/gu, '\\$1');
}

function capitalize(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function pluralize(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}
