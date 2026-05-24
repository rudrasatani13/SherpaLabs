import {
  createMcpLintReportModel,
  groupMcpLintViolationsByCategory,
  MCP_LINT_REPORT_SCORE_CATEGORIES,
  MCP_LINT_REPORT_PRIORITY_CATEGORIES,
  type LintResult,
  type McpLintReportModel,
} from '@sherpa-labs/core-mcp';

export interface MarkdownFormatterOptions {
  readonly quiet?: boolean;
}

export function formatMarkdownReport(
  result: LintResult,
  options: MarkdownFormatterOptions = {},
): string {
  if (options.quiet) {
    return `**Score:** \`${result.score}/${result.maxScore}\` - **${result.passed ? 'PASS' : 'FAIL'}**`;
  }

  const model = createMcpLintReportModel(result);
  const lines: string[] = [];

  lines.push('## MCP Lint Report');
  lines.push('');

  appendScoreBanner(lines, model);
  appendServerInfo(lines, model);
  appendCategorySubscores(lines, model);
  appendViolations(lines, model);
  appendFailingRules(lines, model);
  appendSummary(lines, model);

  return lines.join('\n');
}

function appendScoreBanner(lines: string[], model: McpLintReportModel): void {
  const badge = model.passed ? '✅ PASS' : '❌ FAIL';
  lines.push(`### ${badge} — Score: \`${model.score}/${model.maxScore}\``);
  lines.push('');
  lines.push(
    `**Summary:** ${pluralize(model.resultSummary.errorCount, 'error')}, ${pluralize(
      model.resultSummary.warningCount,
      'warning',
    )}, ${pluralize(model.resultSummary.infoCount, 'info')}, ${pluralize(
      model.resultSummary.violationCount,
      'violation',
    )}`,
  );
}

function appendServerInfo(lines: string[], model: McpLintReportModel): void {
  const server = model.server;
  lines.push('');
  lines.push('### Server Info');
  lines.push('');
  lines.push('| Property | Value |');
  lines.push('| --- | --- |');
  lines.push(`| Transport | \`${escapeMarkdownTableCell(server.transport)}\` |`);

  if (server.protocolVersion !== undefined) {
    lines.push(`| Protocol Version | \`${escapeMarkdownTableCell(server.protocolVersion)}\` |`);
  }

  if (server.name !== undefined) {
    lines.push(`| Name | ${escapeMarkdownTableCell(server.name)} |`);
  }

  if (server.version !== undefined) {
    lines.push(`| Version | \`${escapeMarkdownTableCell(server.version)}\` |`);
  }

  lines.push(`| Tools | ${server.toolCount} |`);
  lines.push(`| Resources | ${server.resourceCount} |`);
  lines.push(`| Prompts | ${server.promptCount} |`);
  lines.push(
    `| Capabilities | ${server.capabilities.length > 0 ? server.capabilities.map(inlineCode).join(', ') : 'none'} |`,
  );
}

function appendCategorySubscores(lines: string[], model: McpLintReportModel): void {
  lines.push('');
  lines.push('### Category Subscores');
  lines.push('');
  lines.push('| Category | Score | Violations | Errors | Warnings | Info | Failing Rules |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | --- |');

  for (const category of MCP_LINT_REPORT_SCORE_CATEGORIES) {
    const subscore = model.categorySubscores[category];
    const failingRules =
      subscore.failingRuleIds.length === 0
        ? '-'
        : subscore.failingRuleIds.map(inlineCode).join(', ');

    lines.push(
      `| ${escapeMarkdownTableCell(subscore.label)} | ${subscore.score}/${subscore.maxScore} | ${subscore.violationCount} | ${subscore.errorCount} | ${subscore.warningCount} | ${subscore.infoCount} | ${failingRules} |`,
    );
  }
}

function appendViolations(lines: string[], model: McpLintReportModel): void {
  lines.push('');
  lines.push('### Violations');

  if (model.violations.length === 0) {
    lines.push('');
    lines.push('No violations found.');
    return;
  }

  const grouped = groupMcpLintViolationsByCategory(model.violations);

  for (const category of MCP_LINT_REPORT_PRIORITY_CATEGORIES) {
    const categoryViolations = grouped[category];

    if (categoryViolations.length === 0) {
      continue;
    }

    const label = categoryViolations[0]?.categoryLabel ?? category;
    lines.push('');

    if (categoryViolations.length > 3) {
      lines.push(`<details${category === 'security' ? ' open' : ''}>`);
      lines.push(`<summary>${escapeMarkdown(label)} (${categoryViolations.length})</summary>`);
      lines.push('');
    } else {
      lines.push(`**${escapeMarkdown(label)} (${categoryViolations.length})**`);
      lines.push('');
    }

    lines.push('| Rule | Severity | Message | Location |');
    lines.push('| --- | --- | --- | --- |');

    for (const violation of categoryViolations) {
      const severityEmoji =
        violation.severity === 'error' ? '🔴' : violation.severity === 'warning' ? '🟡' : '🔵';
      const location = violation.location === undefined ? '-' : inlineCode(violation.location);

      lines.push(
        `| ${inlineCode(violation.ruleId)} | ${severityEmoji} ${escapeMarkdownTableCell(violation.severity)} | ${escapeMarkdownTableCell(violation.message)} | ${location} |`,
      );

      lines.push('');
      lines.push(`> **Fix:** ${escapeMarkdown(violation.fixHint)}`);

      if (violation.evidence !== undefined) {
        lines.push(`> **Evidence:** \`${escapeMarkdown(violation.evidence)}\``);
      }

      lines.push('');
    }

    if (categoryViolations.length > 3) {
      lines.push('</details>');
    }
  }
}

function appendFailingRules(lines: string[], model: McpLintReportModel): void {
  lines.push('');
  lines.push('### Failing Rules');

  if (model.failingRules.length === 0) {
    lines.push('');
    lines.push('None.');
    return;
  }

  lines.push('');
  lines.push('| Rule | Category | Severity | Count | Fix |');
  lines.push('| --- | --- | --- | ---: | --- |');

  for (const rule of model.failingRules) {
    const severityEmoji =
      rule.worstSeverity === 'error' ? '🔴' : rule.worstSeverity === 'warning' ? '🟡' : '🔵';

    lines.push(
      `| ${inlineCode(rule.ruleId)} | ${escapeMarkdownTableCell(rule.categoryLabel)} | ${severityEmoji} ${escapeMarkdownTableCell(rule.worstSeverity)} | ${rule.count} | ${escapeMarkdownTableCell(rule.fixHint)} |`,
    );
  }
}

function appendSummary(lines: string[], model: McpLintReportModel): void {
  const summary = model.resultSummary;

  lines.push('');
  lines.push('### Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | ---: |');
  lines.push(`| Total Errors | ${summary.errorCount} |`);
  lines.push(`| Total Warnings | ${summary.warningCount} |`);
  lines.push(`| Total Info | ${summary.infoCount} |`);
  lines.push(`| Total Violations | ${summary.violationCount} |`);
  lines.push(`| Score | ${model.score}/${model.maxScore} |`);
  lines.push(`| Result | ${model.passed ? 'PASS ✅' : 'FAIL ❌'} |`);
  lines.push(`| Rules Run | ${model.metadata.rulesRun.length} |`);
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
