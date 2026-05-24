import { MCP_LINT_REPORT_SCHEMA_VERSION } from './types.js';

export const MCP_LINT_REPORT_JSON_SCHEMA_ID =
  'https://sherpa-labs.io/schemas/mcp-lint-report.v1.json';

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

const summarySchema = {
  type: 'object',
  required: ['errorCount', 'warningCount', 'infoCount', 'violationCount'],
  additionalProperties: false,
  properties: {
    errorCount: { type: 'number', minimum: 0 },
    warningCount: { type: 'number', minimum: 0 },
    infoCount: { type: 'number', minimum: 0 },
    violationCount: { type: 'number', minimum: 0 },
  },
} as const satisfies JsonSchemaObject;

const serverSchema = {
  type: 'object',
  required: ['transport', 'capabilities', 'toolCount', 'resourceCount', 'promptCount'],
  additionalProperties: false,
  properties: {
    transport: { enum: ['stdio', 'sse', 'streamable-http', 'unknown'] },
    protocolVersion: { type: 'string' },
    name: { type: 'string' },
    version: { type: 'string' },
    capabilities: { type: 'array', items: { type: 'string' } },
    toolCount: { type: 'number', minimum: 0 },
    resourceCount: { type: 'number', minimum: 0 },
    promptCount: { type: 'number', minimum: 0 },
  },
} as const satisfies JsonSchemaObject;

const compositeScoreSchema = {
  type: 'object',
  required: ['score', 'maxScore', 'passed', 'totalViolationCount', 'summary'],
  additionalProperties: false,
  properties: {
    score: { type: 'number', minimum: 0 },
    maxScore: { type: 'number', minimum: 0 },
    passed: { type: 'boolean' },
    totalViolationCount: { type: 'number', minimum: 0 },
    summary: { $ref: '#/$defs/summary' },
  },
} as const satisfies JsonSchemaObject;

const categorySubscoreSchema = {
  type: 'object',
  required: [
    'category',
    'label',
    'score',
    'maxScore',
    'baseline',
    'deduction',
    'violationCount',
    'errorCount',
    'warningCount',
    'infoCount',
    'failingRuleIds',
  ],
  additionalProperties: false,
  properties: {
    category: { enum: ['protocol', 'schema', 'security', 'performance'] },
    label: { type: 'string' },
    score: { type: 'number', minimum: 0, maximum: 100 },
    maxScore: { type: 'number', minimum: 0, maximum: 100 },
    baseline: { type: 'number', minimum: 0, maximum: 100 },
    deduction: { type: 'number', minimum: 0, maximum: 100 },
    violationCount: { type: 'number', minimum: 0 },
    errorCount: { type: 'number', minimum: 0 },
    warningCount: { type: 'number', minimum: 0 },
    infoCount: { type: 'number', minimum: 0 },
    failingRuleIds: { type: 'array', items: { type: 'string' } },
  },
} as const satisfies JsonSchemaObject;

const categorySubscoresSchema = {
  type: 'object',
  required: ['protocol', 'schema', 'security', 'performance'],
  additionalProperties: false,
  properties: {
    protocol: { $ref: '#/$defs/categorySubscore' },
    schema: { $ref: '#/$defs/categorySubscore' },
    security: { $ref: '#/$defs/categorySubscore' },
    performance: { $ref: '#/$defs/categorySubscore' },
  },
} as const satisfies JsonSchemaObject;

const violationSchema = {
  type: 'object',
  required: ['id', 'ruleId', 'category', 'categoryLabel', 'severity', 'message', 'fixHint'],
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    ruleId: { type: 'string' },
    category: { enum: ['protocol', 'schema', 'security', 'performance'] },
    categoryLabel: { type: 'string' },
    severity: { enum: ['error', 'warning', 'info'] },
    message: { type: 'string' },
    fixHint: { type: 'string' },
    location: { type: 'string' },
    evidence: { type: 'string' },
  },
} as const satisfies JsonSchemaObject;

const failingRuleSchema = {
  type: 'object',
  required: [
    'ruleId',
    'category',
    'categoryLabel',
    'worstSeverity',
    'count',
    'message',
    'fixHint',
    'violationIds',
  ],
  additionalProperties: false,
  properties: {
    ruleId: { type: 'string' },
    category: { enum: ['protocol', 'schema', 'security', 'performance'] },
    categoryLabel: { type: 'string' },
    worstSeverity: { enum: ['error', 'warning', 'info'] },
    count: { type: 'number', minimum: 1 },
    message: { type: 'string' },
    fixHint: { type: 'string' },
    violationIds: { type: 'array', items: { type: 'string' } },
  },
} as const satisfies JsonSchemaObject;

const metadataSchema = {
  type: 'object',
  required: ['lintResultId', 'lintedAt', 'schemaVersion', 'rulesRun'],
  additionalProperties: false,
  properties: {
    lintResultId: { type: 'string' },
    lintedAt: { type: 'string', format: 'date-time' },
    generatedAt: { type: 'string', format: 'date-time' },
    schemaVersion: { const: MCP_LINT_REPORT_SCHEMA_VERSION },
    rulesRun: { type: 'array', items: { type: 'string' } },
  },
} as const satisfies JsonSchemaObject;

export const mcpLintReportJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: MCP_LINT_REPORT_JSON_SCHEMA_ID,
  title: 'Sherpa Labs MCP Lint Report',
  description:
    'Stable machine-readable output for aimcp-lint reports. generatedAt is only present when supplied by the caller.',
  type: 'object',
  required: [
    'schemaVersion',
    'id',
    'server',
    'score',
    'maxScore',
    'passed',
    'compositeScore',
    'categorySubscores',
    'violations',
    'failingRules',
    'metadata',
    'resultSummary',
  ],
  additionalProperties: false,
  properties: {
    schemaVersion: { const: MCP_LINT_REPORT_SCHEMA_VERSION },
    id: { type: 'string' },
    server: { $ref: '#/$defs/server' },
    score: { type: 'number', minimum: 0 },
    maxScore: { type: 'number', minimum: 0 },
    passed: { type: 'boolean' },
    compositeScore: { $ref: '#/$defs/compositeScore' },
    categorySubscores: { $ref: '#/$defs/categorySubscores' },
    violations: { type: 'array', items: { $ref: '#/$defs/violation' } },
    failingRules: { type: 'array', items: { $ref: '#/$defs/failingRule' } },
    metadata: { $ref: '#/$defs/metadata' },
    resultSummary: { $ref: '#/$defs/summary' },
  },
  $defs: {
    summary: summarySchema,
    server: serverSchema,
    compositeScore: compositeScoreSchema,
    categorySubscore: categorySubscoreSchema,
    categorySubscores: categorySubscoresSchema,
    violation: violationSchema,
    failingRule: failingRuleSchema,
    metadata: metadataSchema,
  },
} as const satisfies JsonSchemaObject;
