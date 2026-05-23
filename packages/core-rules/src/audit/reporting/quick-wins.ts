import { deterministicId } from '@sherpa-labs/core-utils';
import type {
  AuditCategory,
  AuditResult,
  Violation,
  ViolationSeverity,
} from '@sherpa-labs/shared-types';
import { getAuditIssueCopy, resolveViolationFixHint } from './fix-hints.js';
import { severityImpact, severityRank } from './score.js';
import type { AuditReportBuildOptions, AuditReportQuickWin } from './types.js';

export const DEFAULT_QUICK_WIN_LIMIT = 5;

const QUICK_WIN_RULE_IDS = new Set([
  'heuristic.vague-directives',
  'heuristic.duplicate-sections',
  'heuristic.outdated-tool-references',
  'heuristic.missing-priority-signals',
  'heuristic.missing-examples',
  'heuristic.ambiguous-instructions',
]);

export function getAuditQuickWins(
  result: AuditResult,
  options: Pick<AuditReportBuildOptions, 'maxQuickWins'> = {},
): readonly AuditReportQuickWin[] {
  const limit = options.maxQuickWins ?? DEFAULT_QUICK_WIN_LIMIT;

  if (limit <= 0) {
    return [];
  }

  return groupQuickWinViolations(result)
    .map((group) => buildQuickWin(result.id, group))
    .sort(compareAuditQuickWins)
    .slice(0, limit);
}

export function isQuickWinViolation(
  violation: Pick<Violation<AuditCategory>, 'category' | 'ruleId'>,
): boolean {
  return getAuditIssueCopy(violation.category).quickWin || QUICK_WIN_RULE_IDS.has(violation.ruleId);
}

export function compareAuditQuickWins(
  left: AuditReportQuickWin,
  right: AuditReportQuickWin,
): number {
  return (
    severityRank(right.severity ?? 'info') - severityRank(left.severity ?? 'info') ||
    right.occurrenceCount - left.occurrenceCount ||
    right.impact - left.impact ||
    left.title.localeCompare(right.title) ||
    left.id.localeCompare(right.id)
  );
}

function groupQuickWinViolations(result: AuditResult): readonly QuickWinGroup[] {
  const groups = new Map<string, Violation<AuditCategory>[]>();

  for (const violation of result.violations) {
    if (!isQuickWinViolation(violation)) {
      continue;
    }

    const key =
      violation.category === undefined
        ? `rule:${violation.ruleId}`
        : `category:${violation.category}`;
    groups.set(key, [...(groups.get(key) ?? []), violation]);
  }

  return [...groups.entries()].map(([key, violations]) => buildQuickWinGroup(key, violations));
}

function buildQuickWinGroup(
  key: string,
  violations: readonly Violation<AuditCategory>[],
): QuickWinGroup {
  const sortedViolations = [...violations].sort(compareViolationsForQuickWins);
  const category = sortedViolations.find((violation) => violation.category !== undefined)?.category;
  const severity = worstSeverity(sortedViolations);
  const occurrenceCount = sortedViolations.length;

  return {
    key,
    severity,
    occurrenceCount,
    impact: severityImpact(severity) + Math.min(occurrenceCount - 1, 8) * 10,
    ruleIds: uniqueSorted(sortedViolations.map((violation) => violation.ruleId)),
    violationIds: sortedViolations.map((violation) => violation.id),
    fixHint: selectQuickWinFixHint(sortedViolations),
    ...(category !== undefined ? { category } : {}),
  };
}

function buildQuickWin(auditId: string, group: QuickWinGroup): AuditReportQuickWin {
  const copy = getAuditIssueCopy(group.category);
  const occurrenceLabel =
    group.occurrenceCount === 1 ? '1 finding' : `${group.occurrenceCount} findings`;

  return {
    id: deterministicId({
      kind: 'audit-report-quick-win',
      auditId,
      key: group.key,
      violationIds: group.violationIds,
    }),
    title: copy.quickWinTitle,
    message: `${copy.quickWinMessage} (${occurrenceLabel}).`,
    effort: 'low',
    impact: group.impact,
    occurrenceCount: group.occurrenceCount,
    ruleIds: group.ruleIds,
    violationIds: group.violationIds,
    fixHint: group.fixHint,
    severity: group.severity,
    ...(group.category !== undefined ? { category: group.category } : {}),
  };
}

function compareViolationsForQuickWins(
  left: Violation<AuditCategory>,
  right: Violation<AuditCategory>,
): number {
  return (
    severityRank(right.severity) - severityRank(left.severity) ||
    left.ruleId.localeCompare(right.ruleId) ||
    (left.location?.filePath ?? '').localeCompare(right.location?.filePath ?? '') ||
    (left.location?.startLine ?? 0) - (right.location?.startLine ?? 0) ||
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

function selectQuickWinFixHint(violations: readonly Violation<AuditCategory>[]): string {
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

interface QuickWinGroup {
  readonly key: string;
  readonly severity: ViolationSeverity;
  readonly occurrenceCount: number;
  readonly impact: number;
  readonly ruleIds: readonly string[];
  readonly violationIds: readonly string[];
  readonly fixHint: string;
  readonly category?: AuditCategory;
}
