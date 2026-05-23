import { describe, expect, it } from 'vitest';

import { countApproximateTokens } from '../src/token-count.js';

describe('countApproximateTokens', () => {
  it('returns zero for empty input', () => {
    expect(countApproximateTokens('')).toBe(0);
  });

  it('counts word-like segments and applies the 1.3 multiplier', () => {
    expect(countApproximateTokens('one two three four five')).toBe(7);
  });

  it('handles punctuation without counting punctuation as tokens', () => {
    expect(countApproximateTokens('Build fast, test well, ship safely.')).toBe(8);
  });
});
