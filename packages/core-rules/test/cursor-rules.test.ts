import { describe, expect, it } from 'vitest';

import { parseCursorRules } from '../src/parser/index.js';

describe('parseCursorRules — plain text', () => {
  it('parses plain markdown content', () => {
    const content = `# Cursor Rules\n\n- MUST be concise.\n- SHOULD avoid hedging.\n`;
    const result = parseCursorRules(content, { filePath: '.cursorrules' });

    expect(result.format).toBe('cursor-rules');
    expect(result.parseErrors).toEqual([]);
    expect(result.directives.length).toBeGreaterThanOrEqual(2);
    const file = result.files[0];
    expect(file?.kind).toBe('cursor-rules');
  });
});

describe('parseCursorRules — JSON object', () => {
  it('extracts directives from a structured JSON config', () => {
    const json = JSON.stringify({
      version: '1.0',
      rules: [
        {
          name: 'TypeScript',
          rules: ['MUST use ES modules.', 'MUST NOT use any.', 'SHOULD prefer const.'],
        },
        {
          name: 'React',
          rules: ['MUST be function components.', 'SHOULD keep components small.'],
        },
      ],
    });

    const result = parseCursorRules(json, { filePath: '.cursorrules' });

    expect(result.parseErrors).toEqual([]);
    const texts = result.directives.map((directive) => directive.text);
    expect(texts).toContain('MUST use ES modules.');
    expect(texts).toContain('MUST NOT use any.');
    expect(texts).toContain('SHOULD prefer const.');
    expect(texts).toContain('MUST be function components.');
  });
});

describe('parseCursorRules — JSON array of strings', () => {
  it('extracts each string as a directive', () => {
    const json = JSON.stringify(['MUST commit Prettier output.', 'SHOULD avoid hard tabs.']);

    const result = parseCursorRules(json, { filePath: '.cursorrules' });

    expect(result.parseErrors).toEqual([]);
    const texts = result.directives.map((directive) => directive.text);
    expect(texts).toContain('MUST commit Prettier output.');
    expect(texts).toContain('SHOULD avoid hard tabs.');
  });
});

describe('parseCursorRules — malformed JSON', () => {
  it('returns a parse error rather than throwing', () => {
    const content = '{"rules": ["x"],}\n';
    const result = parseCursorRules(content, { filePath: '.cursorrules' });

    expect(result.parseErrors.length).toBeGreaterThan(0);
    const firstError = result.parseErrors[0];
    expect(firstError?.severity).toBe('error');
    expect(firstError?.message).toMatch(/Invalid JSON/i);
    expect(result.directives).toEqual([]);
  });
});
