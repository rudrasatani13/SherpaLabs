import type { EntityId, IsoDateString } from './common';
import type { RuleLocation } from './rule-files';

export type ViolationSeverity = 'error' | 'warning' | 'info';

export type AuditCategory =
  | 'token-budget'
  | 'conflict'
  | 'vague-directive'
  | 'missing-context'
  | 'duplication'
  | 'outdated-reference'
  | 'priority-signal'
  | 'structure'
  | 'examples'
  | 'ambiguity'
  | 'custom';

export interface Violation<TCategory extends string = string> {
  readonly id: EntityId;
  readonly ruleId: string;
  readonly severity: ViolationSeverity;
  readonly message: string;
  readonly category?: TCategory;
  readonly location?: RuleLocation;
  readonly fixHint?: string;
}

export type AuditRecommendationPriority = 'high' | 'medium' | 'low';

export interface AuditRecommendation {
  readonly id: EntityId;
  readonly message: string;
  readonly priority: AuditRecommendationPriority;
  readonly ruleIds?: readonly string[];
  readonly fixHint?: string;
}

export interface AuditSummary {
  readonly errorCount: number;
  readonly warningCount: number;
  readonly infoCount: number;
  readonly recommendationCount: number;
}

export interface AuditRuleOverride {
  readonly enabled?: boolean;
  readonly severity?: ViolationSeverity;
  readonly thresholds?: Readonly<Record<string, number>>;
}

export interface AuditThresholds {
  readonly minimumScore?: number;
  readonly maxFileTokens?: number;
  readonly maxTotalTokens?: number;
  readonly maxViolationsBySeverity?: Readonly<Partial<Record<ViolationSeverity, number>>>;
}

export interface AuditConfig {
  readonly failUnder?: number;
  readonly ignoredRules?: readonly string[];
  readonly includedRules?: readonly string[];
  readonly ruleOverrides?: Readonly<Record<string, AuditRuleOverride>>;
  readonly severityWeights?: Readonly<Partial<Record<ViolationSeverity, number>>>;
  readonly thresholds?: AuditThresholds;
}

export interface AuditResult {
  readonly id: EntityId;
  readonly ruleSetId?: EntityId;
  readonly score: number;
  readonly maxScore: number;
  readonly passed: boolean;
  readonly violations: readonly Violation<AuditCategory>[];
  readonly recommendations: readonly AuditRecommendation[];
  readonly summary: AuditSummary;
  readonly auditedAt: IsoDateString;
}
