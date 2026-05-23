import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseRulesDirectory } from '../src/parser/index.js';

const FIXTURES_ROOT = join(import.meta.dirname, 'fixtures');

describe('parseRulesDirectory', () => {
  it('parses every markdown file under .cursor/rules/', async () => {
    const result = await parseRulesDirectory(join(FIXTURES_ROOT, 'cursor-dir'));

    expect(result.format).toBe('cursor-rule');
    expect(result.parseErrors).toEqual([]);
    expect(result.files.length).toBe(3);

    const fileNames = result.files.map((file) => file.path.split('/').pop());
    expect(fileNames).toEqual(expect.arrayContaining(['react.md', 'testing.md', 'typescript.md']));

    expect(result.directives.length).toBeGreaterThan(0);
  });

  it('returns an empty rule set with a parse error when the path does not exist', async () => {
    const result = await parseRulesDirectory(join(FIXTURES_ROOT, 'does-not-exist'));

    expect(result.files).toEqual([]);
    expect(result.parseErrors.length).toBeGreaterThan(0);
    const firstError = result.parseErrors[0];
    expect(firstError?.severity).toBe('error');
  });

  it('also accepts a path that points directly at the rules directory', async () => {
    const result = await parseRulesDirectory(join(FIXTURES_ROOT, 'cursor-dir', '.cursor', 'rules'));

    expect(result.files.length).toBe(3);
  });
});
