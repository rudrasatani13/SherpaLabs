import { AUDIT_REPORT_SCHEMA_VERSION } from './types.js';

export const AUDIT_REPORT_JSON_SCHEMA_ID = 'https://sherpa-labs.io/schemas/audit-report.v1.json';

export interface JsonSchemaObject {
  readonly $schema?: string;
  readonly $id?: string;
  readonly $ref?: string;
  readonly $defs?: Readonly<Record<string, JsonSchemaObject>>;
  readonly title?: string;
  readonly description?: string;
  readonly type?: string | readonly string[];
  readonly enum?: readonly string[];
  readonly const?: string | number | boolean;
  readonly required?: readonly string[];
  readonly properties?: Readonly<Record<string, JsonSchemaObject>>;
  readonly items?: JsonSchemaObject;
  readonly additionalProperties?: boolean | JsonSchemaObject;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly format?: string;
}

const locationSchema = {
  type: 'object',
  required: ['display'],
  additionalProperties: false,
  properties: {
    display: { type: 'string' },
    filePath: { type: 'string' },
    startLine: { type: 'number', minimum: 1 },
    startColumn: { type: 'number', minimum: 1 },
    endLine: { type: 'number', minimum: 1 },
    endColumn: { type: 'number', minimum: 1 },
  },
} as const satisfies JsonSchemaObject;

const violationSchema = {
  type: 'object',
  required: ['id', 'ruleId', 'severity', 'message', 'fixHint', 'fixHintSource'],
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    ruleId: { type: 'string' },
    severity: { enum: ['error', 'warning', 'info'] },
    category: { type: 'string' },
    message: { type: 'string' },
    fixHint: { type: 'string' },
    fixHintSource: { enum: ['rule', 'fallback'] },
    location: { $ref: '#/$defs/location' },
  },
} as const satisfies JsonSchemaObject;

const recommendationSchema = {
  type: 'object',
  required: [
    'id',
    'message',
    'priority',
    'impact',
    'occurrenceCount',
    'ruleIds',
    'violationIds',
    'categories',
  ],
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    message: { type: 'string' },
    priority: { enum: ['high', 'medium', 'low'] },
    impact: { type: 'number', minimum: 0 },
    occurrenceCount: { type: 'number', minimum: 0 },
    ruleIds: { type: 'array', items: { type: 'string' } },
    violationIds: { type: 'array', items: { type: 'string' } },
    categories: { type: 'array', items: { type: 'string' } },
    fixHint: { type: 'string' },
    severity: { enum: ['error', 'warning', 'info'] },
    quickWin: { type: 'boolean' },
  },
} as const satisfies JsonSchemaObject;

const quickWinSchema = {
  type: 'object',
  required: [
    'id',
    'title',
    'message',
    'effort',
    'impact',
    'occurrenceCount',
    'ruleIds',
    'violationIds',
    'fixHint',
  ],
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    message: { type: 'string' },
    effort: { const: 'low' },
    impact: { type: 'number', minimum: 0 },
    occurrenceCount: { type: 'number', minimum: 1 },
    ruleIds: { type: 'array', items: { type: 'string' } },
    violationIds: { type: 'array', items: { type: 'string' } },
    fixHint: { type: 'string' },
    category: { type: 'string' },
    severity: { enum: ['error', 'warning', 'info'] },
  },
} as const satisfies JsonSchemaObject;

export const auditReportJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: AUDIT_REPORT_JSON_SCHEMA_ID,
  title: 'Sherpa Labs Audit Report',
  description:
    'Stable machine-readable output for Sherpa Labs rule-file audit reports. Optional timestamps are only present when supplied by the caller or audit engine.',
  type: 'object',
  required: [
    'schemaVersion',
    'id',
    'score',
    'maxScore',
    'passed',
    'summary',
    'recommendations',
    'quickWins',
    'violations',
    'metadata',
  ],
  additionalProperties: false,
  properties: {
    schemaVersion: { const: AUDIT_REPORT_SCHEMA_VERSION },
    id: { type: 'string' },
    score: { type: 'number', minimum: 0 },
    maxScore: { type: 'number', minimum: 0 },
    passed: { type: 'boolean' },
    summary: {
      type: 'object',
      required: [
        'errorCount',
        'warningCount',
        'infoCount',
        'recommendationCount',
        'violationCount',
        'quickWinCount',
        'categoryCounts',
      ],
      additionalProperties: false,
      properties: {
        errorCount: { type: 'number', minimum: 0 },
        warningCount: { type: 'number', minimum: 0 },
        infoCount: { type: 'number', minimum: 0 },
        recommendationCount: { type: 'number', minimum: 0 },
        violationCount: { type: 'number', minimum: 0 },
        quickWinCount: { type: 'number', minimum: 0 },
        categoryCounts: {
          type: 'object',
          additionalProperties: { type: 'number', minimum: 0 },
        },
      },
    },
    recommendations: { type: 'array', items: { $ref: '#/$defs/recommendation' } },
    quickWins: { type: 'array', items: { $ref: '#/$defs/quickWin' } },
    violations: { type: 'array', items: { $ref: '#/$defs/violation' } },
    metadata: {
      type: 'object',
      required: ['auditId', 'auditedAt', 'schemaVersion'],
      additionalProperties: false,
      properties: {
        auditId: { type: 'string' },
        ruleSetId: { type: 'string' },
        auditedAt: { type: 'string', format: 'date-time' },
        generatedAt: { type: 'string', format: 'date-time' },
        schemaVersion: { const: AUDIT_REPORT_SCHEMA_VERSION },
      },
    },
  },
  $defs: {
    location: locationSchema,
    violation: violationSchema,
    recommendation: recommendationSchema,
    quickWin: quickWinSchema,
  },
} as const satisfies JsonSchemaObject;
