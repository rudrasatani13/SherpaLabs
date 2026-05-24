import type { WritableStreamLike } from './output.js';

export interface VerboseLogger {
  step(message: string): void;
}

export function createVerboseLogger(enabled: boolean, stream: WritableStreamLike): VerboseLogger {
  return {
    step(message) {
      if (!enabled) {
        return;
      }
      stream.write(`[aimcp-lint] ${message}\n`);
    },
  };
}

export function noopVerboseLogger(): VerboseLogger {
  return {
    step: () => undefined,
  };
}
