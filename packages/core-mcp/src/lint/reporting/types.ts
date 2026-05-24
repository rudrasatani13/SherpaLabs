import type {
  LintResult,
  LintRuleCategory,
  LintRuleSeverity,
  LintServerSummary,
  LintSummary,
} from '../types.js';

export const MCP_LINT_REPORT_SCHEMA_VERSION = '1.0.0';

export const MCP_LINT_REPORT_SCORE_CATEGORIES = [
  'protocol',
  'schema',
  'security',
  'performance',
] as const satisfies readonly LintRuleCategory[];

export const MCP_LINT_REPORT_PRIORITY_CATEGORIES = [
  'security',
  'protocol',
  'schema',
  'performance',
] as const satisfies readonly LintRuleCategory[];

export const MCP_LINT_REPORT_SEVERITIES = [
  'error',
  'warning',
  'info',
] as const satisfies readonly LintRuleSeverity[];

export const MCP_LINT_CATEGORY_LABELS = {
  protocol: 'Protocol',
  schema: 'Schema',
  security: 'Security',
  performance: 'Performance',
} as const satisfies Readonly<Record<LintRuleCategory, string>>;

export interface McpLintCompositeScore {
  readonly score: number;
  readonly maxScore: number;
  readonly passed: boolean;
  readonly totalViolationCount: number;
  readonly summary: LintSummary;
}

export interface McpLintCategorySubscore {
  readonly category: LintRuleCategory;
  readonly label: string;
  readonly score: number;
  readonly maxScore: number;
  readonly baseline: number;
  readonly deduction: number;
  readonly violationCount: number;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly infoCount: number;
  readonly failingRuleIds: readonly string[];
}

export type McpLintCategorySubscores = Readonly<Record<LintRuleCategory, McpLintCategorySubscore>>;

export interface McpLintReportViolation {
  readonly id: string;
  readonly ruleId: string;
  readonly category: LintRuleCategory;
  readonly categoryLabel: string;
  readonly severity: LintRuleSeverity;
  readonly message: string;
  readonly fixHint: string;
  readonly location?: string;
  readonly evidence?: string;
}

export interface McpLintFailingRuleSummary {
  readonly ruleId: string;
  readonly category: LintRuleCategory;
  readonly categoryLabel: string;
  readonly worstSeverity: LintRuleSeverity;
  readonly count: number;
  readonly message: string;
  readonly fixHint: string;
  readonly violationIds: readonly string[];
}

export interface McpLintReportMetadata {
  readonly lintResultId: string;
  readonly lintedAt: string;
  readonly schemaVersion: string;
  readonly rulesRun: readonly string[];
  readonly generatedAt?: string;
}

export interface McpLintReportModel {
  readonly schemaVersion: string;
  readonly id: string;
  readonly server: LintServerSummary;
  readonly score: number;
  readonly maxScore: number;
  readonly passed: boolean;
  readonly compositeScore: McpLintCompositeScore;
  readonly categorySubscores: McpLintCategorySubscores;
  readonly violations: readonly McpLintReportViolation[];
  readonly failingRules: readonly McpLintFailingRuleSummary[];
  readonly metadata: McpLintReportMetadata;
  readonly resultSummary: LintSummary;
}

export interface McpLintReportBuildOptions {
  readonly generatedAt?: string;
}

export interface McpLintReportTerminalOptions extends McpLintReportBuildOptions {
  readonly colors?: boolean;
  readonly maxViolationsPerCategory?: number;
}

export interface McpLintReportMarkdownOptions extends McpLintReportBuildOptions {
  readonly maxTopViolations?: number;
  readonly maxViolationsPerCategory?: number;
}

export interface McpLintReportJsonOptions extends McpLintReportBuildOptions {
  readonly pretty?: boolean;
}

export type GroupedMcpLintReportViolations = Readonly<
  Record<LintRuleCategory, readonly McpLintReportViolation[]>
>;

export type McpLintReportSource = Pick<
  LintResult,
  | 'id'
  | 'server'
  | 'score'
  | 'maxScore'
  | 'passed'
  | 'violations'
  | 'summary'
  | 'rulesRun'
  | 'lintedAt'
>;
