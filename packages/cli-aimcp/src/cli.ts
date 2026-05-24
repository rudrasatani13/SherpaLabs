import { Command } from 'commander/esm.mjs';

import { packageVersion } from './version.js';

const cliName = 'aimcp-lint';
const cliDescription = 'MCP lint CLI for validating Model Context Protocol servers.';
const phaseNotice = [
  '',
  'This Phase 20 scaffold provides the command shell only.',
  'Lint execution and subcommands will be added in Phase 21.',
].join('\n');

export function createCli(): Command {
  const program = new Command();

  program
    .name(cliName)
    .description(cliDescription)
    .usage('[options]')
    .version(packageVersion, '-V, --version', 'display the aimcp-lint version')
    .helpOption('-h, --help', 'display help for command')
    .showHelpAfterError('(add --help for usage)')
    .showSuggestionAfterError(false)
    .addHelpText('after', phaseNotice)
    .action(() => {
      program.outputHelp();
    });

  return program;
}

export async function runCli(argv: readonly string[] = process.argv): Promise<void> {
  const program = createCli();

  await program.parseAsync([...argv]);
}
