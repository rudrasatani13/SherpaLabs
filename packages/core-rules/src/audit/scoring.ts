import type {
  AuditRecommendation,
  AuditSummary,
  Violation,
  ViolationSeverity,
} from '@sherpa-labs/shared-types';

export const AUDIT_BASELINE_SCORE = 100;
export const AUDIT_MIN_SCORE = 0;
export const AUDIT_MAX_SCORE = 100;

export const DEFAULT_SEVERITY_WEIGHTS = {
  error: -10,
  warning: -3,
  info: -1,
} as const satisfies Readonly<Record<ViolationSeverity, number>>;

export interface AuditScoreOptions {
  readonly baseline?: number;
  readonly minScore?: number;
  readonly maxScore?: number;
  readonly severityWeights?: Readonly<Partial<Record<ViolationSeverity, number>>>;
}

export interface AuditScoreResult {
  readonly score: number;
  readonly maxScore: number;
  readonly baseline: number;
  readonly deduction: number;
}

export function calculateAuditScore(
  violations: readonly Pick<Violation, 'severity'>[],
  options: AuditScoreOptions = {},
): AuditScoreResult {
  const baseline = options.baseline ?? AUDIT_BASELINE_SCORE;
  const minScore = options.minScore ?? AUDIT_MIN_SCORE;
  const maxScore = options.maxScore ?? AUDIT_MAX_SCORE;
  const weights = {
    ...DEFAULT_SEVERITY_WEIGHTS,
    ...options.severityWeights,
  } satisfies Record<ViolationSeverity, number>;
  const weightedScore = violations.reduce((score, violation) => {
    return score + weights[violation.severity];
  }, baseline);
  const score = clamp(weightedScore, minScore, maxScore);

  return {
    score,
    maxScore,
    baseline,
    deduction: baseline - score,
  };
}

export function summarizeAudit(
  violations: readonly Pick<Violation, 'severity'>[],
  recommendations: readonly AuditRecommendation[] = [],
): AuditSummary {
  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  for (const violation of violations) {
    if (violation.severity === 'error') {
      errorCount += 1;
    } else if (violation.severity === 'warning') {
      warningCount += 1;
    } else {
      infoCount += 1;
    }
  }

  return {
    errorCount,
    warningCount,
    infoCount,
    recommendationCount: recommendations.length,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
