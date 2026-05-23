export {
  createAuditContext,
  buildFileMetadata,
  type CreateAuditContextOptions,
} from './context.js';
export {
  DEFAULT_AUDIT_CONFIG,
  DEFAULT_CONFIG_MAX_BYTES,
  SHERPA_CONFIG_FILE_NAME,
  loadAuditConfig,
  resolveAuditConfig,
  type AuditConfigIssue,
  type AuditConfigIssueCode,
  type AuditConfigIssueSeverity,
  type AuditConfigLoadResult,
  type LoadAuditConfigOptions,
  type SherpaJsonAuditConfig,
  type SherpaJsonConfig,
} from './config.js';
export {
  AuditEngine,
  runAudit,
  type AuditEngineOptions,
  type AuditEngineRunInput,
} from './engine.js';
export {
  AuditRuleRegistry,
  createAuditRuleRegistry,
  normalizeAuditRules,
  type RegisteredAuditRule,
} from './registry.js';
export {
  AUDIT_BASELINE_SCORE,
  AUDIT_MAX_SCORE,
  AUDIT_MIN_SCORE,
  DEFAULT_SEVERITY_WEIGHTS,
  calculateAuditScore,
  summarizeAudit,
  type AuditScoreOptions,
  type AuditScoreResult,
} from './scoring.js';
export {
  parseErrorRule,
  parseWarningRule,
  parseProblemRules,
  defaultAuditRules,
} from './rules/index.js';
export type {
  AuditContext,
  AuditFileMetadata,
  AuditRule,
  AuditRuleCheckResult,
  AuditRuleCheckReturn,
  AuditRuleModule,
  AuditRuleRecommendationInput,
  AuditRuleSeverity,
  AuditRuleViolationInput,
  ResolvedAuditConfig,
} from './types.js';
