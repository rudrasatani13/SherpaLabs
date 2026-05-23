import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  AuditCategory,
  RuleSet,
  StackContext,
  ViolationSeverity,
} from '@sherpa-labs/shared-types';
import { describe, expect, it } from 'vitest';
import { runAudit, type AuditRule } from '../src/audit/index.js';
import {
  ambiguousInstructionsRule,
  conflictingDirectivesRule,
  crossFileContradictionsRule,
  defaultAuditRules,
  duplicateSectionsRule,
  heuristicAuditRules,
  missingExamplesRule,
  missingPrioritySignalsRule,
  missingStackContextRule,
  outdatedToolReferencesRule,
  tokenBudgetOverrunRule,
  unbalancedSectionsRule,
  vagueDirectivesRule,
  verbosePreambleRule,
} from '../src/audit/rules/index.js';
import { parseClaudeMd, parseCursorRules } from '../src/parser/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUDIT_FIXTURE_ROOT = join(__dirname, 'fixtures/audit');
const FIXED_NOW = new Date('2026-05-23T00:00:00.000Z');

const STACK_CONTEXT: StackContext = {
  rootPath: '/repo',
  languages: ['typescript'],
  frameworks: ['nextjs', 'react'],
  packageManagers: ['pnpm'],
  manifests: [],
  aiTools: [],
  hasTypeScript: true,
  warnings: [],
};

