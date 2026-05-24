import { describe, expect, it } from 'vitest';

import {
  calculateMcpLintCategorySubscores,
  createMcpLintReportModel,
  formatMcpLintJsonReport,
  formatMcpLintMarkdownReport,
  formatMcpLintTerminalReport,
  getFailingMcpLintRules,
  mcpLintReportJsonSchema,
  prioritizeMcpLintViolations,
  runLint,
  validateMcpLintJsonReport,
  type LintResult,
  type McpLintReportModel,
} from '../src/index.js';
import {
  createFilesystemLikeGoodContext,
  createIntentionallyBrokenContext,
} from './fixtures/lint/contexts.js';

const FIXED_NOW = new Date('2026-05-24T00:00:00.000Z');
const GENERATED_AT = '2026-05-24T00:05:00.000Z';

const MANUAL_LINT_RESULT = {
  id: 'mcp-lint-report-manual',
  server: {
    transport: 'stdio',
    protocolVersion: '2025-11-25',
    name: 'manual-fixture',
    version: '1.0.0',
    capabilities: ['tools'],
    toolCount: 1,
    resourceCount: 0,
    promptCount: 0,
  },
  score: 42,
  maxScore: 100,
  passed: false,
  violations: [
    {
      id: 'protocol-error',
      ruleId: 'P001',
      category: 'protocol',
      severity: 'error',
      message: 'Initialize response missing.',
      location: 'initialize.response',
      fixHint: 'Return a valid initialize result before accepting requests.',
    },
    {
      id: 'security-warning',
      ruleId: 'X002',
      category: 'security',
      severity: 'warning',
      message: 'Path parameter is unrestricted.',
      location: 'tools[0].inputSchema.properties.path',
      evidence: '{"type":"string"}',
      fixHint: 'Constrain path input with an allowlist or safe pattern.',
    },
    {
      id: 'schema-info',
      ruleId: 'S999',
      category: 'schema',
      severity: 'info',
      message: 'Schema could be stricter.',
      fixHint: 'Add additionalProperties false for closed object schemas.',
    },
    {
      id: 'performance-error',
      ruleId: 'F999',
      category: 'performance',
      severity: 'error',
      message: 'List endpoint exceeded the budget.',
      fixHint: 'Cache list responses or reduce payload size.',
    },
    {
      id: 'security-error',
      ruleId: 'X001',
      category: 'security',
      severity: 'error',
      message: 'Filesystem access escaped the allowed root.',
      fixHint: 'Reject resolved paths outside configured roots.',
    },
  ],
  summary: {
    errorCount: 3,
    warningCount: 1,
    infoCount: 1,
    violationCount: 5,
  },
  rulesRun: ['P001', 'X002', 'S999', 'F999', 'X001'],
  lintedAt: '2026-05-24T00:00:00.000Z',
} as const satisfies LintResult;

