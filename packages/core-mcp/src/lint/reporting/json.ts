import type { LintResult } from '../types.js';
import { createMcpLintReportModel } from './model.js';
import {
  MCP_LINT_REPORT_SCHEMA_VERSION,
  type McpLintReportJsonOptions,
  type McpLintReportModel,
} from './types.js';

export interface McpLintJsonReportValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export function createMcpLintJsonReportObject(
  result: LintResult,
  options: McpLintReportJsonOptions = {},
): McpLintReportModel {
  return createMcpLintReportModel(result, options);
}

export function formatMcpLintJsonReport(
  result: LintResult,
  options: McpLintReportJsonOptions = {},
): string {
  const report = createMcpLintJsonReportObject(result, options);
  return JSON.stringify(report, null, options.pretty === true ? 2 : 0);
}

export function validateMcpLintJsonReport(value: unknown): McpLintJsonReportValidationResult {
  const errors: string[] = [];

  validateReport(value, '$', errors);

  return { valid: errors.length === 0, errors };
}

function validateReport(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return;
  }

  expectString(value, 'schemaVersion', path, errors);
  expectString(value, 'id', path, errors);
  validateServer(value.server, `${path}.server`, errors);
  expectNumber(value, 'score', path, errors);
  expectNumber(value, 'maxScore', path, errors);
  expectBoolean(value, 'passed', path, errors);
  validateCompositeScore(value.compositeScore, `${path}.compositeScore`, errors);
  validateCategorySubscores(value.categorySubscores, `${path}.categorySubscores`, errors);
  validateArray(value.violations, `${path}.violations`, errors, validateViolation);
  validateArray(value.failingRules, `${path}.failingRules`, errors, validateFailingRule);
  validateMetadata(value.metadata, `${path}.metadata`, errors);
  validateSummary(value.resultSummary, `${path}.resultSummary`, errors);

  if (value.schemaVersion !== MCP_LINT_REPORT_SCHEMA_VERSION) {
    errors.push(`${path}.schemaVersion must match ${MCP_LINT_REPORT_SCHEMA_VERSION}`);
  }
}

function validateServer(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return;
  }

  expectEnum(value, 'transport', ['stdio', 'sse', 'streamable-http', 'unknown'], path, errors);
  validateStringArray(value.capabilities, `${path}.capabilities`, errors);
  expectNumber(value, 'toolCount', path, errors);
  expectNumber(value, 'resourceCount', path, errors);
  expectNumber(value, 'promptCount', path, errors);

  for (const key of ['protocolVersion', 'name', 'version']) {
    if (value[key] !== undefined) {
      expectString(value, key, path, errors);
    }
  }
}

function validateCompositeScore(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return;
  }

  expectNumber(value, 'score', path, errors);
  expectNumber(value, 'maxScore', path, errors);
  expectBoolean(value, 'passed', path, errors);
  expectNumber(value, 'totalViolationCount', path, errors);
  validateSummary(value.summary, `${path}.summary`, errors);
}

function validateSummary(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return;
  }

  for (const key of ['errorCount', 'warningCount', 'infoCount', 'violationCount']) {
    expectNumber(value, key, path, errors);
  }
}

function validateCategorySubscores(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return;
  }

  for (const category of ['protocol', 'schema', 'security', 'performance']) {
    validateCategorySubscore(value[category], `${path}.${category}`, errors, category);
  }
}

function validateCategorySubscore(
  value: unknown,
  path: string,
  errors: string[],
  category: string,
): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return;
  }

  expectEnum(value, 'category', ['protocol', 'schema', 'security', 'performance'], path, errors);
  expectString(value, 'label', path, errors);

  for (const key of [
    'score',
    'maxScore',
    'baseline',
    'deduction',
    'violationCount',
    'errorCount',
    'warningCount',
    'infoCount',
  ]) {
    expectNumber(value, key, path, errors);
  }

  validateStringArray(value.failingRuleIds, `${path}.failingRuleIds`, errors);

  if (value.category !== category) {
    errors.push(`${path}.category must match ${category}`);
  }
}

function validateViolation(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return;
  }

  expectString(value, 'id', path, errors);
  expectString(value, 'ruleId', path, errors);
  expectEnum(value, 'category', ['protocol', 'schema', 'security', 'performance'], path, errors);
  expectString(value, 'categoryLabel', path, errors);
  expectEnum(value, 'severity', ['error', 'warning', 'info'], path, errors);
  expectString(value, 'message', path, errors);
  expectString(value, 'fixHint', path, errors);

  for (const key of ['location', 'evidence']) {
    if (value[key] !== undefined) {
      expectString(value, key, path, errors);
    }
  }
}

function validateFailingRule(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return;
  }

  expectString(value, 'ruleId', path, errors);
  expectEnum(value, 'category', ['protocol', 'schema', 'security', 'performance'], path, errors);
  expectString(value, 'categoryLabel', path, errors);
  expectEnum(value, 'worstSeverity', ['error', 'warning', 'info'], path, errors);
  expectNumber(value, 'count', path, errors);
  expectString(value, 'message', path, errors);
  expectString(value, 'fixHint', path, errors);
  validateStringArray(value.violationIds, `${path}.violationIds`, errors);
}

function validateMetadata(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return;
  }

  expectString(value, 'lintResultId', path, errors);
  expectString(value, 'lintedAt', path, errors);
  expectString(value, 'schemaVersion', path, errors);
  validateStringArray(value.rulesRun, `${path}.rulesRun`, errors);

  if (value.generatedAt !== undefined) {
    expectString(value, 'generatedAt', path, errors);
  }

  if (value.schemaVersion !== MCP_LINT_REPORT_SCHEMA_VERSION) {
    errors.push(`${path}.schemaVersion must match ${MCP_LINT_REPORT_SCHEMA_VERSION}`);
  }
}

function validateArray(
  value: unknown,
  path: string,
  errors: string[],
  validateItem: (item: unknown, itemPath: string, itemErrors: string[]) => void,
): void {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return;
  }

  value.forEach((item, index) => {
    validateItem(item, `${path}[${index}]`, errors);
  });
}

function validateStringArray(value: unknown, path: string, errors: string[]): void {
  validateArray(value, path, errors, (item, itemPath, itemErrors) => {
    if (typeof item !== 'string') {
      itemErrors.push(`${itemPath} must be a string`);
    }
  });
}

function expectString(
  value: Readonly<Record<string, unknown>>,
  key: string,
  path: string,
  errors: string[],
): void {
  if (typeof value[key] !== 'string') {
    errors.push(`${path}.${key} must be a string`);
  }
}

function expectNumber(
  value: Readonly<Record<string, unknown>>,
  key: string,
  path: string,
  errors: string[],
): void {
  const candidate = value[key];

  if (typeof candidate !== 'number' || !Number.isFinite(candidate)) {
    errors.push(`${path}.${key} must be a finite number`);
  }
}

function expectBoolean(
  value: Readonly<Record<string, unknown>>,
  key: string,
  path: string,
  errors: string[],
): void {
  if (typeof value[key] !== 'boolean') {
    errors.push(`${path}.${key} must be a boolean`);
  }
}

function expectEnum(
  value: Readonly<Record<string, unknown>>,
  key: string,
  allowed: readonly string[],
  path: string,
  errors: string[],
): void {
  const candidate = value[key];

  if (typeof candidate !== 'string' || !allowed.includes(candidate)) {
    errors.push(`${path}.${key} must be one of ${allowed.join(', ')}`);
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
