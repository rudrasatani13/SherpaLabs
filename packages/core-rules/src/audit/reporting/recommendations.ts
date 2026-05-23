import { deterministicId } from '@sherpa-labs/core-utils';
import type {
  AuditCategory,
  AuditRecommendation,
  AuditRecommendationPriority,
  AuditResult,
  Violation,
  ViolationSeverity,
} from '@sherpa-labs/shared-types';
import { getAuditIssueCopy, resolveViolationFixHint } from './fix-hints.js';
import { severityImpact, severityRank } from './score.js';
import type { AuditReportBuildOptions, AuditReportRecommendation } from './types.js';

export const DEFAULT_RECOMMENDATION_LIMIT = 5;

export function getTopAuditRecommendations(
  result: AuditResult,
  options: Pick<AuditReportBuildOptions, 'maxRecommendations'> = {},
): readonly AuditReportRecommendation[] {
  const limit = options.maxRecommendations ?? DEFAULT_RECOMMENDATION_LIMIT;

  if (limit <= 0) {
    return [];
  }

  const generated = groupViolationsForRecommendations(result).map((group) =>
    buildViolationGroupRecommendation(result.id, group),
  );
  const existing = result.recommendations.map((recommendation, index) =>
    buildExistingRecommendation(recommendation, index, result),
  );

  return [...generated, ...existing].sort(compareAuditReportRecommendations).slice(0, limit);
}

export function compareAuditReportRecommendations(
  left: AuditReportRecommendation,
  right: AuditReportRecommendation,
): number {
  return (
    recommendationRank(right) - recommendationRank(left) ||
    right.occurrenceCount - left.occurrenceCount ||
    Number(Boolean(right.fixHint)) - Number(Boolean(left.fixHint)) ||
    Number(Boolean(right.quickWin)) - Number(Boolean(left.quickWin)) ||
    right.impact - left.impact ||
    left.message.localeCompare(right.message) ||
    left.id.localeCompare(right.id)
  );
}

function groupViolationsForRecommendations(result: AuditResult): readonly ViolationGroup[] {
  const groups = new Map<string, Violation<AuditCategory>[]>();

  for (const violation of result.violations) {
    const key =
      violation.category === undefined
        ? `rule:${violation.ruleId}`
        : `category:${violation.category}`;
    groups.set(key, [...(groups.get(key) ?? []), violation]);
  }

  return [...groups.entries()]
    .map(([key, violations]) => buildViolationGroup(key, violations))
    .sort(compareViolationGroups);
}

function buildViolationGroup(
  key: string,
  violations: readonly Violation<AuditCategory>[],
): ViolationGroup {
  const sortedViolations = [...violations].sort(compareViolationsForGrouping);
  const category = sortedViolations.find((violation) => violation.category !== undefined)?.category;
  const severity = worstSeverity(sortedViolations);
  const copy = getAuditIssueCopy(category);
  const occurrenceCount = sortedViolations.length;
  const hasRuleFixHint = sortedViolations.some(
    (violation) => resolveViolationFixHint(violation).source === 'rule',
  );
  const quickWin = category === undefined ? false : copy.quickWin;

  return {
    key,
    severity,
    quickWin,
    occurrenceCount,
    impact:
      severityImpact(severity) +
      Math.min(occurrenceCount - 1, 8) * 12 +
      (hasRuleFixHint ? 8 : 0) +
      (quickWin ? 5 : 0),
    ruleIds: uniqueSorted(sortedViolations.map((violation) => violation.ruleId)),
    violationIds: sortedViolations.map((violation) => violation.id),
    fixHint: selectGroupFixHint(sortedViolations),
    ...(category !== undefined ? { category } : {}),
  };
}

function buildViolationGroupRecommendation(
  auditId: string,
  group: ViolationGroup,
): AuditReportRecommendation {
  const copy = getAuditIssueCopy(group.category);
  const occurrenceLabel =
    group.occurrenceCount === 1 ? '1 finding' : `${group.occurrenceCount} findings`;

  return {
    id: deterministicId({
      kind: 'audit-report-recommendation',
      auditId,
      key: group.key,
      violationIds: group.violationIds,
    }),
    message: `${copy.title}: ${stripTrailingPeriod(copy.recommendation)} (${occurrenceLabel}).`,
    priority: priorityForGroup(group),
    impact: group.impact,
    occurrenceCount: group.occurrenceCount,
    ruleIds: group.ruleIds,
    violationIds: group.violationIds,
    categories: group.category === undefined ? [] : [group.category],
    fixHint: group.fixHint,
    severity: group.severity,
    ...(group.quickWin ? { quickWin: true } : {}),
  };
}

