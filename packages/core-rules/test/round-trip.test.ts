import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  normalizeForRoundTrip,
  parseAgentsMd,
  parseClaudeMd,
  parseContinueConfig,
  parseCursorRules,
  parseWindsurfRules,
  serializeRuleSet,
} from '../src/parser/index.js';

const FIXTURES_ROOT = join(import.meta.dirname, 'fixtures');

describe('round-trip serialization', () => {
  it('round-trips parseClaudeMd → serializeRuleSet for every CLAUDE.md fixture', async () => {
    const dir = join(FIXTURES_ROOT, 'claude-md');
    const entries = (await readdir(dir)).filter((name) => name.endsWith('.md')).sort();

    expect(entries.length).toBeGreaterThanOrEqual(20);

    for (const entry of entries) {
      const filePath = join(dir, entry);
      const content = await readFile(filePath, 'utf8');

      const parsed = parseClaudeMd(content, { filePath });
      expect(parsed.parseErrors, `fixture ${entry} should parse without errors`).toEqual([]);

      const serialized = serializeRuleSet(parsed);
      expect(normalizeForRoundTrip(serialized), `fixture ${entry} round-trip mismatch`).toBe(
        normalizeForRoundTrip(content),
      );
    }
  });

  it('round-trips AGENTS.md', async () => {
    const filePath = join(FIXTURES_ROOT, 'other-formats', 'AGENTS.md');
    const content = await readFile(filePath, 'utf8');
    const parsed = parseAgentsMd(content, { filePath });
    expect(parsed.parseErrors).toEqual([]);
    expect(normalizeForRoundTrip(serializeRuleSet(parsed))).toBe(normalizeForRoundTrip(content));
  });

  it('round-trips .windsurfrules', async () => {
    const filePath = join(FIXTURES_ROOT, 'other-formats', '.windsurfrules');
    const content = await readFile(filePath, 'utf8');
    const parsed = parseWindsurfRules(content, { filePath });
    expect(parsed.parseErrors).toEqual([]);
    expect(normalizeForRoundTrip(serializeRuleSet(parsed))).toBe(normalizeForRoundTrip(content));
  });

  it('round-trips plain text .cursorrules', async () => {
    const filePath = join(FIXTURES_ROOT, 'cursor', 'plain.cursorrules');
    const content = await readFile(filePath, 'utf8');
    const parsed = parseCursorRules(content, { filePath });
    expect(parsed.parseErrors).toEqual([]);
    expect(normalizeForRoundTrip(serializeRuleSet(parsed))).toBe(normalizeForRoundTrip(content));
  });

  it('preserves the original content for JSON .cursorrules', async () => {
    const filePath = join(FIXTURES_ROOT, 'cursor', 'structured.cursorrules');
    const content = await readFile(filePath, 'utf8');
    const parsed = parseCursorRules(content, { filePath });
    expect(parsed.parseErrors).toEqual([]);
    expect(normalizeForRoundTrip(serializeRuleSet(parsed))).toBe(normalizeForRoundTrip(content));
  });

  it('preserves the original content for Continue YAML', async () => {
    const filePath = join(FIXTURES_ROOT, 'other-formats', 'continue.config.yaml');
    const content = await readFile(filePath, 'utf8');
    const parsed = parseContinueConfig(content, { filePath });
    expect(parsed.parseErrors).toEqual([]);
    expect(normalizeForRoundTrip(serializeRuleSet(parsed))).toBe(normalizeForRoundTrip(content));
  });
});
