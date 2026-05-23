import { describe, expect, it } from 'vitest';

import {
  isAbsolutePath,
  normalizePath,
  splitNormalizedPath,
  toRelativeDisplayPath,
} from '../src/path.js';

describe('path utilities', () => {
  it('normalizes Windows separators to POSIX separators', () => {
    expect(normalizePath('C:\\Users\\rudra\\..\\repo\\rules.md')).toBe('c:/Users/repo/rules.md');
  });

  it('normalizes POSIX paths consistently', () => {
    expect(normalizePath('/repo//docs/../rules.md')).toBe('/repo/rules.md');
  });

  it('preserves UNC roots while normalizing separators', () => {
    expect(normalizePath('\\\\server\\share\\repo\\rules.md')).toBe('//server/share/repo/rules.md');
  });

  it('detects POSIX, Windows drive, and UNC absolute paths', () => {
    expect(isAbsolutePath('/repo/rules.md')).toBe(true);
    expect(isAbsolutePath('C:\\repo\\rules.md')).toBe(true);
    expect(isAbsolutePath('\\\\server\\share\\rules.md')).toBe(true);
    expect(isAbsolutePath('rules.md')).toBe(false);
  });

  it('returns relative display paths when target and base share a root', () => {
    expect(toRelativeDisplayPath('/repo/src/rules.md', '/repo')).toBe('src/rules.md');
  });

  it('avoids changing already-relative paths beyond separator normalization', () => {
    expect(toRelativeDisplayPath('src\\rules.md', '/repo')).toBe('src/rules.md');
  });

  it('returns the normalized absolute path when roots differ', () => {
    expect(toRelativeDisplayPath('D:\\repo\\rules.md', 'C:\\repo')).toBe('d:/repo/rules.md');
  });

  it('splits normalized roots for deterministic comparisons', () => {
    expect(splitNormalizedPath('C:\\Repo\\rules.md')).toEqual({
      root: 'c:/',
      rest: 'Repo/rules.md',
    });
  });
});
