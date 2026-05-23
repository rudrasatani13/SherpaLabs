import type {
  AuditCategory,
  AuditConfig,
  AuditRuleOverride,
  AuditRecommendationPriority,
  AuditThresholds,
  RuleFileKind,
  RuleLocation,
  RuleSet,
  StackContext,
  ViolationSeverity,
} from '@sherpa-labs/shared-types';

export type AuditRuleSeverity = ViolationSeverity;

export interface AuditFileMetadata {
  readonly id: string;
  readonly path: string;
  readonly kind: RuleFileKind;
  readonly sizeBytes: number;
  readonly tokenCount: number;
  readonly modifiedAt?: string;
  readonly encoding?: string;
}

export interface ResolvedAuditConfig extends AuditConfig {
  readonly ignoredRules: readonly string[];
  readonly includedRules: readonly string[];
  readonly ruleOverrides: Readonly<Record<string, AuditRuleOverride>>;
  readonly severityWeights: Readonly<Record<ViolationSeverity, number>>;
  readonly thresholds: AuditThresholds;
}

export interface AuditContext {
  readonly ruleSet: RuleSet;
  readonly stack: StackContext;
  readonly fileMetadata: readonly AuditFileMetadata[];
  readonly totalTokenCount: number;
  readonly config: ResolvedAuditConfig;
  readonly thresholds: AuditThresholds;
}

export interface AuditRuleViolationInput {
  readonly message: string;
  readonly category?: AuditCategory;
  readonly location?: RuleLocation;
  readonly fixHint?: string;
}

export interface AuditRuleRecommendationInput {
  readonly message: string;
  readonly priority: AuditRecommendationPriority;
  readonly ruleIds?: readonly string[];
  readonly fixHint?: string;
}

export interface AuditRuleCheckResult {
  readonly violations?: readonly AuditRuleViolationInput[];
  readonly recommendations?: readonly AuditRuleRecommendationInput[];
}

export type AuditRuleCheckReturn =
  | AuditRuleCheckResult
  | readonly AuditRuleViolationInput[]
  | Promise<AuditRuleCheckResult | readonly AuditRuleViolationInput[]>;

export interface AuditRule {
  readonly id: string;
  readonly severity: ViolationSeverity;
  readonly title: string;
  readonly description: string;
  check(context: AuditContext): AuditRuleCheckReturn;
}

export type AuditRuleModule =
  | AuditRule
  | readonly AuditRule[]
  | {
      readonly default?: AuditRule | readonly AuditRule[];
      readonly rule?: AuditRule;
      readonly rules?: readonly AuditRule[];
    };
