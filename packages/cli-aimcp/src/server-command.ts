import { usageError } from './errors.js';

export interface ServerCommand {
  readonly command: string;
  readonly args: readonly string[];
  readonly display: string;
}

export function parseServerCommand(tokens: readonly string[] | undefined): ServerCommand {
  const normalized = tokens?.[0] === '--' ? tokens.slice(1) : (tokens ?? []);
  const command = normalized[0];

  if (command === undefined || command.trim() === '') {
    throw usageError('No MCP server command provided. Use: aimcp-lint -- node ./server.mjs');
  }

  const args = normalized.slice(1);

  return {
    command,
    args,
    display: [command, ...args].map(quoteForDisplay).join(' '),
  };
}

function quoteForDisplay(value: string): string {
  if (/^[A-Za-z0-9_./:=@+-]+$/u.test(value)) {
    return value;
  }

  return `'${value.replace(/'/gu, `'\\''`)}'`;
}
