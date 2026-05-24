import { createMcpLintReportModel, type LintResult } from '@sherpa-labs/core-mcp';

export interface JsonFormatterOptions {
  readonly pretty?: boolean;
  readonly quiet?: boolean;
}

export function formatJsonReport(result: LintResult, options: JsonFormatterOptions = {}): string {
  if (options.quiet) {
    return JSON.stringify(
      {
        score: result.score,
        max_score: result.maxScore,
        passed: result.passed,
      },
      null,
      options.pretty === false ? 0 : 2,
    );
  }

  const model = createMcpLintReportModel(result);
  const report = convertToSnakeCase(model);
  return JSON.stringify(report, null, options.pretty === false ? 0 : 2);
}

export interface JsonReport {
  readonly schema_version: string;
  readonly score: number;
  readonly max_score: number;
  readonly passed: boolean;
  readonly violations: readonly JsonViolation[];
  readonly summary: JsonSummary;
  readonly category_subscores: Record<string, JsonCategorySubscore>;
  readonly failing_rules: readonly JsonFailingRule[];
  readonly server_info: JsonServerInfo;
  readonly metadata: JsonMetadata;
}

export interface JsonViolation {
  readonly rule_id: string;
  readonly category: string;
  readonly severity: string;
  readonly message: string;
  readonly fix_hint: string;
  readonly location?: string;
  readonly evidence?: string;
}

export interface JsonSummary {
  readonly error_count: number;
  readonly warning_count: number;
  readonly info_count: number;
  readonly violation_count: number;
}

export interface JsonCategorySubscore {
  readonly category: string;
  readonly label: string;
  readonly score: number;
  readonly max_score: number;
  readonly baseline: number;
  readonly deduction: number;
  readonly violation_count: number;
  readonly error_count: number;
  readonly warning_count: number;
  readonly info_count: number;
  readonly failing_rule_ids: readonly string[];
}

export interface JsonFailingRule {
  readonly rule_id: string;
  readonly category: string;
  readonly category_label: string;
  readonly worst_severity: string;
  readonly count: number;
  readonly message: string;
  readonly fix_hint: string;
  readonly violation_ids: readonly string[];
}

export interface JsonServerInfo {
  readonly transport: string;
  readonly protocol_version?: string;
  readonly name?: string;
  readonly version?: string;
  readonly capabilities: readonly string[];
  readonly tool_count: number;
  readonly resource_count: number;
  readonly prompt_count: number;
}

export interface JsonMetadata {
  readonly schema_version: string;
  readonly linted_at: string;
  readonly rules_run: readonly string[];
}

function convertToSnakeCase(model: ReturnType<typeof createMcpLintReportModel>): JsonReport {
  return {
    schema_version: model.schemaVersion,
    score: model.score,
    max_score: model.maxScore,
    passed: model.passed,
    violations: model.violations.map(convertViolation),
    summary: {
      error_count: model.resultSummary.errorCount,
      warning_count: model.resultSummary.warningCount,
      info_count: model.resultSummary.infoCount,
      violation_count: model.resultSummary.violationCount,
    },
    category_subscores: Object.fromEntries(
      Object.entries(model.categorySubscores).map(([key, subscore]) => [
        key,
        {
          category: subscore.category,
          label: subscore.label,
          score: subscore.score,
          max_score: subscore.maxScore,
          baseline: subscore.baseline,
          deduction: subscore.deduction,
          violation_count: subscore.violationCount,
          error_count: subscore.errorCount,
          warning_count: subscore.warningCount,
          info_count: subscore.infoCount,
          failing_rule_ids: subscore.failingRuleIds,
        },
      ]),
    ),
    failing_rules: model.failingRules.map(convertFailingRule),
    server_info: {
      transport: model.server.transport,
      ...(model.server.protocolVersion !== undefined
        ? { protocol_version: model.server.protocolVersion }
        : {}),
      ...(model.server.name !== undefined ? { name: model.server.name } : {}),
      ...(model.server.version !== undefined ? { version: model.server.version } : {}),
      capabilities: model.server.capabilities,
      tool_count: model.server.toolCount,
      resource_count: model.server.resourceCount,
      prompt_count: model.server.promptCount,
    },
    metadata: {
      schema_version: model.metadata.schemaVersion,
      linted_at: model.metadata.lintedAt,
      rules_run: model.metadata.rulesRun,
    },
  };
}

function convertViolation(
  v: ReturnType<typeof createMcpLintReportModel>['violations'][number],
): JsonViolation {
  return {
    rule_id: v.ruleId,
    category: v.category,
    severity: v.severity,
    message: v.message,
    fix_hint: v.fixHint,
    ...(v.location !== undefined ? { location: v.location } : {}),
    ...(v.evidence !== undefined ? { evidence: v.evidence } : {}),
  };
}

function convertFailingRule(
  r: ReturnType<typeof createMcpLintReportModel>['failingRules'][number],
): JsonFailingRule {
  return {
    rule_id: r.ruleId,
    category: r.category,
    category_label: r.categoryLabel,
    worst_severity: r.worstSeverity,
    count: r.count,
    message: r.message,
    fix_hint: r.fixHint,
    violation_ids: r.violationIds,
  };
}