describe('heuristic audit rules', () => {
  it('A1 flags files over the configured token budget and accepts smaller fixtures', async () => {
    const passing = await auditSingleRule(
      tokenBudgetOverrunRule,
      await parseClaudeFixture('token-budget.good.md'),
      { config: { thresholds: { maxFileTokens: 40 } } },
    );
    const failing = await auditSingleRule(
      tokenBudgetOverrunRule,
      await parseClaudeFixture('token-budget.bad.md'),
      { config: { thresholds: { maxFileTokens: 40 } } },
    );

    expect(passing.violations).toHaveLength(0);
    expectSingleViolation(failing, tokenBudgetOverrunRule, 'token-budget');
    expect(failing.violations[0]?.message).toContain('exceeds the 40 token file budget');
  });

  it('A2 flags direct contradictions inside one file and accepts consistent directives', async () => {
    const passing = await auditSingleRule(
      conflictingDirectivesRule,
      await parseClaudeFixture('known-good.md'),
    );
    const failing = await auditSingleRule(
      conflictingDirectivesRule,
      await parseClaudeFixture('known-bad.md'),
    );

    expect(passing.violations).toHaveLength(0);
    expect(failing.violations.length).toBeGreaterThanOrEqual(5);
    expectSingleViolation(failing, conflictingDirectivesRule, 'conflict');
    expect(failing.violations.map((violation) => violation.message).join('\n')).toContain('pnpm');
  });

  it('A3 flags vague directives and accepts concrete rule language', async () => {
    const passing = await auditSingleRule(
      vagueDirectivesRule,
      await parseClaudeFixture('known-good.md'),
    );
    const failing = await auditSingleRule(
      vagueDirectivesRule,
      await parseClaudeFixture('known-bad.md'),
    );

    expect(passing.violations).toHaveLength(0);
    expect(failing.violations.length).toBeGreaterThanOrEqual(5);
    expectSingleViolation(failing, vagueDirectivesRule, 'vague-directive');
    expect(failing.violations[0]?.fixHint).toContain('measurable rule');
  });

  it('A4 flags rule sets that ignore detected stack context and accepts stack-aware rules', async () => {
    const passing = await auditSingleRule(
      missingStackContextRule,
      await parseClaudeFixture('known-good.md'),
    );
    const failing = await auditSingleRule(
      missingStackContextRule,
      await parseClaudeFixture('missing-priority.md'),
    );

    expect(passing.violations).toHaveLength(0);
    expectSingleViolation(failing, missingStackContextRule, 'missing-context');
    expect(failing.violations[0]?.message).toContain('TypeScript');
    expect(failing.violations[0]?.message).toContain('Next.js');
  });

  it('A5 flags cross-file contradictions and accepts clean companion files', async () => {
    const passing = await auditSingleRule(
      crossFileContradictionsRule,
      await mergeFixtures([
        ['false-positive/CLAUDE.md', 'claude'],
        ['false-positive/.cursorrules', 'cursor'],
      ]),
    );
    const failing = await auditSingleRule(
      crossFileContradictionsRule,
      await mergeFixtures([
        ['cross-file-claude.md', 'claude'],
        ['cross-file-cursor.cursorrules', 'cursor'],
      ]),
    );

    expect(passing.violations).toHaveLength(0);
    expectSingleViolation(failing, crossFileContradictionsRule, 'conflict');
    expect(failing.violations[0]?.message).toContain('cross-file-claude.md');
    expect(failing.violations[0]?.message).toContain('cross-file-cursor.cursorrules');
  });

  it('A6 flags duplicate sections across files and accepts distinct companion files', async () => {
    const passing = await auditSingleRule(
      duplicateSectionsRule,
      await mergeFixtures([
        ['false-positive/CLAUDE.md', 'claude'],
        ['false-positive/.cursorrules', 'cursor'],
      ]),
    );
    const failing = await auditSingleRule(
      duplicateSectionsRule,
      await mergeFixtures([
        ['duplicate-a.md', 'claude'],
        ['duplicate-b.md', 'claude'],
      ]),
    );

    expect(passing.violations).toHaveLength(0);
    expectSingleViolation(failing, duplicateSectionsRule, 'duplication');
    expect(failing.violations[0]?.message).toContain('duplicates');
  });

  it('A7 flags deterministic outdated tool references and accepts current references', async () => {
    const passing = await auditSingleRule(
      outdatedToolReferencesRule,
      await parseClaudeFixture('known-good.md'),
    );
    const failing = await auditSingleRule(
      outdatedToolReferencesRule,
      await parseClaudeFixture('outdated.md'),
    );

    expect(passing.violations).toHaveLength(0);
    expect(failing.violations.length).toBe(3);
    expectSingleViolation(failing, outdatedToolReferencesRule, 'outdated-reference');
    expect(failing.violations.map((violation) => violation.message).join('\n')).toContain(
      'Node.js 12/14/16',
    );
  });

  it('A8 flags missing priority signals and accepts RFC-style priority words', async () => {
    const passing = await auditSingleRule(
      missingPrioritySignalsRule,
      await parseClaudeFixture('known-good.md'),
    );
    const failing = await auditSingleRule(
      missingPrioritySignalsRule,
      await parseClaudeFixture('missing-priority.md'),
    );

    expect(passing.violations).toHaveLength(0);
    expectSingleViolation(failing, missingPrioritySignalsRule, 'priority-signal');
    expect(failing.violations[0]?.message).toContain('MUST');
  });

  it('A9 flags verbose preambles and accepts short setup before rules', async () => {
    const passing = await auditSingleRule(
      verbosePreambleRule,
      await parseClaudeFixture('known-good.md'),
    );
    const failing = await auditSingleRule(
      verbosePreambleRule,
      await parseClaudeFixture('known-bad.md'),
    );

    expect(passing.violations).toHaveLength(0);
    expectSingleViolation(failing, verbosePreambleRule, 'structure');
    expect(failing.violations[0]?.message).toContain('before its first actionable directive');
  });

  it('A10 flags an oversized section and accepts balanced sections', async () => {
    const passing = await auditSingleRule(
      unbalancedSectionsRule,
      await parseClaudeFixture('known-good.md'),
    );
    const failing = await auditSingleRule(
      unbalancedSectionsRule,
      await parseClaudeFixture('unbalanced.md'),
    );

    expect(passing.violations).toHaveLength(0);
    expectSingleViolation(failing, unbalancedSectionsRule, 'structure');
    expect(failing.violations[0]?.message).toContain('longer than the median peer section');
  });

  it('A11 flags missing examples and accepts concrete code examples', async () => {
    const passing = await auditSingleRule(
      missingExamplesRule,
      await parseClaudeFixture('known-good.md'),
    );
    const failing = await auditSingleRule(
      missingExamplesRule,
      await parseClaudeFixture('known-bad.md'),
    );

    expect(passing.violations).toHaveLength(0);
    expectSingleViolation(failing, missingExamplesRule, 'examples');
    expect(failing.violations[0]?.message).toContain('no code blocks');
  });

  it('A12 flags ambiguous qualifiers and accepts explicit conditions', async () => {
    const passing = await auditSingleRule(
      ambiguousInstructionsRule,
      await parseClaudeFixture('known-good.md'),
    );
    const failing = await auditSingleRule(
      ambiguousInstructionsRule,
      await parseClaudeFixture('ambiguous.md'),
    );

    expect(passing.violations).toHaveLength(0);
    expect(failing.violations.length).toBeGreaterThanOrEqual(3);
    expectSingleViolation(failing, ambiguousInstructionsRule, 'ambiguity');
    expect(failing.violations[0]?.message).toContain('ambiguous qualifier');
  });

  it('keeps parse-problem rules and appends all heuristic rules to defaultAuditRules', () => {
    const ids = defaultAuditRules.map((rule) => rule.id);

    expect(ids.slice(0, 2)).toEqual(['core.parse-errors', 'core.parse-warnings']);
    expect(ids).toEqual(expect.arrayContaining(heuristicAuditRules.map((rule) => rule.id)));
    expect(heuristicAuditRules).toHaveLength(12);
  });

  it('scores the known-good fixture at or above 85', async () => {
    const result = await auditDefaultRules(await parseClaudeFixture('known-good.md'));

    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.violations).toHaveLength(0);
  });

  it('scores the known-bad fixture at or below 50', async () => {
    const result = await auditDefaultRules(await parseClaudeFixture('known-bad.md'));

    expect(result.score).toBeLessThanOrEqual(50);
    expect(result.violations.map((violation) => violation.ruleId)).toEqual(
      expect.arrayContaining([
        conflictingDirectivesRule.id,
        vagueDirectivesRule.id,
        outdatedToolReferencesRule.id,
        verbosePreambleRule.id,
        missingExamplesRule.id,
        ambiguousInstructionsRule.id,
      ]),
    );
  });

  it('keeps false positives below 5% on real-world-style clean fixtures', async () => {
    const result = await auditDefaultRules(
      await mergeFixtures([
        ['false-positive/CLAUDE.md', 'claude'],
        ['false-positive/.cursorrules', 'cursor'],
      ]),
    );
    const falsePositiveRate = result.violations.length / heuristicAuditRules.length;

    // Approximation: one clean mixed-tool fixture set exercises all heuristic rules; zero reported violations is a 0% observed false-positive rate.
    expect(falsePositiveRate).toBeLessThan(0.05);
    expect(result.violations).toHaveLength(0);
  });
});