function buildExistingRecommendation(
  recommendation: AuditRecommendation,
  index: number,
  result: AuditResult,
): AuditReportRecommendation {
  const ruleIds = uniqueSorted(recommendation.ruleIds ?? []);
  const linkedViolations =
    ruleIds.length === 0
      ? []
      : result.violations.filter((violation) => ruleIds.includes(violation.ruleId));
  const severity = linkedViolations.length === 0 ? undefined : worstSeverity(linkedViolations);
  const categories = uniqueSortedCategories(
    linkedViolations.flatMap((violation) =>
      violation.category === undefined ? [] : [violation.category],
    ),
  );

  return {
    id:
      recommendation.id || deterministicId({ kind: 'audit-report-existing-recommendation', index }),
    message: recommendation.message,
    priority: recommendation.priority,
    impact:
      priorityImpact(recommendation.priority) +
      (severity === undefined ? 0 : severityImpact(severity)) +
      Math.min(linkedViolations.length, 8) * 10 +
      (recommendation.fixHint === undefined ? 0 : 8),
    occurrenceCount: linkedViolations.length,
    ruleIds,
    violationIds: linkedViolations.map((violation) => violation.id),
    categories,
    ...(recommendation.fixHint !== undefined ? { fixHint: recommendation.fixHint } : {}),
    ...(severity !== undefined ? { severity } : {}),
  };
}

function priorityForGroup(group: ViolationGroup): AuditRecommendationPriority {
  if (group.severity === 'error') {
    return 'high';
  }

  if (group.severity === 'warning') {
    return group.occurrenceCount >= 3 ? 'high' : 'medium';
  }

  return group.occurrenceCount >= 3 ? 'medium' : 'low';
}

function recommendationRank(recommendation: AuditReportRecommendation): number {
  if (recommendation.severity !== undefined) {
    return severityRank(recommendation.severity);
  }

  if (recommendation.priority === 'high') {
    return 3;
  }

  if (recommendation.priority === 'medium') {
    return 2;
  }

  return 1;
}

function priorityImpact(priority: AuditRecommendationPriority): number {
  if (priority === 'high') {
    return 85;
  }

  if (priority === 'medium') {
    return 45;
  }

  return 15;
}

function compareViolationGroups(left: ViolationGroup, right: ViolationGroup): number {
  return (
    severityRank(right.severity) - severityRank(left.severity) ||
    right.occurrenceCount - left.occurrenceCount ||
    right.impact - left.impact ||
    left.key.localeCompare(right.key)
  );
}

function compareViolationsForGrouping(
  left: Violation<AuditCategory>,
  right: Violation<AuditCategory>,
): number {
  return (
    severityRank(right.severity) - severityRank(left.severity) ||
    left.ruleId.localeCompare(right.ruleId) ||
    (left.location?.filePath ?? '').localeCompare(right.location?.filePath ?? '') ||
    (left.location?.startLine ?? 0) - (right.location?.startLine ?? 0) ||
    left.message.localeCompare(right.message) ||
    left.id.localeCompare(right.id)
  );
}

function worstSeverity(
  violations: readonly Pick<Violation<AuditCategory>, 'severity'>[],
): ViolationSeverity {
  return violations.reduce<ViolationSeverity>((worst, violation) => {
    return severityRank(violation.severity) > severityRank(worst) ? violation.severity : worst;
  }, 'info');
}

function selectGroupFixHint(violations: readonly Violation<AuditCategory>[]): string {
  const sortedHints = violations.map(resolveViolationFixHint).sort((left, right) => {
    return (
      Number(right.source === 'rule') - Number(left.source === 'rule') ||
      left.hint.localeCompare(right.hint)
    );
  });

  return sortedHints[0]?.hint ?? getAuditIssueCopy(undefined).fallbackFixHint;
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function uniqueSortedCategories(values: readonly AuditCategory[]): readonly AuditCategory[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function stripTrailingPeriod(value: string): string {
  return value.replace(/\.$/u, '');
}

interface ViolationGroup {
  readonly key: string;
  readonly severity: ViolationSeverity;
  readonly quickWin: boolean;
  readonly occurrenceCount: number;
  readonly impact: number;
  readonly ruleIds: readonly string[];
  readonly violationIds: readonly string[];
  readonly fixHint: string;
  readonly category?: AuditCategory;
}
