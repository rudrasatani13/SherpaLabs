import process from 'node:process';

import { Command } from 'commander/esm.mjs';
import { createLintRuleRegistry } from '@sherpa-labs/core-mcp';

import { type OutputFormat } from '../config.js';
import { EXIT_SUCCESS, type ExitCode } from '../exit-codes.js';
import { renderRulesOutput, type WritableStreamLike } from '../output.js';
import { addFormatOption } from './lint.js';

export interface RulesCommandInput {
  readonly format?: OutputFormat;
  readonly quiet?: boolean;
  readonly stdout?: WritableStreamLike;
}

export function createRulesCommand(): Command {
  const command = addFormatOption(
    new Command('rules').description('list all built-in MCP lint rules'),
  ).option('--quiet', 'print rule IDs only for terminal output');

  command.action(() => {
    process.exitCode = runRulesCommand(
      command.optsWithGlobals<{ readonly format?: OutputFormat; readonly quiet?: boolean }>(),
    );
  });

  return command;
}

export function runRulesCommand(input: RulesCommandInput = {}): ExitCode {
  const stdout = input.stdout ?? process.stdout;
  const registry = createLintRuleRegistry();

  stdout.write(
    `${renderRulesOutput(registry.getRules(), {
      format: input.format ?? 'terminal',
      quiet: input.quiet === true,
    })}\n`,
  );

  return EXIT_SUCCESS;
}
