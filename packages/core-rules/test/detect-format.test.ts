import { describe, expect, it } from 'vitest';

import {
  detectFormat,
  detectFormatFromContent,
  detectFormatFromPath,
} from '../src/parser/detect-format.js';

describe('detectFormatFromPath', () => {
  it('detects CLAUDE.md by basename', () => {
    expect(detectFormatFromPath('CLAUDE.md')).toBe('claude-md');
    expect(detectFormatFromPath('/some/repo/CLAUDE.md')).toBe('claude-md');
    expect(detectFormatFromPath('apps/web/CLAUDE.md')).toBe('claude-md');
  });

  it('detects AGENTS.md', () => {
    expect(detectFormatFromPath('AGENTS.md')).toBe('agents-md');
    expect(detectFormatFromPath('/repo/AGENTS.md')).toBe('agents-md');
  });

  it('detects .cursorrules', () => {
    expect(detectFormatFromPath('.cursorrules')).toBe('cursor-rules');
    expect(detectFormatFromPath('/repo/.cursorrules')).toBe('cursor-rules');
  });

  it('detects a single cursor rule file', () => {
    expect(detectFormatFromPath('.cursor/rules/typescript.md')).toBe('cursor-rule');
    expect(detectFormatFromPath('/repo/.cursor/rules/react.md')).toBe('cursor-rule');
  });

  it('detects .windsurfrules', () => {
    expect(detectFormatFromPath('.windsurfrules')).toBe('windsurf-rules');
  });

  it('detects continue config yaml', () => {
    expect(detectFormatFromPath('.continue/config.yaml')).toBe('continue-config');
    expect(detectFormatFromPath('/repo/.continue/config.yml')).toBe('continue-config');
  });

  it('returns unknown for arbitrary paths', () => {
    expect(detectFormatFromPath('README.md')).toBe('unknown');
    expect(detectFormatFromPath('package.json')).toBe('unknown');
  });
});

describe('detectFormatFromContent', () => {
  it('detects JSON cursor rules', () => {
    expect(detectFormatFromContent('{"rules":["x"]}')).toBe('cursor-rules');
    expect(detectFormatFromContent('  [ "MUST do X" ] ')).toBe('cursor-rules');
  });

  it('detects continue YAML by signature keys', () => {
    expect(detectFormatFromContent('models:\n  - title: foo')).toBe('continue-config');
    expect(detectFormatFromContent('systemMessage: hello')).toBe('continue-config');
  });

  it('detects markdown headings as claude-md', () => {
    expect(detectFormatFromContent('# Title\n\nSome rules')).toBe('claude-md');
  });

  it('returns unknown for empty content', () => {
    expect(detectFormatFromContent('')).toBe('unknown');
    expect(detectFormatFromContent('   \n  ')).toBe('unknown');
  });
});

describe('detectFormat (combined)', () => {
  it('prefers path detection when both are available', () => {
    expect(detectFormat({ path: 'CLAUDE.md', content: '# Heading' })).toBe('claude-md');
  });

  it('falls back to content when path is unknown', () => {
    expect(detectFormat({ path: 'unknown-file', content: '# Heading' })).toBe('claude-md');
  });

  it('returns unknown when nothing matches', () => {
    expect(detectFormat({})).toBe('unknown');
  });
});
