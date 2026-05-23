import type { RuleFileKind } from '@sherpa-labs/shared-types';

export interface DetectFormatInput {
  readonly path?: string;
  readonly content?: string;
}

export function detectFormatFromPath(filePath: string): RuleFileKind {
  const normalized = filePath.replace(/\\/g, '/');
  const lower = normalized.toLowerCase();
  const base = lower.split('/').pop() ?? lower;

  if (base === 'claude.md' || base.endsWith('.claude.md')) {
    return 'claude-md';
  }

  if (base === 'agents.md' || base.endsWith('.agents.md')) {
    return 'agents-md';
  }

  if (base === '.cursorrules') {
    return 'cursor-rules';
  }

  if (lower.includes('.cursor/rules/') && base.endsWith('.md')) {
    return 'cursor-rule';
  }

  if (base === '.windsurfrules' || base === 'windsurfrules.md') {
    return 'windsurf-rules';
  }

  if (lower.endsWith('.continue/config.yaml') || lower.endsWith('.continue/config.yml')) {
    return 'continue-config';
  }

  return 'unknown';
}

export function detectFormatFromContent(content: string): RuleFileKind {
  const trimmed = content.trimStart();

  if (trimmed.length === 0) {
    return 'unknown';
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed);
      return 'cursor-rules';
    } catch {
      // Not JSON — fall through to other checks.
    }
  }

  const yamlSignature =
    /^(models|customCommands|systemMessage|slashCommands|contextProviders|allowAnonymousTelemetry|rules|name|schema):/m;

  if (yamlSignature.test(trimmed) && !trimmed.startsWith('#')) {
    return 'continue-config';
  }

  if (/^#{1,6}\s+\S/m.test(trimmed)) {
    return 'claude-md';
  }

  return 'unknown';
}

export function detectFormat(input: DetectFormatInput): RuleFileKind {
  if (input.path !== undefined && input.path !== '') {
    const fromPath = detectFormatFromPath(input.path);
    if (fromPath !== 'unknown') {
      return fromPath;
    }
  }

  if (input.content !== undefined) {
    return detectFormatFromContent(input.content);
  }

  return 'unknown';
}
