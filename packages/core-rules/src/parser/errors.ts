import type { RuleLocation, RuleParseError } from '@sherpa-labs/shared-types';

export interface ParseOptions {
  readonly filePath?: string;
}

export class RuleParseRuntimeError extends Error {
  readonly kind: 'parse_runtime_error';

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'RuleParseRuntimeError';
    this.kind = 'parse_runtime_error';
  }
}

export function makeParseError(
  message: string,
  severity: RuleParseError['severity'],
  location?: RuleLocation,
): RuleParseError {
  if (location === undefined) {
    return { message, severity };
  }

  return { message, severity, location };
}
