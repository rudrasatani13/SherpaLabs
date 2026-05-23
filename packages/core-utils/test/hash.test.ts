import { describe, expect, it } from 'vitest';

import { deterministicHash, deterministicId, stableStringify } from '../src/hash.js';

describe('hash utilities', () => {
  it('hashes strings deterministically', () => {
    expect(deterministicHash('sherpa')).toBe(deterministicHash('sherpa'));
  });

  it('stable-stringifies object keys in sorted order', () => {
    expect(stableStringify({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
  });

  it('hashes structured values deterministically regardless of object key order', () => {
    const first = deterministicHash({ b: 2, a: { d: false, c: true } });
    const second = deterministicHash({ a: { c: true, d: false }, b: 2 });

    expect(first).toBe(second);
  });

  it('creates deterministic IDs with prefixes and lengths', () => {
    const id = deterministicId({ repo: 'SherpaLabs', phase: 9 }, { prefix: 'rule', length: 12 });

    expect(id).toMatch(/^rule_[0-9a-f]{12}$/);
    expect(id).toBe(
      deterministicId({ phase: 9, repo: 'SherpaLabs' }, { prefix: 'rule', length: 12 }),
    );
  });

  it('throws for non-finite numbers', () => {
    expect(() => stableStringify(Number.NaN)).toThrow('JSON-compatible numbers must be finite.');
  });
});