describe('MCP lint reporting', () => {
  it('preserves the Phase 18 composite score as the source of truth', () => {
    const report = createMcpLintReportModel(MANUAL_LINT_RESULT, {
      generatedAt: GENERATED_AT,
    });

    expect(report.score).toBe(42);
    expect(report.compositeScore).toEqual({
      score: 42,
      maxScore: 100,
      passed: false,
      totalViolationCount: 5,
      summary: MANUAL_LINT_RESULT.summary,
    });
    expect(report.metadata.generatedAt).toBe(GENERATED_AT);
  });

  it('calculates category subscores from only category-specific violations', () => {
    const subscores = calculateMcpLintCategorySubscores(MANUAL_LINT_RESULT);

    expect(subscores.protocol).toMatchObject({
      score: 90,
      violationCount: 1,
      errorCount: 1,
      warningCount: 0,
      infoCount: 0,
      failingRuleIds: ['P001'],
    });
    expect(subscores.schema).toMatchObject({
      score: 99,
      violationCount: 1,
      infoCount: 1,
      failingRuleIds: ['S999'],
    });
    expect(subscores.security).toMatchObject({
      score: 87,
      violationCount: 2,
      errorCount: 1,
      warningCount: 1,
      failingRuleIds: ['X001', 'X002'],
    });
    expect(subscores.performance).toMatchObject({
      score: 90,
      violationCount: 1,
      errorCount: 1,
      failingRuleIds: ['F999'],
    });
  });

  it('prioritizes security before protocol, schema, and performance deterministically', () => {
    const first = prioritizeMcpLintViolations(MANUAL_LINT_RESULT.violations);
    const second = prioritizeMcpLintViolations(MANUAL_LINT_RESULT.violations);

    expect(first.map((violation) => violation.ruleId)).toEqual([
      'X001',
      'X002',
      'P001',
      'S999',
      'F999',
    ]);
    expect(second).toEqual(first);
    expect(getFailingMcpLintRules(MANUAL_LINT_RESULT).map((rule) => rule.ruleId)).toEqual([
      'X001',
      'X002',
      'P001',
      'S999',
      'F999',
    ]);
  });

  it('renders terminal output with grouped categories, colors, score, and failing rules', () => {
    const plain = formatMcpLintTerminalReport(MANUAL_LINT_RESULT, {
      colors: false,
      maxViolationsPerCategory: 1,
    });
    const colored = formatMcpLintTerminalReport(MANUAL_LINT_RESULT, { colors: true });

    expect(plain).toContain('MCP Lint Report');
    expect(plain).toContain('Score: 42/100 FAIL');
    expect(plain).toContain('Category Subscores');
    expect(plain).toContain('Security (2)');
    expect(plain).toContain('[X001] ERROR');
    expect(plain).toContain('... 1 more not shown');
    expect(plain).toContain('Failing rules');
    expect(plain).not.toContain('\u001B[');
    expect(colored).toContain('\u001B[');
  });

  it('emits JSON that validates against the documented schema', () => {
    const report = createMcpLintReportModel(MANUAL_LINT_RESULT, {
      generatedAt: GENERATED_AT,
    });
    const json = formatMcpLintJsonReport(MANUAL_LINT_RESULT, {
      generatedAt: GENERATED_AT,
      pretty: false,
    });
    const parsed = JSON.parse(json) as unknown;

    expect(mcpLintReportJsonSchema.$id).toBe(
      'https://sherpa-labs.io/schemas/mcp-lint-report.v1.json',
    );
    expect(mcpLintReportJsonSchema.required).toContain('categorySubscores');
    expect(validateMcpLintJsonReport(report)).toEqual({ valid: true, errors: [] });
    expect(validateMcpLintJsonReport(parsed).valid).toBe(true);
  });

  it('renders markdown consistent with JSON and terminal report facts', () => {
    const terminal = formatMcpLintTerminalReport(MANUAL_LINT_RESULT, { colors: false });
    const markdown = formatMcpLintMarkdownReport(MANUAL_LINT_RESULT, {
      maxTopViolations: 2,
      maxViolationsPerCategory: 1,
    });
    const json = formatMcpLintJsonReport(MANUAL_LINT_RESULT, { pretty: false });
    const parsed = JSON.parse(json) as unknown as McpLintReportModel;

    expect(markdown).toContain('## MCP Lint Report');
    expect(markdown).toContain('**Score:** `42/100` - **FAIL**');
    expect(markdown).toContain('| Security | 87/100 | 2 | 1 | 1 | 0 | `X001`, `X002` |');
    expect(markdown).toContain('### Top Priority Violations');
    expect(markdown).toContain('<summary>Security (2)</summary>');
    expect(markdown).toContain('### Failing Rules');
    expect(terminal).toContain(`${parsed.score}/${parsed.maxScore}`);
    expect(markdown).toContain(`${parsed.score}/${parsed.maxScore}`);
    expect(parsed.failingRules.map((rule) => rule.ruleId)).toEqual([
      'X001',
      'X002',
      'P001',
      'S999',
      'F999',
    ]);
  });

  it('keeps all output formats deterministic for repeated runs', () => {
    const first = formatMcpLintJsonReport(MANUAL_LINT_RESULT, {
      generatedAt: GENERATED_AT,
      pretty: false,
    });
    const second = formatMcpLintJsonReport(MANUAL_LINT_RESULT, {
      generatedAt: GENERATED_AT,
      pretty: false,
    });

    expect(second).toBe(first);
  });

  it('reports the known-good filesystem-like fixture as clean', async () => {
    const result = await runLint(
      { context: createFilesystemLikeGoodContext() },
      { now: () => FIXED_NOW },
    );
    const report = createMcpLintReportModel(result);

    expect(report.score).toBe(100);
    expect(report.violations).toEqual([]);
    expect(report.failingRules).toEqual([]);
    expect(Object.values(report.categorySubscores).map((subscore) => subscore.score)).toEqual([
      100, 100, 100, 100,
    ]);
    expect(formatMcpLintTerminalReport(result, { colors: false })).toContain(
      'No violations found.',
    );
    expect(formatMcpLintMarkdownReport(result)).toContain('No violations found.');
    expect(validateMcpLintJsonReport(report).valid).toBe(true);
  });

  it('reports the intentionally broken fixture as low-scoring and categorized', async () => {
    const result = await runLint(
      { context: createIntentionallyBrokenContext() },
      { now: () => FIXED_NOW },
    );
    const report = createMcpLintReportModel(result);

    expect(report.score).toBeLessThanOrEqual(40);
    expect(report.violations.length).toBeGreaterThan(20);
    expect(report.violations[0]?.category).toBe('security');
    expect(report.categorySubscores.security.score).toBeLessThan(100);
    expect(report.categorySubscores.protocol.score).toBeLessThan(100);
    expect(report.categorySubscores.schema.score).toBeLessThan(100);
    expect(report.categorySubscores.performance.score).toBeLessThan(100);
    expect(report.failingRules[0]?.category).toBe('security');
    expect(validateMcpLintJsonReport(report).valid).toBe(true);
  });
});
