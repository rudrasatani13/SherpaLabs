import { describe, expect, it } from 'vitest';

import { parseAgentsMd, parseClaudeMd, parseWindsurfRules } from '../src/parser/index.js';

const SAMPLE = `# Title

Some preamble.

## Section A

- MUST do X.
- SHOULD do Y.
- MAY do Z.

\`\`\`ts
const x = 1;
\`\`\`

## Section B

> Important: keep changes small.

- MUST NOT skip tests.
`;

describe('parseClaudeMd', () => {
  it('returns a RuleSet with the correct format and one file', () => {
    const result = parseClaudeMd(SAMPLE, { filePath: 'CLAUDE.md' });

    expect(result.format).toBe('claude-md');
    expect(result.files).toHaveLength(1);
    const file = result.files[0];
    expect(file).toBeDefined();
    if (file !== undefined) {
      expect(file.kind).toBe('claude-md');
      expect(file.path).toBe('CLAUDE.md');
      expect(file.content).toBe(SAMPLE);
    }
    expect(result.parseErrors).toEqual([]);
  });

  it('groups content into sections at headings', () => {
    const result = parseClaudeMd(SAMPLE);

    const headings = result.sections.map((section) => section.heading?.text ?? null);

    expect(headings).toContain('Title');
    expect(headings).toContain('Section A');
    expect(headings).toContain('Section B');
  });

  it('extracts directives from list items with priority detection', () => {
    const result = parseClaudeMd(SAMPLE);

    const directiveTexts = result.directives.map((directive) => directive.text);
    expect(directiveTexts.some((text) => text.includes('MUST do X'))).toBe(true);
    expect(directiveTexts.some((text) => text.includes('SHOULD do Y'))).toBe(true);
    expect(directiveTexts.some((text) => text.includes('MAY do Z'))).toBe(true);

    const priorities = result.directives.map((directive) => directive.priority);
    expect(priorities).toContain('must');
    expect(priorities).toContain('should');
    expect(priorities).toContain('may');
  });

  it('extracts code blocks with language metadata', () => {
    const result = parseClaudeMd(SAMPLE);

    expect(result.codeBlocks.length).toBeGreaterThan(0);
    const tsBlock = result.codeBlocks.find((block) => block.language === 'ts');
    expect(tsBlock).toBeDefined();
    expect(tsBlock?.code).toContain('const x = 1');
  });

  it('records section locations with line numbers', () => {
    const result = parseClaudeMd(SAMPLE, { filePath: 'CLAUDE.md' });

    for (const section of result.sections) {
      expect(section.location).toBeDefined();
      expect(section.location?.startLine).toBeGreaterThan(0);
      expect(section.location?.endLine).toBeGreaterThanOrEqual(section.location?.startLine ?? 0);
      if (section.location?.filePath !== undefined) {
        expect(section.location.filePath).toBe('CLAUDE.md');
      }
    }
  });

  it('extracts blockquote text as a directive', () => {
    const result = parseClaudeMd(SAMPLE);
    const directives = result.directives.map((directive) => directive.text);
    expect(directives.some((text) => /keep changes small/i.test(text))).toBe(true);
  });

  it('returns an empty-but-valid RuleSet for empty input', () => {
    const result = parseClaudeMd('');
    expect(result.format).toBe('claude-md');
    expect(result.parseErrors).toEqual([]);
    expect(result.sections.length).toBeLessThanOrEqual(1);
  });
});

describe('parseAgentsMd', () => {
  it('uses agents-md as kind', () => {
    const result = parseAgentsMd('# AGENTS\n\n- MUST do X.', { filePath: 'AGENTS.md' });
    expect(result.format).toBe('agents-md');
    const file = result.files[0];
    expect(file?.kind).toBe('agents-md');
  });
});

describe('parseWindsurfRules', () => {
  it('uses windsurf-rules as kind', () => {
    const result = parseWindsurfRules('# Windsurf\n\n- MUST be polite.', {
      filePath: '.windsurfrules',
    });
    expect(result.format).toBe('windsurf-rules');
    const file = result.files[0];
    expect(file?.kind).toBe('windsurf-rules');
  });
});
