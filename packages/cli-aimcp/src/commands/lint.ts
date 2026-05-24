import process from 'node:process';

import { InvalidArgumentError, Option } from 'commander/esm.mjs';
import type { Command } from 'commander/esm.mjs';

import { type CommonFlagInput, outputFormats } from '../config.js';
import { EXIT_LINT_FAILED, EXIT_SUCCESS, type ExitCode } from '../exit-codes.js';
import { collectStdioLintContext, runLintEngine } from '../lint-runner.js';
import { renderLintOutput, type WritableStreamLike } from '../output.js';
import { parseServerCommand } from '../server-command.js';
import { shouldUseSpinner, Spinner } from '../spinner.js';
import { resolveCliConfig } from '../config.js';

export interface LintCommandInput {
  readonly serverCommandTokens: readonly string[] | undefined;
  readonly options: CommonFlagInput;
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
    .option('--quiet', 'suppress normal terminal report details');

  return command;
}

export async function runLintCommand(input: LintCommandInput): Promise<ExitCode> {
  const cwd = input.cwd ?? process.cwd();
  const stdout = input.stdout ?? process.stdout;
  const stderr = input.stderr ?? process.stderr;
  const serverCommand = parseServerCommand(input.serverCommandTokens);
  const resolvedConfig = await resolveCliConfig({ cwd, options: input.options });
  const diagnostics = resolvedConfig.verbose
    ? (message: string) => {
        stderr.write(`[aimcp-lint] ${message}\n`);
      }
    : undefined;
  const spinner = new Spinner({
    stream: stderr,
    enabled: shouldUseSpinner({
      format: resolvedConfig.format,
      quiet: resolvedConfig.quiet,
      ...(stderr.isTTY !== undefined ? { streamIsTTY: stderr.isTTY } : {}),
    }),
  });
  const context = await spinner.run('Connecting to MCP server', async () =>
    collectStdioLintContext({
      serverCommand,
      cwd,
      config: resolvedConfig.lintConfig,
      verbose: resolvedConfig.verbose,
      stderr,
      ...(diagnostics !== undefined ? { diagnostics } : {}),
    }),
  );
  const result = await spinner.run('Running lint rules', async () =>
    runLintEngine({ context, config: resolvedConfig.lintConfig }),
  );

  stdout.write(
    `${renderLintOutput(result, {
      format: resolvedConfig.format,
      quiet: resolvedConfig.quiet,
      colors: stdout.isTTY === true,
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
