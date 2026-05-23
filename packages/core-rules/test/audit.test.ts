import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { parseClaudeMd } from '../src/parser/index.js';
import {
  calculateAuditScore,
  createAuditContext,
  createAuditRuleRegistry,
  defaultAuditRules,
  loadAuditConfig,
  resolveAuditConfig,
  runAudit,
  type AuditRule,
} from '../src/audit/index.js';
import type { StackContext } from '@sherpa-labs/shared-types';

const SAMPLE_RULES = `# Rules

- MUST keep changes small.
- SHOULD run tests.
`;

const STACK_CONTEXT: StackContext = {
  rootPath: '/repo',
  languages: ['typescript'],
  frameworks: ['nextjs'],
  packageManagers: ['pnpm'],
  manifests: [],
  aiTools: [],
  hasTypeScript: true,
  warnings: [],
};

describe('audit rules', () => {
  it('executes a rule plugin and produces a deterministic audit result', async () => {
    const ruleSet = parseClaudeMd(SAMPLE_RULES, { filePath: 'CLAUDE.md' });
    const rule: AuditRule = {
      id: 'custom.directive-check',
      severity: 'info',
      title: 'Checks for directives',
      description: 'Confirms the rule set contains directives.',
      check(context) {
        return context.ruleSet.directives.length > 0
          ? [{ message: 'Directives are present.', category: 'custom', fixHint: 'None needed.' }]
          : [];
      },
    };

    const result = await runAudit(
      {
        ruleSet,
        stack: STACK_CONTEXT,
      },
      {
        rules: [rule],
        now: () => new Date('2026-05-23T00:00:00.000Z'),
      },
    );

    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]?.ruleId).toBe(rule.id);
    expect(result.violations[0]?.severity).toBe('info');
    expect(result.summary.infoCount).toBe(1);
    expect(result.auditedAt).toBe('2026-05-23T00:00:00.000Z');
  });

  it('loads the sample rules from the rules directory module', () => {
    const registry = createAuditRuleRegistry(defaultAuditRules);

    expect(registry.getRules().map((rule) => rule.id)).toEqual(
      expect.arrayContaining(['core.parse-errors', 'core.parse-warnings']),
    );
  });

  it('disables a rule via config', () => {
    const registry = createAuditRuleRegistry(defaultAuditRules);
    const config = resolveAuditConfig({ disabledRules: ['core.parse-errors'] });
    const enabledRuleIds = registry.getEnabledRules(config).map((rule) => rule.id);

    expect(enabledRuleIds).not.toContain('core.parse-errors');
    expect(enabledRuleIds).toContain('core.parse-warnings');
  });

  it('applies a severity override via config', () => {
    const registry = createAuditRuleRegistry(defaultAuditRules);
    const config = resolveAuditConfig({ severityOverrides: { 'core.parse-warnings': 'error' } });

    expect(
      registry.getEnabledRules(config).find((rule) => rule.id === 'core.parse-warnings')?.severity,
    ).toBe('error');
  });

  it('calculates scores deterministically', () => {
    const violations = [
      { severity: 'error' as const },
      { severity: 'warning' as const },
      { severity: 'info' as const },
    ];

    expect(calculateAuditScore(violations)).toEqual(calculateAuditScore(violations));
  });

  it('clamps scores to the 0-100 range', () => {
    const lowScore = calculateAuditScore(
      Array.from({ length: 20 }, () => ({ severity: 'error' as const })),
    );
    const highScore = calculateAuditScore([{ severity: 'warning' as const }], {
      severityWeights: { error: 25, warning: 25, info: 25 },
    });

    expect(lowScore.score).toBe(0);
    expect(highScore.score).toBe(100);
  });

  it('creates a context with parsed RuleSet, StackContext, and file metadata', () => {
    const ruleSet = parseClaudeMd(SAMPLE_RULES, { filePath: 'CLAUDE.md' });
    const context = createAuditContext({ ruleSet, stack: STACK_CONTEXT });

    expect(context.ruleSet).toBe(ruleSet);
    expect(context.stack).toBe(STACK_CONTEXT);
    expect(context.fileMetadata).toHaveLength(1);
    expect(context.fileMetadata[0]?.path).toBe('CLAUDE.md');
    expect(context.fileMetadata[0]?.tokenCount).toBeGreaterThan(0);
    expect(context.totalTokenCount).toBe(context.fileMetadata[0]?.tokenCount ?? 0);
  });
});

describe('audit config loading', () => {
  it('uses defaults when .sherpa.json is missing', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'sherpa-audit-'));

    try {
      const result = await loadAuditConfig({ rootPath });

      expect(result.issues).toEqual([]);
      expect(result.config).toEqual(resolveAuditConfig());
    } finally {
      await rm(rootPath, { recursive: true, force: true });
    }
  });

  it('returns a useful error for malformed .sherpa.json', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'sherpa-audit-'));
    const configPath = join(rootPath, '.sherpa.json');

    try {
      await writeFile(configPath, '{"audit": {', 'utf8');

      const result = await loadAuditConfig({ rootPath });

      expect(result.issues[0]?.code).toBe('malformed_json');
      expect(result.issues[0]?.severity).toBe('error');
      expect(result.issues[0]?.message).toContain('.sherpa.json');
      expect(result.config).toEqual(resolveAuditConfig());
    } finally {
      await rm(rootPath, { recursive: true, force: true });
    }
  });
});
