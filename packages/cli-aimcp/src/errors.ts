import { McpClientError } from '@sherpa-labs/core-mcp';

import { EXIT_CONFIG_ERROR, EXIT_SERVER_ERROR, type ExitCode } from './exit-codes.js';

export class CliError extends Error {
  readonly exitCode: ExitCode;

  constructor(message: string, exitCode: ExitCode = EXIT_CONFIG_ERROR) {
    super(message);
    this.name = 'CliError';
    this.exitCode = exitCode;
  }
}

export function usageError(message: string): CliError {
  return new CliError(message, EXIT_CONFIG_ERROR);
}

export function configError(message: string): CliError {
  return new CliError(message, EXIT_CONFIG_ERROR);
}

export function runtimeError(message: string): CliError {
  return new CliError(message, EXIT_CONFIG_ERROR);
}

export function serverError(message: string): CliError {
  return new CliError(message, EXIT_SERVER_ERROR);
}

export function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function errorExitCode(error: unknown): ExitCode {
  if (error instanceof CliError) {
    return error.exitCode;
  }

  if (error instanceof McpClientError) {
    return EXIT_SERVER_ERROR;
  }

  return EXIT_CONFIG_ERROR;
}
