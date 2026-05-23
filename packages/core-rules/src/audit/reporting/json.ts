import type { AuditResult } from '@sherpa-labs/shared-types';
import { createAuditReportModel } from './model.js';
import {
  AUDIT_REPORT_SCHEMA_VERSION,
  type AuditReportJsonOptions,
  type AuditReportModel,
} from './types.js';

export interface AuditReportJsonValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export function createAuditReportJsonObject(
  result: AuditResult,
  options: AuditReportJsonOptions = {},
): AuditReportModel {
  return createAuditReportModel(result, options);
}

export function formatAuditReportJson(
  result: AuditResult,
  options: AuditReportJsonOptions = {},
): string {
  const report = createAuditReportJsonObject(result, options);
  return JSON.stringify(report, null, options.pretty === true ? 2 : 0);
}

export function validateAuditReportJson(value: unknown): AuditReportJsonValidationResult {
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
  expectNumber(value, 'score', path, errors);
  expectNumber(value, 'maxScore', path, errors);
  expectBoolean(value, 'passed', path, errors);
  validateSummary(value.summary, `${path}.summary`, errors);
  validateArray(value.recommendations, `${path}.recommendations`, errors, validateRecommendation);
  validateArray(value.quickWins, `${path}.quickWins`, errors, validateQuickWin);
  validateArray(value.violations, `${path}.violations`, errors, validateViolation);
  validateMetadata(value.metadata, `${path}.metadata`, errors);

  if (value.schemaVersion !== AUDIT_REPORT_SCHEMA_VERSION) {
    errors.push(`${path}.schemaVersion must match ${AUDIT_REPORT_SCHEMA_VERSION}`);
  }
}

function validateSummary(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return;
  }

  for (const key of [
    'errorCount',
    'warningCount',
    'infoCount',
    'recommendationCount',
    'violationCount',
    'quickWinCount',
  ]) {
    expectNumber(value, key, path, errors);
  }

  if (!isRecord(value.categoryCounts)) {
    errors.push(`${path}.categoryCounts must be an object`);
    return;
  }

  for (const [key, count] of Object.entries(value.categoryCounts)) {
    if (typeof count !== 'number') {
      errors.push(`${path}.categoryCounts.${key} must be a number`);
    }
  }
}

function validateRecommendation(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return;
  }

  expectString(value, 'id', path, errors);
  expectString(value, 'message', path, errors);
  expectEnum(value, 'priority', ['high', 'medium', 'low'], path, errors);
  expectNumber(value, 'impact', path, errors);
  expectNumber(value, 'occurrenceCount', path, errors);
  validateStringArray(value.ruleIds, `${path}.ruleIds`, errors);
  validateStringArray(value.violationIds, `${path}.violationIds`, errors);
  validateStringArray(value.categories, `${path}.categories`, errors);

  if (value.fixHint !== undefined) {
    expectString(value, 'fixHint', path, errors);
  }

  if (value.severity !== undefined) {
    expectEnum(value, 'severity', ['error', 'warning', 'info'], path, errors);
  }

  if (value.quickWin !== undefined) {
    expectBoolean(value, 'quickWin', path, errors);
  }
}

function validateQuickWin(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return;
  }

  expectString(value, 'id', path, errors);
  expectString(value, 'title', path, errors);
  expectString(value, 'message', path, errors);
  expectEnum(value, 'effort', ['low'], path, errors);
  expectNumber(value, 'impact', path, errors);
  expectNumber(value, 'occurrenceCount', path, errors);
  validateStringArray(value.ruleIds, `${path}.ruleIds`, errors);
  validateStringArray(value.violationIds, `${path}.violationIds`, errors);
  expectString(value, 'fixHint', path, errors);

  if (value.category !== undefined) {
    expectString(value, 'category', path, errors);
  }

  if (value.severity !== undefined) {
    expectEnum(value, 'severity', ['error', 'warning', 'info'], path, errors);
  }
}

function validateViolation(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return;
  }

  expectString(value, 'id', path, errors);
  expectString(value, 'ruleId', path, errors);
  expectEnum(value, 'severity', ['error', 'warning', 'info'], path, errors);
  expectString(value, 'message', path, errors);
  expectString(value, 'fixHint', path, errors);
  expectEnum(value, 'fixHintSource', ['rule', 'fallback'], path, errors);

  if (value.category !== undefined) {
    expectString(value, 'category', path, errors);
  }

  if (value.location !== undefined) {
    validateLocation(value.location, `${path}.location`, errors);
  }
}

function validateLocation(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return;
  }

  expectString(value, 'display', path, errors);

  for (const key of ['filePath']) {
    if (value[key] !== undefined) {
      expectString(value, key, path, errors);
    }
  }

  for (const key of ['startLine', 'startColumn', 'endLine', 'endColumn']) {
    if (value[key] !== undefined) {
      expectNumber(value, key, path, errors);
    }
  }
}

function validateMetadata(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return;
  }

  expectString(value, 'auditId', path, errors);
  expectString(value, 'auditedAt', path, errors);
  expectString(value, 'schemaVersion', path, errors);

  if (value.ruleSetId !== undefined) {
    expectString(value, 'ruleSetId', path, errors);
  }

  if (value.generatedAt !== undefined) {
    expectString(value, 'generatedAt', path, errors);
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
