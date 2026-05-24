import process from 'node:process';

import { Command } from 'commander/esm.mjs';

import { createInitCommand } from './commands/init.js';
import { addCommonLintOptions, runLintCommand } from './commands/lint.js';
import { createRulesCommand } from './commands/rules.js';
import { createWatchCommand } from './commands/watch.js';
import type { CommonFlagInput } from './config.js';
import { resolveCliConfig } from './config.js';
import { errorExitCode } from './errors.js';
import { writeCliError } from './output.js';
import { packageVersion } from './version.js';

const cliName = 'aimcp-lint';
const cliDescription = 'MCP lint CLI for validating Model Context Protocol servers.';
const examples = [
  '',
  'Examples:',
  '  aimcp-lint node ./server.mjs',
  '  aimcp-lint -- node ./server.mjs --flag',
  '  aimcp-lint watch -- node ./server.mjs',
].join('\n');

export function createCli(): Command {
  const program = new Command();

  addCommonLintOptions(program)
    .name(cliName)
    .description(cliDescription)
    .usage('[options] [--] <server-command> [args...]')
    .version(packageVersion, '-V, --version', 'display the aimcp-lint version')
    .helpOption('-h, --help', 'display help for command')
    .showHelpAfterError('(add --help for usage)')
    .showSuggestionAfterError(false)
    .argument('[serverCommand...]', 'target MCP server command and arguments')
    .addHelpText('after', examples)
    .action(async (serverCommandTokens: string[] | undefined, options: CommonFlagInput) => {
      const effectiveTokens: readonly string[] | undefined =
        serverCommandTokens !== undefined && serverCommandTokens.length > 0
          ? serverCommandTokens
          : undefined;

      if (effectiveTokens === undefined) {
        const resolvedConfig = await resolveCliConfig({
          cwd: process.cwd(),
          options,
        });

        if (
          resolvedConfig.commandTokens === undefined ||
          resolvedConfig.commandTokens.length === 0
        ) {
          program.outputHelp();
          return;
        }
      }

      process.exitCode = await runLintCommand({ serverCommandTokens: effectiveTokens, options });
    });

  program.addCommand(createWatchCommand());
  program.addCommand(createInitCommand());
  program.addCommand(createRulesCommand());

  return program;
}

export async function runCli(argv: readonly string[] = process.argv): Promise<void> {
  const program = createCli();

  try {
    await program.parseAsync([...argv]);
  } catch (error) {
    writeCliError(error, process.stderr);
    process.exitCode = errorExitCode(error);
  }
}
