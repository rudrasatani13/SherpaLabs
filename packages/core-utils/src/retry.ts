import { setTimeout as sleepFor } from 'node:timers/promises';

export interface RetryContext {
  attempt: number;
  maxAttempts: number;
  attemptsRemaining: number;
}

export interface RetryScheduledContext extends RetryContext {
  nextAttempt: number;
  delayMs: number;
  error: unknown;
}

export interface RetryOptions {
  maxAttempts: number;
  shouldRetry(error: unknown, context: RetryContext): boolean | Promise<boolean>;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  jitter?: boolean;
  random?: () => number;
  sleep?: (delayMs: number) => Promise<void>;
  onRetry?: (context: RetryScheduledContext) => void | Promise<void>;
}

const defaultInitialDelayMs = 100;
const defaultMaxDelayMs = 30_000;
const defaultBackoffFactor = 2;

export async function retry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  validateRetryOptions(options);

  const initialDelayMs = options.initialDelayMs ?? defaultInitialDelayMs;
  const maxDelayMs = options.maxDelayMs ?? defaultMaxDelayMs;
  const backoffFactor = options.backoffFactor ?? defaultBackoffFactor;
  const sleep = options.sleep ?? defaultSleep;
  const random = options.random ?? Math.random;
  let attempt = 1;

  while (true) {
    try {
      return await operation(attempt);
    } catch (error) {
      const context: RetryContext = {
        attempt,
        maxAttempts: options.maxAttempts,
        attemptsRemaining: options.maxAttempts - attempt,
      };

      if (attempt >= options.maxAttempts || !(await options.shouldRetry(error, context))) {
        throw error;
      }

      const delayMs = calculateDelayMs({
        attempt,
        initialDelayMs,
        maxDelayMs,
        backoffFactor,
        jitter: options.jitter === true,
        random,
      });

      await options.onRetry?.({
        ...context,
        nextAttempt: attempt + 1,
        delayMs,
        error,
      });

      await sleep(delayMs);
      attempt += 1;
    }
  }
}

interface DelayOptions {
  attempt: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  jitter: boolean;
  random: () => number;
}

function calculateDelayMs(options: DelayOptions): number {
  const exponentialDelay = options.initialDelayMs * options.backoffFactor ** (options.attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, options.maxDelayMs);

  if (!options.jitter) {
    return Math.round(cappedDelay);
  }

  return Math.round(cappedDelay * clampUnitInterval(options.random()));
}

function clampUnitInterval(value: number): number {
  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

function validateRetryOptions(options: RetryOptions): void {
  if (!Number.isInteger(options.maxAttempts) || options.maxAttempts < 1) {
    throw new RangeError('maxAttempts must be an integer greater than or equal to 1.');
  }

  validateNonNegativeNumber(options.initialDelayMs, 'initialDelayMs');
  validateNonNegativeNumber(options.maxDelayMs, 'maxDelayMs');

  if (
    options.backoffFactor != null &&
    (!Number.isFinite(options.backoffFactor) || options.backoffFactor < 1)
  ) {
    throw new RangeError('backoffFactor must be a finite number greater than or equal to 1.');
  }
}

function validateNonNegativeNumber(value: number | undefined, name: string): void {
  if (value != null && (!Number.isFinite(value) || value < 0)) {
    throw new RangeError(`${name} must be a finite non-negative number.`);
  }
}

async function defaultSleep(delayMs: number): Promise<void> {
  await sleepFor(delayMs);
}
