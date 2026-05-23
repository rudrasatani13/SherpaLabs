import type {
  AuditCategory,
  AuditResult,
  RuleLocation,
  Violation,
} from '@sherpa-labs/shared-types';
import { resolveViolationFixHint } from './fix-hints.js';
import { getAuditQuickWins } from './quick-wins.js';
import { getTopAuditRecommendations } from './recommendations.js';
import { buildAuditReportSummary, sortReportViolations } from './score.js';
import {
  AUDIT_REPORT_SCHEMA_VERSION,
  type AuditReportBuildOptions,
  type AuditReportLocation,
  type AuditReportModel,
  type AuditReportViolation,
} from './types.js';

export function createAuditReportModel(
  result: AuditResult,
  options: AuditReportBuildOptions = {},
): AuditReportModel {
  const violations = normalizeAuditReportViolations(result.violations);
  const recommendations = getTopAuditRecommendations(result, {
    ...(options.maxRecommendations !== undefined
      ? { maxRecommendations: options.maxRecommendations }
      : {}),
  });
  const quickWins = getAuditQuickWins(result, {
    ...(options.maxQuickWins !== undefined ? { maxQuickWins: options.maxQuickWins } : {}),
  });

  return {
    schemaVersion: AUDIT_REPORT_SCHEMA_VERSION,
    id: result.id,
    score: result.score,
    maxScore: result.maxScore,
    passed: result.passed,
    summary: buildAuditReportSummary(result, {
      recommendationCount: recommendations.length,
      quickWinCount: quickWins.length,
    }),
    recommendations,
    quickWins,
    violations,
    metadata: {
      auditId: result.id,
      auditedAt: result.auditedAt,
      schemaVersion: AUDIT_REPORT_SCHEMA_VERSION,
      ...(result.ruleSetId !== undefined ? { ruleSetId: result.ruleSetId } : {}),
      ...(options.generatedAt !== undefined ? { generatedAt: options.generatedAt } : {}),
    },
  };
}

export function normalizeAuditReportViolations(
  violations: readonly Violation<AuditCategory>[],
): readonly AuditReportViolation[] {
  return sortReportViolations(
    violations.map((violation) => {
      const fixHint = resolveViolationFixHint(violation);

      return {
        id: violation.id,
        ruleId: violation.ruleId,
        severity: violation.severity,
        message: violation.message,
        fixHint: fixHint.hint,
        fixHintSource: fixHint.source,
        ...(violation.category !== undefined ? { category: violation.category } : {}),
        ...(violation.location !== undefined
          ? { location: formatAuditReportLocation(violation.location) }
          : {}),
      };
    }),
  );
}

export function formatAuditReportLocation(location: RuleLocation): AuditReportLocation {
  const display = formatLocationDisplay(location);

  return {
    display,
    ...(location.filePath !== undefined ? { filePath: location.filePath } : {}),
    ...(location.startLine !== undefined ? { startLine: location.startLine } : {}),
    ...(location.startColumn !== undefined ? { startColumn: location.startColumn } : {}),
    ...(location.endLine !== undefined ? { endLine: location.endLine } : {}),
    ...(location.endColumn !== undefined ? { endColumn: location.endColumn } : {}),
  };
}

function formatLocationDisplay(location: RuleLocation): string {
  const path = location.filePath ?? 'rule file';

  if (location.startLine === undefined) {
    return path;
  }

  if (location.startColumn === undefined) {
    return `${path}:${location.startLine}`;
  }

  return `${path}:${location.startLine}:${location.startColumn}`;
}
