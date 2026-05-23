import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseClaudeMd } from '../src/parser/index.js';

const FIXTURES_ROOT = join(import.meta.dirname, 'fixtures', 'claude-md');

describe('parseClaudeMd — fixture coverage', () => {
  it('handles 20+ real-world style CLAUDE.md fixtures without crashes or errors', async () => {
    const entries = (await readdir(FIXTURES_ROOT)).filter((name) => name.endsWith('.md')).sort();

    expect(entries.length).toBeGreaterThanOrEqual(20);

    for (const entry of entries) {
      const filePath = join(FIXTURES_ROOT, entry);
      const content = await readFile(filePath, 'utf8');

      const result = parseClaudeMd(content, { filePath });

      expect(result.parseErrors, `${entry} should parse cleanly`).toEqual([]);
      expect(result.files, `${entry} should produce exactly one file`).toHaveLength(1);
      const file = result.files[0];
      expect(file?.path, `${entry} should record its path`).toBe(filePath);
      expect(file?.content, `${entry} should preserve content`).toBe(content);

      // Fixtures sized so at least one section or directive is produced.
      const hasSomeStructure = result.sections.length > 0 || result.directives.length > 0;
      expect(hasSomeStructure, `${entry} should produce at least one section or directive`).toBe(
        true,
      );
    }
  });
});
