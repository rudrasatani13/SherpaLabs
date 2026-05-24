import { deterministicId } from '@sherpa-labs/core-utils';
import type { JsonObject } from '@sherpa-labs/shared-types';

import { resolveLintConfig, withLintConfig } from './context.js';
import { LintRuleRegistry } from './registry.js';
import { calculateLintScore, summarizeLint } from './scoring.js';
import type {
  LintConfig,
  LintContext,
  LintResult,
  LintRule,
  LintRuleCheckResult,
  LintRuleModule,
  LintRuleViolationInput,
  LintServerSummary,
  LintViolation,
  ResolvedLintConfig,
} from './types.js';

export interface LintEngineOptions {
  readonly rules?: readonly LintRuleModule[];
  readonly registry?: LintRuleRegistry;
  readonly config?: LintConfig | ResolvedLintConfig;
  readonly now?: () => Date;
}

export interface LintEngineRunInput {
  readonly context: LintContext;
  readonly config?: LintConfig | ResolvedLintConfig;
}

export class LintEngine {
  readonly #registry: LintRuleRegistry;
  readonly #config: ResolvedLintConfig;
  readonly #now: () => Date;

  constructor(options: LintEngineOptions = {}) {
    this.#registry = options.registry ?? new LintRuleRegistry(options.rules);
    this.#config = resolveLintConfig(options.config ?? {});
    this.#now = options.now ?? (() => new Date());
  }

  async run(input: LintEngineRunInput): Promise<LintResult> {
    const config = resolveLintConfig(input.config ?? this.#config);
    const context = withLintConfig(input.context, config);
    const rules = this.#registry.getEnabledRules(config);
    const violations: LintViolation[] = [];

    for (const rule of rules) {
      const checkResult = normalizeCheckResult(await rule.check(context));
      const ruleViolations = checkResult.violations ?? [];

      ruleViolations.forEach((violation, index) => {
        violations.push(buildViolation(rule, violation, index));
      });
    }

    const score = calculateLintScore(violations, { severityWeights: config.severityWeights });
    const minimumScore = config.failUnder ?? config.thresholds.minimumScore ?? 0;

    return {
      id: deterministicId({
        kind: 'mcp-lint-result',
        transport: context.transport,
        protocolVersion: context.protocolVersion ?? null,
        score: score.score,
        violations: violations.map((violation) => violation.id),
        rules: rules.map((rule) => rule.id),
      }),
      server: buildServerSummary(context),
      score: score.score,
      maxScore: score.maxScore,
      passed: score.score >= minimumScore,
      violations,
      summary: summarizeLint(violations),
      rulesRun: rules.map((rule) => rule.id),
      lintedAt: this.#now().toISOString(),
    };
  }
}

export async function runLint(
  input: LintEngineRunInput,
  options: LintEngineOptions = {},
): Promise<LintResult> {
  return new LintEngine(options).run(input);
}

function normalizeCheckResult(
  result: LintRuleCheckResult | readonly LintRuleViolationInput[],
): LintRuleCheckResult {
  if (isLintRuleViolationInputArray(result)) {
    return { violations: result };
  }

  return result;
}

function isLintRuleViolationInputArray(
  value: LintRuleCheckResult | readonly LintRuleViolationInput[],
): value is readonly LintRuleViolationInput[] {
  return Array.isArray(value);
}

function buildViolation(
  rule: LintRule,
  violation: LintRuleViolationInput,
  index: number,
): LintViolation {
  return {
    id: deterministicId({
      kind: 'mcp-lint-violation',
      ruleId: rule.id,
      category: rule.category,
      severity: rule.severity,
      message: violation.message,
      location: violation.location ?? null,
      evidence: violation.evidence ?? null,
      index,
    }),
    ruleId: rule.id,
    category: rule.category,
    severity: rule.severity,
    message: violation.message,
    fixHint: violation.fixHint,
    ...(violation.location !== undefined ? { location: violation.location } : {}),
    ...(violation.evidence !== undefined ? { evidence: violation.evidence } : {}),
  };
}

function buildServerSummary(context: LintContext): LintServerSummary {
  const summary: MutableLintServerSummary = {
    transport: context.transport,
    capabilities: Object.keys(context.capabilities).sort(),
    toolCount: context.tools.length,
    resourceCount: context.resources.length,
    promptCount: context.prompts.length,
  };
  const name = getStringProperty(context.serverInfo, 'name');
  const version = getStringProperty(context.serverInfo, 'version');

  if (context.protocolVersion !== undefined) {
    summary.protocolVersion = context.protocolVersion;
  }

  if (name !== undefined) {
    summary.name = name;
  }

  if (version !== undefined) {
    summary.version = version;
  }

  return summary;
}

interface MutableLintServerSummary {
  transport: LintServerSummary['transport'];
  protocolVersion?: string;
  name?: string;
  version?: string;
  capabilities: readonly string[];
  toolCount: number;
  resourceCount: number;
  promptCount: number;
}

function getStringProperty(value: JsonObject | undefined, key: string): string | undefined {
  const child = value?.[key];

  return typeof child === 'string' ? child : undefined;
}
