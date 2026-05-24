import type { OutputFormat } from './config.js';

export interface SpinnerStream {
  readonly isTTY?: boolean;
  write(chunk: string): void;
}

export interface SpinnerDecisionInput {
  readonly format: OutputFormat;
  readonly quiet: boolean;
  readonly streamIsTTY?: boolean;
}

export interface SpinnerOptions {
  readonly enabled: boolean;
  readonly stream: SpinnerStream;
  readonly intervalMs?: number;
}

const frames = ['-', '\\', '|', '/'] as const;

export function shouldUseSpinner(input: SpinnerDecisionInput): boolean {
  return input.format === 'terminal' && !input.quiet && input.streamIsTTY === true;
}

export class Spinner {
  readonly #enabled: boolean;
  readonly #stream: SpinnerStream;
  readonly #intervalMs: number;
  #timer: NodeJS.Timeout | undefined;
  #frameIndex = 0;
  #message = '';

  constructor(options: SpinnerOptions) {
    this.#enabled = options.enabled;
    this.#stream = options.stream;
    this.#intervalMs = options.intervalMs ?? 80;
  }

  async run<T>(message: string, task: () => Promise<T>): Promise<T> {
    this.start(message);

    try {
      const result = await task();
      this.succeed(message);
      return result;
    } catch (error) {
      this.fail(message);
      throw error;
    }
  }

  start(message: string): void {
    if (!this.#enabled) {
      return;
    }

    this.#message = message;
    this.#writeFrame();
    this.#timer = setInterval(() => {
      this.#writeFrame();
    }, this.#intervalMs);
  }

  succeed(message = this.#message): void {
    if (!this.#enabled) {
      return;
    }

    this.stop();
    this.#stream.write(`\r\u001B[2KOK ${message}\n`);
  }

  fail(message = this.#message): void {
    if (!this.#enabled) {
      return;
    }

    this.stop();
    this.#stream.write(`\r\u001B[2KERR ${message}\n`);
  }

  stop(): void {
    if (this.#timer !== undefined) {
      clearInterval(this.#timer);
      this.#timer = undefined;
    }

    if (this.#enabled) {
      this.#stream.write('\r\u001B[2K');
    }
  }

  #writeFrame(): void {
    const frame = frames[this.#frameIndex % frames.length] ?? '-';
    this.#frameIndex += 1;
    this.#stream.write(`\r${frame} ${this.#message}`);
  }
}
