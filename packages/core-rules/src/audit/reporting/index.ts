export {
  AUDIT_CATEGORY_COPY,
  getAuditIssueCopy,
  getViolationFixHint,
  resolveViolationFixHint,
  type AuditIssueCopy,
  type ResolvedViolationFixHint,
} from './fix-hints.js';
export {
  createAuditReportJsonObject,
  formatAuditReportJson,
  validateAuditReportJson,
  type AuditReportJsonValidationResult,
} from './json.js';
export { formatAuditReportMarkdown, DEFAULT_MARKDOWN_VIOLATION_LIMIT } from './markdown.js';
export {
  createAuditReportModel,
  formatAuditReportLocation,
  normalizeAuditReportViolations,
} from './model.js';
export {
  compareAuditQuickWins,
  DEFAULT_QUICK_WIN_LIMIT,
  getAuditQuickWins,
  isQuickWinViolation,
} from './quick-wins.js';
export {
  compareAuditReportRecommendations,
  DEFAULT_RECOMMENDATION_LIMIT,
  getTopAuditRecommendations,
} from './recommendations.js';
export {
  calculateCompositeAuditScore,
  compareReportViolations,
  groupViolationsBySeverity,
  severityImpact,
  severityRank,
  sortReportViolations,
  AUDIT_REPORT_SEVERITY_IMPACT,
  type CompositeAuditScoreOptions,
  type CompositeAuditScoreResult,
} from './score.js';
export {
  AUDIT_REPORT_JSON_SCHEMA_ID,
  auditReportJsonSchema,
  type JsonSchemaObject,
} from './schema.js';
export { formatAuditReportTerminal, DEFAULT_TERMINAL_VIOLATION_LIMIT } from './terminal.js';
export {
  AUDIT_REPORT_SCHEMA_VERSION,
  AUDIT_REPORT_SEVERITIES,
  type AuditReportBuildOptions,
  type AuditReportFixHintSource,
  type AuditReportJsonOptions,
  type AuditReportLocation,
  type AuditReportMarkdownOptions,
  type AuditReportMetadata,
  type AuditReportModel,
  type AuditReportQuickWin,
  type AuditReportQuickWinEffort,
  type AuditReportRecommendation,
  type AuditReportSummary,
  type AuditReportTerminalOptions,
  type AuditReportViolation,
  type GroupedAuditReportViolations,
} from './types.js';
