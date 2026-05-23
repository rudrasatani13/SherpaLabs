import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AuditCategory, AuditResult, StackContext } from '@sherpa-labs/shared-types';
import { describe, expect, it } from 'vitest';
import {
  auditReportJsonSchema,
  createAuditReportJsonObject,
  createAuditReportModel,
  formatAuditReportJson,
  formatAuditReportMarkdown,
  formatAuditReportTerminal,
  getTopAuditRecommendations,
  getViolationFixHint,
  groupViolationsBySeverity,
  normalizeAuditReportViolations,
  validateAuditReportJson,
} from '../src/audit/index.js';
import { runAudit } from '../src/audit/index.js';
import { parseClaudeMd } from '../src/parser/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUDIT_FIXTURE_ROOT = join(__dirname, 'fixtures/audit');
const FIXED_NOW = new Date('2026-05-23T00:00:00.000Z');
const GENERATED_AT = '2026-05-23T00:05:00.000Z';

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

const MANUAL_AUDIT_RESULT = {
  id: 'audit-report-manual',
  ruleSetId: 'rules-manual',
  score: 52,
  maxScore: 100,
  passed: false,
  auditedAt: '2026-05-23T00:00:00.000Z',
  summary: {
    errorCount: 1,
    warningCount: 3,
    infoCount: 1,
    recommendationCount: 0,
  },
  recommendations: [],
  violations: [
    {
      id: 'violation-conflict',
      ruleId: 'heuristic.conflicting-directives',
      severity: 'error',
      category: 'conflict',
      message: 'Two directives disagree about package manager policy.',
      location: { filePath: 'CLAUDE.md', startLine: 4, startColumn: 3 },
    },
    {
      id: 'violation-priority-a',
      ruleId: 'heuristic.missing-priority-signals',
      severity: 'warning',
      category: 'priority-signal',
      message: 'Rules do not mark required guidance with priority words.',
      location: { filePath: 'CLAUDE.md', startLine: 8 },
    },
    {
      id: 'violation-priority-b',
      ruleId: 'heuristic.missing-priority-signals',
      severity: 'warning',
      category: 'priority-signal',
      message: 'A second section lacks MUST, SHOULD, or MAY wording.',
      location: { filePath: 'CLAUDE.md', startLine: 14 },
    },
    {
      id: 'violation-outdated',
      ruleId: 'heuristic.outdated-tool-references',
      severity: 'warning',
      category: 'outdated-reference',
      message: 'Node 12 is no longer an appropriate default runtime.',
      fixHint: 'Replace Node 12 guidance with the supported runtime version.',
      location: { filePath: 'CLAUDE.md', startLine: 20 },
    },
    {
      id: 'violation-examples',
      ruleId: 'heuristic.missing-examples',
      severity: 'info',
      category: 'examples',
      message: 'Rules do not include a concrete example.',
      fixHint: 'Add one short before/after example.',
      location: { filePath: 'CLAUDE.md', startLine: 24 },
    },
  ],
} satisfies AuditResult;

