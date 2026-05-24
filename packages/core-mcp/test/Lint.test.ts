import { describe, expect, it } from 'vitest';

import {
  LintEngine,
  LintRuleRegistry,
  buildLintContextFromClientObservations,
  calculateLintScore,
  defaultLintRules,
  runLint,
  type LintViolation,
} from '../src/index.js';
import {
  createFilesystemLikeGoodContext,
  createIntentionallyBrokenContext,
  implementedRuleIds,
  ruleFixtures,
  type ImplementedRuleId,
} from './fixtures/lint/contexts.js';

const fixedNow = (): Date => new Date('2026-05-24T00:00:00.000Z');

describe('MCP lint context builder', () => {
  it('builds LintContext from MCP client observations', () => {
    const context = buildLintContextFromClientObservations({
      transport: 'stdio',
      initializeResult: {
        protocolVersion: '2025-11-25',
        capabilities: { tools: {} },
        serverInfo: { name: 'builder-fixture', version: '1.0.0' },
      },
      toolsResult: {
        tools: [
          {
            name: 'ping',
            inputSchema: { type: 'object', additionalProperties: false },
          },
        ],
      },
      protocolMessages: [
        {
          direction: 'outbound',
          id: 1,
          method: 'initialize',
          message: { jsonrpc: '2.0', id: 1, method: 'initialize' },
        },
      ],
      metadata: {
        unknownMethod: { method: 'sherpa/unknownMethod', ok: false, errorCode: -32601 },
      },
    });

    expect(context.transport).toBe('stdio');
    expect(context.protocolVersion).toBe('2025-11-25');
    expect(context.capabilities.tools).toEqual({});
    expect(context.serverInfo?.name).toBe('builder-fixture');
    expect(context.tools[0]?.name).toBe('ping');
    expect(context.messages[0]?.direction).toBe('client-to-server');
  });
});

describe('MCP lint scoring', () => {
  it('uses audit-compatible severity weights and clamps scores', () => {
    const score = calculateLintScore([
      { severity: 'error' },
      { severity: 'warning' },
      { severity: 'info' },
    ] as const satisfies readonly Pick<LintViolation, 'severity'>[]);
    const clamped = calculateLintScore(
      Array.from({ length: 11 }, () => ({ severity: 'error' as const })),
    );

    expect(score.score).toBe(86);
    expect(score.deduction).toBe(14);
    expect(clamped.score).toBe(0);
  });
});

describe('MCP lint rule registry', () => {
  it('includes every implemented Phase 18 rule by default', () => {
    const registry = new LintRuleRegistry();
    const ids = registry.getRules().map((rule) => rule.id);

    expect(ids).toEqual([...implementedRuleIds]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(defaultLintRules).toHaveLength(20);
  });
});

describe('MCP lint rules', () => {
  for (const rule of defaultLintRules) {
    const ruleId = rule.id as ImplementedRuleId;

    it(`${rule.id} has passing and failing LintContext fixtures`, async () => {
      const fixture = ruleFixtures[ruleId];
      const engine = new LintEngine({ rules: [rule], now: fixedNow });
      const passResult = await engine.run({ context: fixture.pass() });
      const failResult = await engine.run({ context: fixture.fail() });

      expect(passResult.violations).toEqual([]);
      expect(failResult.violations.some((violation) => violation.ruleId === rule.id)).toBe(true);

      for (const violation of failResult.violations) {
        expect(violation.ruleId).toBe(rule.id);
        expect(violation.category).toBe(rule.category);
        expect(violation.severity).toBe(rule.severity);
        expect(violation.message.length).toBeGreaterThan(0);
        expect(violation.fixHint.length).toBeGreaterThan(0);
      }
    });
  }

  it('runs all rules against a known-good filesystem-like LintContext', async () => {
    const result = await runLint({ context: createFilesystemLikeGoodContext() }, { now: fixedNow });

    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.score).toBe(100);
    expect(result.violations).toEqual([]);
    expect(result.rulesRun).toEqual([...implementedRuleIds]);
  });

  it('scores an intentionally broken LintContext at or below 40', async () => {
    const result = await runLint(
      { context: createIntentionallyBrokenContext() },
      { now: fixedNow },
    );

    expect(result.score).toBeLessThanOrEqual(40);
    expect(result.violations.length).toBeGreaterThan(20);
  });

  it('returns deterministic repeated results for the same LintContext', async () => {
    const engine = new LintEngine({ now: fixedNow });
    const context = createIntentionallyBrokenContext();
    const first = await engine.run({ context });
    const second = await engine.run({ context });

    expect(second).toEqual(first);
  });
});
