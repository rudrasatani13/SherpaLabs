import type { LintResult, LintServerSummary } from '../types.js';
import { getFailingMcpLintRules } from './failing-rules.js';
import { prioritizeMcpLintViolations, toMcpLintReportViolation } from './prioritize.js';
import { calculateMcpLintCategorySubscores } from './subscores.js';
import {
  MCP_LINT_REPORT_SCHEMA_VERSION,
  type McpLintCompositeScore,
  type McpLintReportBuildOptions,
  type McpLintReportModel,
  type McpLintReportSource,
} from './types.js';

export function calculateMcpLintCompositeScore(
  result: Pick<LintResult, 'score' | 'maxScore' | 'passed' | 'violations' | 'summary'>,
): McpLintCompositeScore {
  return {
    score: result.score,
    maxScore: result.maxScore,
    passed: result.passed,
    totalViolationCount: result.violations.length,
    summary: {
      errorCount: result.summary.errorCount,
      warningCount: result.summary.warningCount,
      infoCount: result.summary.infoCount,
      violationCount: result.summary.violationCount,
    },
  };
}

export function createMcpLintReportModel(
  result: McpLintReportSource,
  options: McpLintReportBuildOptions = {},
): McpLintReportModel {
  return {
    schemaVersion: MCP_LINT_REPORT_SCHEMA_VERSION,
    id: result.id,
    server: normalizeServerSummary(result.server),
    score: result.score,
    maxScore: result.maxScore,
    passed: result.passed,
    compositeScore: calculateMcpLintCompositeScore(result),
    categorySubscores: calculateMcpLintCategorySubscores(result),
    violations: prioritizeMcpLintViolations(result.violations).map(toMcpLintReportViolation),
    failingRules: getFailingMcpLintRules(result),
    metadata: {
      lintResultId: result.id,
      lintedAt: result.lintedAt,
      schemaVersion: MCP_LINT_REPORT_SCHEMA_VERSION,
      rulesRun: [...result.rulesRun],
      ...(options.generatedAt !== undefined ? { generatedAt: options.generatedAt } : {}),
    },
    resultSummary: {
      errorCount: result.summary.errorCount,
      warningCount: result.summary.warningCount,
      infoCount: result.summary.infoCount,
      violationCount: result.summary.violationCount,
    },
  };
}

function normalizeServerSummary(server: LintServerSummary): LintServerSummary {
  return {
    transport: server.transport,
    ...(server.protocolVersion !== undefined ? { protocolVersion: server.protocolVersion } : {}),
    ...(server.name !== undefined ? { name: server.name } : {}),
    ...(server.version !== undefined ? { version: server.version } : {}),
    capabilities: [...server.capabilities],
    toolCount: server.toolCount,
    resourceCount: server.resourceCount,
    promptCount: server.promptCount,
  };
}
