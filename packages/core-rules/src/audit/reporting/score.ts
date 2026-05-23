import type { AuditCategory, AuditResult, ViolationSeverity } from '@sherpa-labs/shared-types';
import {
  AUDIT_BASELINE_SCORE,
  calculateAuditScore,
  type AuditScoreOptions,
  type AuditScoreResult,
} from '../scoring.js';
import {
  AUDIT_REPORT_SEVERITIES,
  type AuditReportSummary,
  type AuditReportViolation,
  type GroupedAuditReportViolations,
} from './types.js';

export interface CompositeAuditScoreOptions extends AuditScoreOptions {
  readonly useResultScore?: boolean;
}

export interface CompositeAuditScoreResult extends AuditScoreResult {
  readonly passed: boolean;
  readonly violationCount: number;
  readonly categoryCounts: Readonly<Record<string, number>>;
  readonly severityCounts: Readonly<Record<ViolationSeverity, number>>;
}

export const AUDIT_REPORT_SEVERITY_IMPACT = {
  error: 100,
  warning: 35,
  info: 10,
} as const satisfies Readonly<Record<ViolationSeverity, number>>;

export function calculateCompositeAuditScore(
  result: AuditResult,
  options: CompositeAuditScoreOptions = {},
): CompositeAuditScoreResult {
  const shouldRecalculate =
    options.useResultScore === false ||
    options.baseline !== undefined ||
    options.minScore !== undefined ||
    options.maxScore !== undefined ||
    options.severityWeights !== undefined;
  const scoreResult = shouldRecalculate
    ? calculateAuditScore(result.violations, options)
    : {
        score: result.score,
        maxScore: result.maxScore,
        baseline: AUDIT_BASELINE_SCORE,
        deduction: Math.max(0, AUDIT_BASELINE_SCORE - result.score),
      };

  return {
    ...scoreResult,
    passed: result.passed,
    violationCount: result.violations.length,
    categoryCounts: countViolationCategories(result.violations),
    severityCounts: countViolationsBySeverity(result.violations),
  };
}

export function buildAuditReportSummary(
  result: AuditResult,
  counts: {
    readonly recommendationCount: number;
    readonly quickWinCount: number;
  },
): AuditReportSummary {
  return {
    errorCount: result.summary.errorCount,
    warningCount: result.summary.warningCount,
    infoCount: result.summary.infoCount,
    recommendationCount: counts.recommendationCount,
    violationCount: result.violations.length,
    quickWinCount: counts.quickWinCount,
    categoryCounts: countViolationCategories(result.violations),
  };
}

export function groupViolationsBySeverity(
  violations: readonly AuditReportViolation[],
): GroupedAuditReportViolations {
  return {
    error: violations.filter((violation) => violation.severity === 'error'),
    warning: violations.filter((violation) => violation.severity === 'warning'),
    info: violations.filter((violation) => violation.severity === 'info'),
  };
}

export function sortReportViolations(
  violations: readonly AuditReportViolation[],
): readonly AuditReportViolation[] {
  return [...violations].sort(compareReportViolations);
}

export function compareReportViolations(
  left: AuditReportViolation,
  right: AuditReportViolation,
): number {
  return (
    severityRank(right.severity) - severityRank(left.severity) ||
    (left.category ?? '').localeCompare(right.category ?? '') ||
    left.ruleId.localeCompare(right.ruleId) ||
    (left.location?.filePath ?? '').localeCompare(right.location?.filePath ?? '') ||
    (left.location?.startLine ?? 0) - (right.location?.startLine ?? 0) ||
    (left.location?.startColumn ?? 0) - (right.location?.startColumn ?? 0) ||
    left.message.localeCompare(right.message) ||
    left.id.localeCompare(right.id)
  );
}

export function severityRank(severity: ViolationSeverity): number {
  if (severity === 'error') {
    return 3;
  }

  if (severity === 'warning') {
    return 2;
  }

  return 1;
}

export function severityImpact(severity: ViolationSeverity): number {
  return AUDIT_REPORT_SEVERITY_IMPACT[severity];
}

function countViolationsBySeverity(
  violations: readonly Pick<AuditReportViolation, 'severity'>[],
): Readonly<Record<ViolationSeverity, number>> {
  return AUDIT_REPORT_SEVERITIES.reduce<Record<ViolationSeverity, number>>(
    (counts, severity) => {
      counts[severity] = violations.filter((violation) => violation.severity === severity).length;
      return counts;
    },
    { error: 0, warning: 0, info: 0 },
  );
}

function countViolationCategories(
  violations: readonly { readonly category?: AuditCategory }[],
): Readonly<Record<string, number>> {
  const counts = new Map<string, number>();

  for (const violation of violations) {
    const key = violation.category ?? 'uncategorized';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Object.fromEntries(
    [...counts.entries()].sort(([left], [right]) => left.localeCompare(right)),
  );
}
