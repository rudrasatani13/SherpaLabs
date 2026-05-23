import { describe, expect, it } from 'vitest';

import { retry } from '../src/retry.js';

describe('retry', () => {
  it('returns immediately when the operation succeeds', async () => {
    const sleeps: number[] = [];

    const result = await retry(() => Promise.resolve('ok'), {
      maxAttempts: 3,
      shouldRetry: () => true,
      sleep: (delayMs) => {
        sleeps.push(delayMs);

        return Promise.resolve();
      },
    });

    expect(result).toBe('ok');
    expect(sleeps).toEqual([]);
  });

  it('retries with exponential backoff when allowed', async () => {
    const attempts: number[] = [];
    const sleeps: number[] = [];

    const result = await retry(
      (attempt) => {
        attempts.push(attempt);

        if (attempt < 3) {
          throw new Error('temporary');
        }

        return Promise.resolve('ok');
      },
      {
        maxAttempts: 3,
        initialDelayMs: 10,
        shouldRetry: () => true,
        sleep: (delayMs) => {
          sleeps.push(delayMs);

          return Promise.resolve();
        },
      },
    );

    expect(result).toBe('ok');
    expect(attempts).toEqual([1, 2, 3]);
    expect(sleeps).toEqual([10, 20]);
  });

  it('does not retry when the caller disallows it', async () => {
    let attempts = 0;

    await expect(
      retry(
        () => {
          attempts += 1;
          throw new Error('permanent');
        },
        {
          maxAttempts: 3,
          shouldRetry: () => false,
          sleep: () => Promise.resolve(),
        },
      ),
    ).rejects.toThrow('permanent');

    expect(attempts).toBe(1);
  });

  it('applies optional jitter to retry delays', async () => {
    const sleeps: number[] = [];

    await expect(
      retry(
        () => {
          throw new Error('temporary');
        },
        {
          maxAttempts: 2,
          initialDelayMs: 100,
          jitter: true,
          random: () => 0.25,
          shouldRetry: () => true,
          sleep: (delayMs) => {
            sleeps.push(delayMs);

            return Promise.resolve();
          },
        },
      ),
    ).rejects.toThrow('temporary');

    expect(sleeps).toEqual([25]);
  });
});
