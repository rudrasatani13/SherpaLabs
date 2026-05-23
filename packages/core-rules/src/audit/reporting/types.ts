import type {
  AuditCategory,
  AuditRecommendationPriority,
  AuditSummary,
  RuleLocation,
  ViolationSeverity,
} from '@sherpa-labs/shared-types';

export const AUDIT_REPORT_SCHEMA_VERSION = '1.0.0';

export const AUDIT_REPORT_SEVERITIES = [
  'error',
  'warning',
  'info',
] as const satisfies readonly ViolationSeverity[];

export type AuditReportFixHintSource = 'rule' | 'fallback';

export type AuditReportQuickWinEffort = 'low';

export interface AuditReportLocation extends RuleLocation {
  readonly display: string;
}

export interface AuditReportViolation {
  readonly id: string;
  readonly ruleId: string;
  readonly severity: ViolationSeverity;
  readonly message: string;
  readonly fixHint: string;
  readonly fixHintSource: AuditReportFixHintSource;
  readonly category?: AuditCategory;
  readonly location?: AuditReportLocation;
}

export interface AuditReportSummary extends AuditSummary {
  readonly violationCount: number;
  readonly quickWinCount: number;
  readonly categoryCounts: Readonly<Record<string, number>>;
}

export interface AuditReportRecommendation {
  readonly id: string;
  readonly message: string;
  readonly priority: AuditRecommendationPriority;
  readonly impact: number;
  readonly occurrenceCount: number;
  readonly ruleIds: readonly string[];
  readonly violationIds: readonly string[];
  readonly categories: readonly AuditCategory[];
  readonly fixHint?: string;
  readonly severity?: ViolationSeverity;
  readonly quickWin?: boolean;
}

export interface AuditReportQuickWin {
  readonly id: string;
  readonly title: string;
  readonly message: string;
  readonly effort: AuditReportQuickWinEffort;
  readonly impact: number;
  readonly occurrenceCount: number;
  readonly ruleIds: readonly string[];
  readonly violationIds: readonly string[];
  readonly fixHint: string;
  readonly category?: AuditCategory;
  readonly severity?: ViolationSeverity;
}

export interface AuditReportMetadata {
  readonly auditId: string;
  readonly auditedAt: string;
  readonly schemaVersion: string;
  readonly ruleSetId?: string;
  readonly generatedAt?: string;
}

export interface AuditReportModel {
  readonly schemaVersion: string;
  readonly id: string;
  readonly score: number;
  readonly maxScore: number;
  readonly passed: boolean;
  readonly summary: AuditReportSummary;
  readonly recommendations: readonly AuditReportRecommendation[];
  readonly quickWins: readonly AuditReportQuickWin[];
  readonly violations: readonly AuditReportViolation[];
  readonly metadata: AuditReportMetadata;
}

export interface AuditReportBuildOptions {
  readonly generatedAt?: string;
  readonly maxRecommendations?: number;
  readonly maxQuickWins?: number;
}

export interface AuditReportTerminalOptions extends AuditReportBuildOptions {
  readonly colors?: boolean;
  readonly maxViolationsPerSeverity?: number;
}

export interface AuditReportMarkdownOptions extends AuditReportBuildOptions {
  readonly maxViolationsPerSeverity?: number;
}

export interface AuditReportJsonOptions extends AuditReportBuildOptions {
  readonly pretty?: boolean;
}

export interface GroupedAuditReportViolations {
  readonly error: readonly AuditReportViolation[];
  readonly warning: readonly AuditReportViolation[];
  readonly info: readonly AuditReportViolation[];
}