async function auditSingleRule(
  rule: AuditRule,
  ruleSet: RuleSet,
  options: { readonly config?: Parameters<typeof runAudit>[0]['config'] } = {},
): Promise<Awaited<ReturnType<typeof runAudit>>> {
  return runAudit(
    {
      ruleSet,
      stack: STACK_CONTEXT,
      ...(options.config !== undefined ? { config: options.config } : {}),
    },
    { rules: [rule], now: () => FIXED_NOW },
  );
}

async function auditDefaultRules(ruleSet: RuleSet): Promise<Awaited<ReturnType<typeof runAudit>>> {
  return runAudit({ ruleSet, stack: STACK_CONTEXT }, { now: () => FIXED_NOW });
}

async function parseClaudeFixture(name: string): Promise<RuleSet> {
  const content = await readAuditFixture(name);
  return parseClaudeMd(content, { filePath: name });
}

async function parseCursorFixture(name: string): Promise<RuleSet> {
  const content = await readAuditFixture(name);
  return parseCursorRules(content, { filePath: name });
}

async function mergeFixtures(
  fixtures: readonly (readonly [name: string, parser: 'claude' | 'cursor'])[],
): Promise<RuleSet> {
  const ruleSets = await Promise.all(
    fixtures.map(([name, parser]) =>
      parser === 'claude' ? parseClaudeFixture(name) : parseCursorFixture(name),
    ),
  );

  return {
    id: `merged:${fixtures.map(([name]) => name).join('|')}`,
    format: 'mixed',
    files: ruleSets.flatMap((ruleSet) => ruleSet.files),
    sections: ruleSets.flatMap((ruleSet) => ruleSet.sections),
    directives: ruleSets.flatMap((ruleSet) => ruleSet.directives),
    codeBlocks: ruleSets.flatMap((ruleSet) => ruleSet.codeBlocks),
    parseErrors: ruleSets.flatMap((ruleSet) => ruleSet.parseErrors),
  };
}

async function readAuditFixture(name: string): Promise<string> {
  return readFile(join(AUDIT_FIXTURE_ROOT, name), 'utf8');
}

function expectSingleViolation(
  result: Awaited<ReturnType<typeof runAudit>>,
  rule: AuditRule,
  category: AuditCategory,
  severity: ViolationSeverity = rule.severity,
): void {
  expect(result.violations.length).toBeGreaterThanOrEqual(1);
  expect(result.violations[0]).toMatchObject({
    ruleId: rule.id,
    severity,
    category,
  });
  expect(result.violations[0]?.message).toBeTruthy();
  expect(result.violations[0]?.fixHint).toBeTruthy();
}