describe('audit reporting', () => {
  it('renders readable terminal output and supports ANSI color control', () => {
    const plain = formatAuditReportTerminal(MANUAL_AUDIT_RESULT, {
      colors: false,
      maxViolationsPerSeverity: 2,
    });
    const colored = formatAuditReportTerminal(MANUAL_AUDIT_RESULT, { colors: true });

    expect(plain).toContain('Sherpa Labs Audit Report');
    expect(plain).toContain('Score: 52/100 FAIL');
    expect(plain).toContain('Top Recommendations');
    expect(plain).toContain('Quick Wins');
    expect(plain).toContain('ERROR (1)');
    expect(plain).toContain('WARNING (3)');
    expect(plain).toContain('Fix:');
    expect(plain).toContain('... 1 more not shown');
    expect(plain).not.toContain('\u001B[');
    expect(colored).toContain('\u001B[');
  });

  it('emits stable JSON that validates against the documented report schema', () => {
    const report = createAuditReportJsonObject(MANUAL_AUDIT_RESULT, {
      generatedAt: GENERATED_AT,
      maxRecommendations: 4,
      maxQuickWins: 3,
    });
    const validation = validateAuditReportJson(report);
    const formatted = formatAuditReportJson(MANUAL_AUDIT_RESULT, {
      generatedAt: GENERATED_AT,
      pretty: false,
    });
    const parsed = JSON.parse(formatted) as unknown;

    expect(auditReportJsonSchema.$id).toBe('https://sherpa-labs.io/schemas/audit-report.v1.json');
    expect(auditReportJsonSchema.required).toContain('violations');
    expect(validation).toEqual({ valid: true, errors: [] });
    expect(validateAuditReportJson(parsed).valid).toBe(true);
    expect(report.metadata.generatedAt).toBe(GENERATED_AT);
    expect(report).toMatchObject({
      score: 52,
      maxScore: 100,
      passed: false,
      summary: {
        errorCount: 1,
        warningCount: 3,
        infoCount: 1,
        violationCount: 5,
      },
    });
  });

  it('renders GitHub-friendly markdown with limits for long violation groups', () => {
    const markdown = formatAuditReportMarkdown(MANUAL_AUDIT_RESULT, {
      maxViolationsPerSeverity: 1,
      maxRecommendations: 3,
      maxQuickWins: 2,
    });

    expect(markdown).toContain('## Sherpa Labs Audit Report');
    expect(markdown).toContain('**Score:** `52/100` - **FAIL**');
    expect(markdown).toContain('### Top Recommendations');
    expect(markdown).toContain('### Quick Wins');
    expect(markdown).toContain('### Violations');
    expect(markdown).toContain('<details open>');
    expect(markdown).toContain('<summary>Errors (1)</summary>');
    expect(markdown).toContain('<summary>Warnings (3)</summary>');
    expect(markdown).toContain('- 2 more not shown.');
  });

  it('groups violations by severity after normalization', () => {
    const grouped = groupViolationsBySeverity(
      normalizeAuditReportViolations(MANUAL_AUDIT_RESULT.violations),
    );

    expect(grouped.error.map((violation) => violation.id)).toEqual(['violation-conflict']);
    expect(grouped.warning.map((violation) => violation.id)).toEqual([
      'violation-outdated',
      'violation-priority-a',
      'violation-priority-b',
    ]);
    expect(grouped.info.map((violation) => violation.id)).toEqual(['violation-examples']);
  });

  it('orders top recommendations by severity, repeated categories, fix hints, and quick wins', () => {
    const recommendations = getTopAuditRecommendations(MANUAL_AUDIT_RESULT, {
      maxRecommendations: 4,
    });

    expect(recommendations.map((recommendation) => recommendation.categories[0])).toEqual([
      'conflict',
      'priority-signal',
      'outdated-reference',
      'examples',
    ]);
    expect(recommendations[0]?.priority).toBe('high');
    expect(recommendations[1]?.occurrenceCount).toBe(2);
  });

  it('selects quick wins for low-effort high-impact categories', () => {
    const report = createAuditReportModel(MANUAL_AUDIT_RESULT);

    expect(report.quickWins.map((quickWin) => quickWin.category)).toEqual([
      'priority-signal',
      'outdated-reference',
      'examples',
    ]);
    expect(report.quickWins.every((quickWin) => quickWin.effort === 'low')).toBe(true);
  });

  it('preserves rule fix hints and generates actionable fallback hints', () => {
    const normalized = normalizeAuditReportViolations(MANUAL_AUDIT_RESULT.violations);
    const fallback = normalized.find((violation) => violation.id === 'violation-conflict');
    const preserved = normalized.find((violation) => violation.id === 'violation-examples');

    expect(fallback?.fixHintSource).toBe('fallback');
    expect(fallback?.fixHint).toContain('one clear policy');
    expect(getViolationFixHint(MANUAL_AUDIT_RESULT.violations[1])).toContain('MUST');
    expect(preserved?.fixHintSource).toBe('rule');
    expect(preserved?.fixHint).toBe('Add one short before/after example.');
  });

  it('keeps output deterministic for the same audit result and options', () => {
    const first = formatAuditReportJson(MANUAL_AUDIT_RESULT, {
      generatedAt: GENERATED_AT,
      pretty: false,
    });
    const second = formatAuditReportJson(MANUAL_AUDIT_RESULT, {
      generatedAt: GENERATED_AT,
      pretty: false,
    });

    expect(second).toBe(first);
  });

  it('reports known-good and known-bad audit fixtures clearly', async () => {
    const good = await auditFixture('known-good.md');
    const bad = await auditFixture('known-bad.md');
    const goodReport = createAuditReportModel(good);
    const badReport = createAuditReportModel(bad);

    expect(goodReport.score).toBeGreaterThanOrEqual(85);
    expect(goodReport.violations).toHaveLength(0);
    expect(goodReport.recommendations).toHaveLength(0);
    expect(goodReport.quickWins).toHaveLength(0);
    expect(formatAuditReportTerminal(good, { colors: false })).toContain('No violations found.');
    expect(badReport.score).toBeLessThanOrEqual(50);
    expect(badReport.passed).toBe(false);
    expect(badReport.recommendations.length).toBeGreaterThan(0);
    expect(badReport.quickWins.map((quickWin) => quickWin.category)).toEqual(
      expect.arrayContaining<AuditCategory>([
        'vague-directive',
        'outdated-reference',
        'examples',
        'ambiguity',
      ]),
    );
  });
});

async function auditFixture(name: string): Promise<AuditResult> {
  const content = await readFile(join(AUDIT_FIXTURE_ROOT, name), 'utf8');
  const ruleSet = parseClaudeMd(content, { filePath: name });

  return runAudit(
    {
      ruleSet,
      stack: STACK_CONTEXT,
      config: { failUnder: 85 },
    },
    { now: () => FIXED_NOW },
  );
}
