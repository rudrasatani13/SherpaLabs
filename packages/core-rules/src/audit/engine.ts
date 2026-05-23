import { deterministicId } from '@sherpa-labs/core-utils';
import type {
  AuditCategory,
  AuditRecommendation,
  AuditResult,
  RuleLocation,
  RuleSet,
  StackContext,
  Violation,
} from '@sherpa-labs/shared-types';
import { createAuditContext } from './context.js';
import { resolveAuditConfig, type SherpaJsonAuditConfig } from './config.js';
import { AuditRuleRegistry } from './registry.js';
import { calculateAuditScore, summarizeAudit } from './scoring.js';
import type {
  AuditFileMetadata,
  AuditRule,
  AuditRuleCheckResult,
  AuditRuleModule,
  AuditRuleRecommendationInput,
  AuditRuleViolationInput,
  ResolvedAuditConfig,
} from './types.js';

export interface AuditEngineOptions {
  readonly rules?: readonly AuditRuleModule[];
  readonly registry?: AuditRuleRegistry;
  readonly config?: SherpaJsonAuditConfig | ResolvedAuditConfig;
  readonly now?: () => Date;
}

export interface AuditEngineRunInput {
  readonly ruleSet: RuleSet;
  readonly stack: StackContext;
  readonly config?: SherpaJsonAuditConfig | ResolvedAuditConfig;
  readonly fileMetadata?: readonly AuditFileMetadata[];
}

export class AuditEngine {
  readonly #registry: AuditRuleRegistry;
  readonly #config: ResolvedAuditConfig;
  readonly #now: () => Date;

  constructor(options: AuditEngineOptions = {}) {
    this.#registry = options.registry ?? new AuditRuleRegistry(options.rules);
    this.#config = resolveAuditConfig(options.config ?? {});
    this.#now = options.now ?? (() => new Date());
  }

  async run(input: AuditEngineRunInput): Promise<AuditResult> {
    const config = resolveAuditConfig(input.config ?? this.#config);
    const context = createAuditContext({
      ruleSet: input.ruleSet,
      stack: input.stack,
      config,
      ...(input.fileMetadata !== undefined ? { fileMetadata: input.fileMetadata } : {}),
    });
    const rules = this.#registry.getEnabledRules(config);
    const violations: Violation<AuditCategory>[] = [];
    const recommendations: AuditRecommendation[] = [];

    for (const rule of rules) {
      const checkResult = normalizeCheckResult(await rule.check(context));
      const ruleViolations = checkResult.violations ?? [];
      const ruleRecommendations = checkResult.recommendations ?? [];

      ruleViolations.forEach((violation, index) => {
        violations.push(buildViolation(rule, violation, index));
      });

      ruleRecommendations.forEach((recommendation, index) => {
        recommendations.push(buildRecommendation(rule, recommendation, index));
      });
    }

    const score = calculateAuditScore(violations, { severityWeights: config.severityWeights });
    const minimumScore = config.failUnder ?? config.thresholds.minimumScore ?? 0;

    return {
      id: deterministicId({
        kind: 'audit-result',
        ruleSetId: input.ruleSet.id,
        score: score.score,
        violations: violations.map((violation) => violation.id),
        recommendations: recommendations.map((recommendation) => recommendation.id),
      }),
      ruleSetId: input.ruleSet.id,
      score: score.score,
      maxScore: score.maxScore,
      passed: score.score >= minimumScore,
      violations,
      recommendations,
      summary: summarizeAudit(violations, recommendations),
      auditedAt: this.#now().toISOString(),
    };
  }
}

export async function runAudit(
  input: AuditEngineRunInput,
  options: AuditEngineOptions = {},
): Promise<AuditResult> {
  return new AuditEngine(options).run(input);
}

function normalizeCheckResult(
  result: AuditRuleCheckResult | readonly AuditRuleViolationInput[],
): AuditRuleCheckResult {
  if (Array.isArray(result)) {
    return { violations: result };
  }

  if (!isAuditRuleCheckResult(result)) {
    return {};
  }

  return {
    ...(result.violations !== undefined ? { violations: result.violations } : {}),
    ...(result.recommendations !== undefined ? { recommendations: result.recommendations } : {}),
  };
}

function isAuditRuleCheckResult(
  value: AuditRuleCheckResult | readonly AuditRuleViolationInput[],
): value is AuditRuleCheckResult {
  return !Array.isArray(value);
}

function buildViolation(
  rule: AuditRule,
  violation: AuditRuleViolationInput,
  index: number,
): Violation<AuditCategory> {
  return {
    id: deterministicId({
      kind: 'audit-violation',
      ruleId: rule.id,
      severity: rule.severity,
      message: violation.message,
      index,
      category: violation.category ?? null,
      location: locationKey(violation.location),
    }),
    ruleId: rule.id,
    severity: rule.severity,
    message: violation.message,
    ...(violation.category !== undefined ? { category: violation.category } : {}),
    ...(violation.location !== undefined ? { location: violation.location } : {}),
    ...(violation.fixHint !== undefined ? { fixHint: violation.fixHint } : {}),
  };
}

function buildRecommendation(
  rule: AuditRule,
  recommendation: AuditRuleRecommendationInput,
  index: number,
): AuditRecommendation {
  const ruleIds = recommendation.ruleIds ?? [rule.id];

  return {
    id: deterministicId({
      kind: 'audit-recommendation',
      ruleId: rule.id,
      message: recommendation.message,
      priority: recommendation.priority,
      index,
      ruleIds,
    }),
    message: recommendation.message,
    priority: recommendation.priority,
    ruleIds,
    ...(recommendation.fixHint !== undefined ? { fixHint: recommendation.fixHint } : {}),
  };
}

function locationKey(location: RuleLocation | undefined): Record<string, string | number> | null {
  if (location === undefined) {
    return null;
  }

  return {
    ...(location.filePath !== undefined ? { filePath: location.filePath } : {}),
    ...(location.startLine !== undefined ? { startLine: location.startLine } : {}),
    ...(location.startColumn !== undefined ? { startColumn: location.startColumn } : {}),
    ...(location.endLine !== undefined ? { endLine: location.endLine } : {}),
    ...(location.endColumn !== undefined ? { endColumn: location.endColumn } : {}),
  };
}
