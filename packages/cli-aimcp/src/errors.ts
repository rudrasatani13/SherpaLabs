import { EXIT_RUNTIME_ERROR, type ExitCode } from './exit-codes.js';

export class CliError extends Error {
  readonly exitCode: ExitCode;

  constructor(message: string, exitCode: ExitCode = EXIT_RUNTIME_ERROR) {
    super(message);
    this.name = 'CliError';
    this.exitCode = exitCode;
  }
}

export function usageError(message: string): CliError {
  return new CliError(message, EXIT_RUNTIME_ERROR);
}

export function configError(message: string): CliError {
  return new CliError(message, EXIT_RUNTIME_ERROR);
}

export function runtimeError(message: string): CliError {
  return new CliError(message, EXIT_RUNTIME_ERROR);
}

export function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function errorExitCode(error: unknown): ExitCode {
  return error instanceof CliError ? error.exitCode : EXIT_RUNTIME_ERROR;
}
