import {
  createMcpLintReportModel,
  groupMcpLintViolationsByCategory,
  MCP_LINT_REPORT_SCORE_CATEGORIES,
  MCP_LINT_REPORT_PRIORITY_CATEGORIES,
  type LintResult,
  type LintRuleSeverity,
  type McpLintReportModel,
} from '@sherpa-labs/core-mcp';

import picocolors from 'picocolors';

export interface TerminalFormatterOptions {
  readonly colors: boolean;
  readonly detailed: boolean;
}

export function formatTerminalReport(
  result: LintResult,
  options: TerminalFormatterOptions,
): string {
  const model = createMcpLintReportModel(result);
  const pc = picocolors.createColors(options.colors);
  const lines: string[] = [];

  appendScoreBanner(lines, model, pc);
  appendServerInfo(lines, model, pc);
  appendCategorySubscores(lines, model, pc);
  appendViolations(lines, model, options, pc);
  appendFailingRules(lines, model, pc);
  appendSummaryTable(lines, model, pc);

  return lines.join('\n');
}

function appendScoreBanner(
  lines: string[],
  model: McpLintReportModel,
  pc: ReturnType<typeof picocolors.createColors>,
): void {
  const passOrFail = model.passed ? 'PASS' : 'FAIL';
  const colorFn = model.passed ? pc.green : pc.red;

  lines.push('');
  lines.push(colorFn(pc.bold(`┌──────────────────────────────────────┐`)));
  lines.push(
    colorFn(
      pc.bold(
        `│  Score: ${String(model.score).padStart(3)}/${String(model.maxScore).padEnd(3)}  ${passOrFail.padEnd(17)} │`,
      ),
    ),
  );
  lines.push(colorFn(pc.bold(`└──────────────────────────────────────┘`)));
}

function appendServerInfo(
  lines: string[],
  model: McpLintReportModel,
  pc: ReturnType<typeof picocolors.createColors>,
): void {
  const server = model.server;

  lines.push('');
  lines.push(pc.bold('Server'));
  lines.push(
    `  Transport: ${server.transport}${server.protocolVersion !== undefined ? ` (v${server.protocolVersion})` : ''}`,
  );

  if (server.name !== undefined) {
    const versionText = server.version !== undefined ? ` v${server.version}` : '';
    lines.push(`  Name:      ${server.name}${versionText}`);
  }

  const caps = server.capabilities.length > 0 ? server.capabilities.join(', ') : 'none';
  lines.push(
    `  Tools: ${server.toolCount} | Resources: ${server.resourceCount} | Prompts: ${server.promptCount}`,
  );
  lines.push(`  Capabilities: ${caps}`);
}

function appendCategorySubscores(
  lines: string[],
  model: McpLintReportModel,
  pc: ReturnType<typeof picocolors.createColors>,
): void {
  lines.push('');
  lines.push(pc.bold('Category Subscores'));
  lines.push(
    `  ${pc.dim('Category'.padEnd(12))} ${pc.dim('Score'.padEnd(9))} ${pc.dim('Violations'.padEnd(11))} ${pc.dim('Errors'.padEnd(7))} ${pc.dim('Warnings'.padEnd(9))} ${pc.dim('Info'.padEnd(5))} ${pc.dim('Failing Rules')}`,
  );

  for (const category of MCP_LINT_REPORT_SCORE_CATEGORIES) {
    const subscore = model.categorySubscores[category];
    const scoreText = `${subscore.score}/${subscore.maxScore}`;
    const failingRules =
      subscore.failingRuleIds.length === 0 ? '-' : subscore.failingRuleIds.join(', ');
    const hasViolations = subscore.violationCount > 0;
    const labelColor = hasViolations ? pc.yellow : pc.green;

    lines.push(
      `  ${labelColor(subscore.label.padEnd(12))} ${scoreText.padEnd(9)} ${pc.bold(String(subscore.violationCount).padEnd(11))} ${String(subscore.errorCount).padEnd(7)} ${String(subscore.warningCount).padEnd(9)} ${String(subscore.infoCount).padEnd(5)} ${failingRules}`,
    );
  }
}

