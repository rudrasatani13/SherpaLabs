import process from 'node:process';

import { InvalidArgumentError, Option } from 'commander/esm.mjs';
import type { Command } from 'commander/esm.mjs';

import { shouldEnableColor } from '../color.js';
import { type CommonFlagInput, outputFormats } from '../config.js';
import { usageError } from '../errors.js';
import { EXIT_LINT_FAILED, EXIT_SUCCESS, type ExitCode } from '../exit-codes.js';
import { collectStdioLintContext, runLintEngine } from '../lint-runner.js';
import { renderLintOutput, type WritableStreamLike } from '../output.js';
import { parseServerCommand } from '../server-command.js';
import { shouldUseSpinner, Spinner } from '../spinner.js';
import { resolveCliConfig } from '../config.js';
import { createVerboseLogger } from '../verbose.js';

export interface LintCommandInput {
  readonly serverCommandTokens: readonly string[] | undefined;
  readonly options: CommonFlagInput;
  readonly commandTokens?: readonly string[];
  readonly cwd?: string;
  readonly stdout?: WritableStreamLike;
  readonly stderr?: WritableStreamLike;
}

export function addFormatOption(command: Command): Command {
  return command.addOption(
    new Option('--format <format>', 'output format: terminal, json, or markdown').choices([
      ...outputFormats,
    ]),
  );
}

export function addCommonLintOptions(command: Command): Command {
  addFormatOption(command)
    .option('--fail-under <score>', 'exit with code 1 when score is below score', parseScore)
    .option('--ignore <ruleId...>', 'disable one or more rule IDs')
    .option('--only <ruleId...>', 'run only one or more rule IDs')
    .option('--config <path>', `path to .aimcp-lint.json`)
    .option('--verbose', 'show connection and protocol diagnostics')
    .option('--quiet', 'suppress normal terminal report details')
    .option('--detailed', 'show fix hints in terminal output');

  return command;
}

export async function runLintCommand(input: LintCommandInput): Promise<ExitCode> {
  const cwd = input.cwd ?? process.cwd();
  const stdout = input.stdout ?? process.stdout;
  const stderr = input.stderr ?? process.stderr;
  const resolvedConfig = await resolveCliConfig({ cwd, options: input.options });
  const cliTokens =
    (input.serverCommandTokens ?? []).length > 0 ? input.serverCommandTokens : undefined;
  const configTokens = resolvedConfig.commandTokens;
  const effectiveTokens = cliTokens ?? configTokens;

  if (effectiveTokens === undefined || effectiveTokens.length === 0) {
    if (cliTokens === undefined && configTokens === undefined) {
      throw usageError(
        'No MCP server command provided. Pass one on the command line or set "command" in .aimcp-lint.json.',
      );
    }

    throw usageError(
      `MCP server command resolved to empty list. Check the "command" field in ${resolvedConfig.configPath}.`,
    );
  }

  const serverCommand = parseServerCommand(effectiveTokens);
  const verbose = createVerboseLogger(resolvedConfig.verbose, stderr);

  verbose.step(
    `Config: ${resolvedConfig.configPath}${resolvedConfig.configExists ? '' : ' (not found, using defaults)'}`,
  );
  verbose.step(
    `Format: ${resolvedConfig.format} | Quiet: ${resolvedConfig.quiet} | Detailed: ${resolvedConfig.detailed} | Fail under: ${resolvedConfig.failUnder ?? 'none'}`,
  );
  verbose.step(`Resolved server command: ${serverCommand.display}`);

  const spinner = new Spinner({
    stream: stderr,
    enabled: shouldUseSpinner({
      format: resolvedConfig.format,
      quiet: resolvedConfig.quiet,
      ...(stderr.isTTY !== undefined ? { streamIsTTY: stderr.isTTY } : {}),
    }),
  });

  verbose.step('Connecting to MCP server');
  const context = await spinner.run('Connecting to MCP server', async () =>
    collectStdioLintContext({
      serverCommand,
      cwd,
      config: resolvedConfig.lintConfig,
      verbose: resolvedConfig.verbose,
      stderr,
      ...(resolvedConfig.verbose
        ? {
            diagnostics: (message: string) => {
              verbose.step(message);
            },
          }
        : {}),
    }),
  );

  verbose.step(
    `Collected ${context.tools?.length ?? 0} tools, ${context.resources?.length ?? 0} resources, ${context.prompts?.length ?? 0} prompts`,
  );
  verbose.step('Running lint rules');

  const result = await spinner.run('Running lint rules', async () =>
    runLintEngine({ context, config: resolvedConfig.lintConfig }),
  );

  verbose.step(`Score: ${result.score}/${result.maxScore} (${result.passed ? 'PASS' : 'FAIL'})`);
  verbose.step(
    `Violations: ${result.summary.violationCount} (${result.summary.errorCount} errors, ${result.summary.warningCount} warnings, ${result.summary.infoCount} info)`,
  );
  verbose.step(`Rules run: ${result.rulesRun.length}`);
  verbose.step('Rendering output');

  stdout.write(
    `${renderLintOutput(result, {
      format: resolvedConfig.format,
      quiet: resolvedConfig.quiet,
      colors: shouldEnableColor(stdout),
      detailed: resolvedConfig.detailed,
    })}\n`,
  );

  return result.passed ? EXIT_SUCCESS : EXIT_LINT_FAILED;
}

function parseScore(value: string): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new InvalidArgumentError('score must be a non-negative finite number');
  }

  return parsed;
}
