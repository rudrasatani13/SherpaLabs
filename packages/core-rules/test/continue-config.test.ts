import { describe, expect, it } from 'vitest';

import { parseContinueConfig } from '../src/parser/index.js';

const VALID_YAML = `name: Demo
models:
  - title: Claude
    provider: anthropic
    model: claude-sonnet-4-6
systemMessage: |
  MUST NOT log secrets.
  SHOULD use Vitest.
customCommands:
  - name: refactor
    prompt: Refactor selected code without changing behavior.
    description: Refactor helper
rules:
  - MUST keep diffs small.
  - MAY use Playwright for end-to-end tests.
`;

const BROKEN_YAML = `models:
  - title: Claude
    apiKey: \${ANTHROPIC_API_KEY
systemMessage: this :: is :: broken
`;

describe('parseContinueConfig', () => {
  it('parses a valid Continue config and extracts directives from rules and prompts', () => {
    const result = parseContinueConfig(VALID_YAML, { filePath: '.continue/config.yaml' });

    expect(result.format).toBe('continue-config');
    expect(result.parseErrors).toEqual([]);

    const texts = result.directives.map((directive) => directive.text);
    expect(texts.some((text) => text.includes('MUST NOT log secrets'))).toBe(true);
    expect(texts.some((text) => text.includes('Refactor selected code'))).toBe(true);
    expect(texts.some((text) => text.includes('MUST keep diffs small'))).toBe(true);
    expect(texts.some((text) => text.includes('MAY use Playwright'))).toBe(true);
  });

  it('returns a parse error for broken YAML without throwing', () => {
    const result = parseContinueConfig(BROKEN_YAML, { filePath: '.continue/config.yaml' });

    expect(result.parseErrors.length).toBeGreaterThan(0);
    const firstError = result.parseErrors[0];
    expect(firstError?.severity).toBe('error');
    expect(firstError?.message).toMatch(/Invalid YAML/i);
  });
});