function appendViolations(
  lines: string[],
  model: McpLintReportModel,
  options: TerminalFormatterOptions,
  pc: ReturnType<typeof picocolors.createColors>,
): void {
  lines.push('');
  lines.push(pc.bold('Violations'));

  if (model.violations.length === 0) {
    lines.push(`  ${pc.green('No violations found.')}`);
    return;
  }

  const grouped = groupMcpLintViolationsByCategory(model.violations);

  for (const category of MCP_LINT_REPORT_PRIORITY_CATEGORIES) {
    const categoryViolations = grouped[category];

    if (categoryViolations.length === 0) {
      continue;
    }

    lines.push('');
    const label = `${categoryViolations[0]?.categoryLabel ?? category} (${categoryViolations.length})`;
    lines.push(`  ${pc.bold(label)}`);

    for (const violation of categoryViolations) {
      const severityColor = colorForSeverity(violation.severity, pc);
      const ruleId = pc.dim(`[${violation.ruleId}]`);
      const severityTag = severityColor(violation.severity.toUpperCase());

      lines.push(`    ${ruleId} ${severityTag} ${violation.message}`);

      if (violation.location !== undefined) {
        lines.push(`      ${pc.dim(`Location: ${violation.location}`)}`);
      }

      if (violation.evidence !== undefined) {
        lines.push(`      Evidence: ${violation.evidence}`);
      }

      if (options.detailed) {
        lines.push(`      ${pc.dim(`Fix: ${violation.fixHint}`)}`);
      }
    }
  }
}

function appendFailingRules(
  lines: string[],
  model: McpLintReportModel,
  pc: ReturnType<typeof picocolors.createColors>,
): void {
  lines.push('');
  lines.push(pc.bold('Failing Rules'));

  if (model.failingRules.length === 0) {
    lines.push(`  ${pc.green('None.')}`);
    return;
  }

  for (const rule of model.failingRules) {
    const severityColor = colorForSeverity(rule.worstSeverity, pc);
    lines.push(
      `  ${pc.dim(`[${rule.ruleId}]`)} ${rule.categoryLabel} ${severityColor(rule.worstSeverity)} x${rule.count} - ${rule.fixHint}`,
    );
  }
}

function appendSummaryTable(
  lines: string[],
  model: McpLintReportModel,
  pc: ReturnType<typeof picocolors.createColors>,
): void {
  const summary = model.resultSummary;

  lines.push('');
  lines.push(pc.bold('Summary'));
  lines.push(`  ${pc.dim('Total Errors'.padEnd(15))} ${pc.red(String(summary.errorCount))}`);
  lines.push(`  ${pc.dim('Total Warnings'.padEnd(15))} ${pc.yellow(String(summary.warningCount))}`);
  lines.push(`  ${pc.dim('Total Info'.padEnd(15))} ${pc.cyan(String(summary.infoCount))}`);
  lines.push(
    `  ${pc.dim('Total Violations'.padEnd(15))} ${pc.bold(String(summary.violationCount))}`,
  );
  lines.push(
    `  ${pc.dim('Score'.padEnd(15))} ${model.passed ? pc.green(`${model.score}/${model.maxScore}`) : pc.red(`${model.score}/${model.maxScore}`)}`,
  );
  lines.push(
    `  ${pc.dim('Result'.padEnd(15))} ${model.passed ? pc.green('PASS') : pc.red('FAIL')}`,
  );
  lines.push(`  ${pc.dim('Rules Run'.padEnd(15))} ${model.metadata.rulesRun.length}`);
}

function colorForSeverity(
  severity: LintRuleSeverity,
  pc: ReturnType<typeof picocolors.createColors>,
): (text: string) => string {
  if (severity === 'error') {
    return pc.red;
  }

  if (severity === 'warning') {
    return pc.yellow;
  }

  return pc.cyan;
}
