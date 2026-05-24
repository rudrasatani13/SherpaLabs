import type { LintRuleSeverity, LintSummary, LintViolation } from './types.js';

export const LINT_BASELINE_SCORE = 100;
export const LINT_MIN_SCORE = 0;
export const LINT_MAX_SCORE = 100;

export const DEFAULT_LINT_SEVERITY_WEIGHTS = {
  error: -10,
  warning: -3,
  info: -1,
} as const satisfies Readonly<Record<LintRuleSeverity, number>>;

export interface LintScoreOptions {
  readonly baseline?: number;
  readonly minScore?: number;
  readonly maxScore?: number;
  readonly severityWeights?: Readonly<Partial<Record<LintRuleSeverity, number>>>;
}

export interface LintScoreResult {
  readonly score: number;
  readonly maxScore: number;
  readonly baseline: number;
  readonly deduction: number;
}

export function calculateLintScore(
  violations: readonly Pick<LintViolation, 'severity'>[],
  options: LintScoreOptions = {},
): LintScoreResult {
  const baseline = options.baseline ?? LINT_BASELINE_SCORE;
  const minScore = options.minScore ?? LINT_MIN_SCORE;
  const maxScore = options.maxScore ?? LINT_MAX_SCORE;
  const weights = {
    ...DEFAULT_LINT_SEVERITY_WEIGHTS,
    ...options.severityWeights,
  } satisfies Record<LintRuleSeverity, number>;
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

export function summarizeLint(violations: readonly Pick<LintViolation, 'severity'>[]): LintSummary {
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
    violationCount: violations.length,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
