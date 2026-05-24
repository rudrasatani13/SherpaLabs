import { type LintResult, type LintRule } from '@sherpa-labs/core-mcp';

import type { OutputFormat } from './config.js';
import { describeError } from './errors.js';
import { formatTerminalReport } from './formatters/terminal.js';
import { formatJsonReport } from './formatters/json.js';
import { formatMarkdownReport } from './formatters/markdown.js';

export interface WritableStreamLike {
  readonly isTTY?: boolean;
  write(chunk: string): void;
}

export interface RenderLintOutputOptions {
  readonly format: OutputFormat;
  readonly quiet: boolean;
  readonly colors: boolean;
  readonly detailed: boolean;
}

export interface RenderRulesOutputOptions {
  readonly format: OutputFormat;
  readonly quiet: boolean;
}

export function renderLintOutput(result: LintResult, options: RenderLintOutputOptions): string {
  if (options.quiet && options.format === 'terminal') {
    return `${result.passed ? 'PASS' : 'FAIL'} ${result.score}/${result.maxScore}`;
  }

  if (options.format === 'json') {
    return formatJsonReport(result, {
      quiet: options.quiet,
      pretty: true,
    });
  }

  if (options.format === 'markdown') {
    return formatMarkdownReport(result, {
      quiet: options.quiet,
    });
  }

  return formatTerminalReport(result, {
    colors: options.colors,
    detailed: options.detailed,
  });
}

export function renderRulesOutput(
  rules: readonly LintRule[],
  options: RenderRulesOutputOptions,
): string {
  const summaries = rules.map((rule) => ({
    id: rule.id,
    category: rule.category,
    severity: rule.severity,
    title: rule.title,
    description: rule.description,
  }));

  if (options.format === 'json') {
    return JSON.stringify({ count: summaries.length, rules: summaries }, null, 2);
  }

  if (options.format === 'markdown') {
    return renderRulesMarkdown(summaries);
  }

  if (options.quiet) {
    return summaries.map((rule) => rule.id).join('\n');
  }

  return renderRulesTerminal(summaries);
}

export function writeCliError(error: unknown, stream: WritableStreamLike): void {
  stream.write(`Error: ${describeError(error)}\n`);
}

interface RuleSummary {
  readonly id: string;
  readonly category: string;
  readonly severity: string;
  readonly title: string;
  readonly description: string;
}

function renderRulesTerminal(rules: readonly RuleSummary[]): string {
  const lines = [`Available MCP lint rules (${rules.length})`, ''];
  lines.push('ID    Category     Severity  Title - Description');

  for (const rule of rules) {
    lines.push(
      `${rule.id.padEnd(5)} ${rule.category.padEnd(12)} ${rule.severity.padEnd(9)} ${rule.title} - ${rule.description}`,
    );
  }

  return lines.join('\n');
}

function renderRulesMarkdown(rules: readonly RuleSummary[]): string {
  const lines = [
    '# MCP Lint Rules',
    '',
    '| ID | Category | Severity | Title | Description |',
    '| --- | --- | --- | --- | --- |',
  ];

  for (const rule of rules) {
    lines.push(
      `| ${inlineCode(rule.id)} | ${escapeMarkdownTableCell(rule.category)} | ${escapeMarkdownTableCell(
        rule.severity,
      )} | ${escapeMarkdownTableCell(rule.title)} | ${escapeMarkdownTableCell(rule.description)} |`,
    );
  }

  return lines.join('\n');
}

function inlineCode(value: string): string {
  return `\`${value.replace(/`/gu, '\\`')}\``;
}

function escapeMarkdownTableCell(value: string): string {
  return value.replace(/\\/gu, '\\\\').replace(/\|/gu, '\\|').replace(/\n/gu, '<br>');
}
