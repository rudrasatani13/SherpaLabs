import { resolve } from 'node:path';
import { deterministicId, normalizePath, safeReadFile } from '@sherpa-labs/core-utils';
import type {
  AuditConfig,
  AuditRuleOverride,
  AuditThresholds,
  ViolationSeverity,
} from '@sherpa-labs/shared-types';
import { DEFAULT_SEVERITY_WEIGHTS } from './scoring.js';
import type { ResolvedAuditConfig } from './types.js';

export const SHERPA_CONFIG_FILE_NAME = '.sherpa.json';
export const DEFAULT_CONFIG_MAX_BYTES = 128 * 1024;

export const DEFAULT_AUDIT_CONFIG: ResolvedAuditConfig = {
  ignoredRules: [],
  includedRules: [],
  ruleOverrides: {},
  severityWeights: DEFAULT_SEVERITY_WEIGHTS,
  thresholds: {},
};

export type AuditConfigIssueSeverity = 'warning' | 'error';

export type AuditConfigIssueCode =
  | 'invalid_config_shape'
  | 'invalid_config_value'
  | 'malformed_json'
  | 'unreadable_config';

export interface AuditConfigIssue {
  readonly id: string;
  readonly code: AuditConfigIssueCode;
  readonly severity: AuditConfigIssueSeverity;
  readonly message: string;
  readonly path: string;
}

export interface AuditConfigLoadResult {
  readonly config: ResolvedAuditConfig;
  readonly issues: readonly AuditConfigIssue[];
  readonly sourcePath: string;
}

export interface LoadAuditConfigOptions {
  readonly rootPath: string;
  readonly configPath?: string;
  readonly maxBytes?: number;
}

export interface SherpaJsonConfig {
  readonly audit?: SherpaJsonAuditConfig;
}

export interface SherpaJsonAuditConfig extends AuditConfig {
  readonly disabledRules?: readonly string[];
  readonly severityOverrides?: Readonly<Record<string, ViolationSeverity>>;
}

export async function loadAuditConfig(
  options: LoadAuditConfigOptions,
): Promise<AuditConfigLoadResult> {
  const sourcePath = resolveConfigPath(options.rootPath, options.configPath);
  const readResult = await safeReadFile(sourcePath, {
    maxBytes: options.maxBytes ?? DEFAULT_CONFIG_MAX_BYTES,
  });

  if (!readResult.ok) {
    if (readResult.error.code === 'not_found') {
      return { config: DEFAULT_AUDIT_CONFIG, issues: [], sourcePath };
    }

    return {
      config: DEFAULT_AUDIT_CONFIG,
      issues: [
        makeConfigIssue(
          'unreadable_config',
          'warning',
          `Could not read ${SHERPA_CONFIG_FILE_NAME}: ${readResult.error.message}`,
          sourcePath,
        ),
      ],
      sourcePath,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readResult.content);
  } catch (error) {
    return {
      config: DEFAULT_AUDIT_CONFIG,
      issues: [
        makeConfigIssue(
          'malformed_json',
          'error',
          `Malformed ${SHERPA_CONFIG_FILE_NAME}: ${describeError(error)}`,
          sourcePath,
        ),
      ],
      sourcePath,
    };
  }

  const parsedConfig = parseSherpaJsonConfig(parsed, sourcePath);

  return {
    config: resolveAuditConfig(parsedConfig.config),
    issues: parsedConfig.issues,
    sourcePath,
  };
}

export function resolveAuditConfig(config: SherpaJsonAuditConfig = {}): ResolvedAuditConfig {
  const disabledRules = uniqueStrings(config.disabledRules ?? []);
  const ignoredRules = uniqueStrings([...(config.ignoredRules ?? []), ...disabledRules]);
  const ruleOverrides = mergeRuleOverrides(
    config.ruleOverrides ?? {},
    disabledRules,
    config.severityOverrides ?? {},
  );
  const thresholds = mergeThresholds(config.thresholds ?? {});
  const severityWeights = {
    ...DEFAULT_SEVERITY_WEIGHTS,
    ...config.severityWeights,
  } satisfies Record<ViolationSeverity, number>;

  return {
    ...(config.failUnder !== undefined ? { failUnder: config.failUnder } : {}),
    ignoredRules,
    includedRules: uniqueStrings(config.includedRules ?? []),
    ruleOverrides,
    severityWeights,
    thresholds,
  };
}

function resolveConfigPath(rootPath: string, configPath: string | undefined): string {
  if (configPath !== undefined) {
    return normalizePath(resolve(rootPath, configPath));
  }

  return normalizePath(resolve(rootPath, SHERPA_CONFIG_FILE_NAME));
}

function parseSherpaJsonConfig(
  value: unknown,
  sourcePath: string,
): { readonly config: SherpaJsonAuditConfig; readonly issues: readonly AuditConfigIssue[] } {
  const issues: AuditConfigIssue[] = [];

  if (!isRecord(value)) {
    issues.push(
      makeConfigIssue(
        'invalid_config_shape',
        'error',
        `${SHERPA_CONFIG_FILE_NAME} must contain a JSON object.`,
        sourcePath,
      ),
    );

    return { config: {}, issues };
  }

  const auditValue = value.audit === undefined ? value : value.audit;

  if (!isRecord(auditValue)) {
    issues.push(
      makeConfigIssue(
        'invalid_config_shape',
        'error',
        'audit config must be a JSON object.',
        sourcePath,
      ),
    );

    return { config: {}, issues };
  }

  return { config: parseAuditConfigObject(auditValue, sourcePath, issues), issues };
}

function parseAuditConfigObject(
  value: Readonly<Record<string, unknown>>,
  sourcePath: string,
  issues: AuditConfigIssue[],
): SherpaJsonAuditConfig {
  const config: MutableSherpaJsonAuditConfig = {};

  assignNumber(value, 'failUnder', sourcePath, issues, (next) => {
    config.failUnder = next;
  });
  assignStringArray(value, 'disabledRules', sourcePath, issues, (next) => {
    config.disabledRules = next;
  });
  assignStringArray(value, 'ignoredRules', sourcePath, issues, (next) => {
    config.ignoredRules = next;
  });
  assignStringArray(value, 'includedRules', sourcePath, issues, (next) => {
    config.includedRules = next;
  });

  if (value.severityOverrides !== undefined) {
    const severityOverrides = parseSeverityMap(
      value.severityOverrides,
      'severityOverrides',
      sourcePath,
      issues,
    );
    if (severityOverrides !== undefined) {
      config.severityOverrides = severityOverrides;
    }
  }

  if (value.severityWeights !== undefined) {
    const severityWeights = parseNumberMap(
      value.severityWeights,
      'severityWeights',
      sourcePath,
      issues,
      true,
    );
    if (severityWeights !== undefined) {
      config.severityWeights = severityWeights;
    }
  }

  if (value.thresholds !== undefined) {
    const thresholds = parseThresholds(value.thresholds, 'thresholds', sourcePath, issues);
    if (thresholds !== undefined) {
      config.thresholds = thresholds;
    }
  }

  if (value.ruleOverrides !== undefined) {
    const ruleOverrides = parseRuleOverrides(value.ruleOverrides, sourcePath, issues);
    if (ruleOverrides !== undefined) {
      config.ruleOverrides = ruleOverrides;
    }
  }

  return config;
}

interface MutableSherpaJsonAuditConfig {
  failUnder?: number;
  disabledRules?: string[];
  ignoredRules?: string[];
  includedRules?: string[];
  severityOverrides?: Record<string, ViolationSeverity>;
  severityWeights?: Partial<Record<ViolationSeverity, number>>;
  thresholds?: AuditThresholds;
  ruleOverrides?: Record<string, AuditRuleOverride>;
}

function parseRuleOverrides(
  value: unknown,
  sourcePath: string,
  issues: AuditConfigIssue[],
): Record<string, AuditRuleOverride> | undefined {
  if (!isRecord(value)) {
    issues.push(invalidValueIssue('ruleOverrides must be an object.', sourcePath));
    return undefined;
  }

  const overrides: Record<string, AuditRuleOverride> = {};

  for (const [ruleId, overrideValue] of Object.entries(value)) {
    if (!isRecord(overrideValue)) {
      issues.push(invalidValueIssue(`ruleOverrides.${ruleId} must be an object.`, sourcePath));
      continue;
    }

    const override: MutableAuditRuleOverride = {};

    if (overrideValue.enabled !== undefined) {
      if (typeof overrideValue.enabled !== 'boolean') {
        issues.push(
          invalidValueIssue(`ruleOverrides.${ruleId}.enabled must be a boolean.`, sourcePath),
        );
      } else {
        override.enabled = overrideValue.enabled;
      }
    }

    if (overrideValue.severity !== undefined) {
      if (!isSeverity(overrideValue.severity)) {
        issues.push(
          invalidValueIssue(
            `ruleOverrides.${ruleId}.severity must be error, warning, or info.`,
            sourcePath,
          ),
        );
      } else {
        override.severity = overrideValue.severity;
      }
    }

    if (overrideValue.thresholds !== undefined) {
      const thresholds = parseNumberMap(
        overrideValue.thresholds,
        `ruleOverrides.${ruleId}.thresholds`,
        sourcePath,
        issues,
        false,
      );
      if (thresholds !== undefined) {
        override.thresholds = thresholds;
      }
    }

    overrides[ruleId] = override;
  }

  return overrides;
}

interface MutableAuditRuleOverride {
  enabled?: boolean;
  severity?: ViolationSeverity;
  thresholds?: Record<string, number>;
}

function parseThresholds(
  value: unknown,
  path: string,
  sourcePath: string,
  issues: AuditConfigIssue[],
): AuditThresholds | undefined {
  if (!isRecord(value)) {
    issues.push(invalidValueIssue(`${path} must be an object.`, sourcePath));
    return undefined;
  }

  const thresholds: MutableAuditThresholds = {};

  assignNumber(
    value,
    'minimumScore',
    sourcePath,
    issues,
    (next) => {
      thresholds.minimumScore = next;
    },
    path,
  );
  assignNumber(
    value,
    'maxFileTokens',
    sourcePath,
    issues,
    (next) => {
      thresholds.maxFileTokens = next;
    },
    path,
  );
  assignNumber(
    value,
    'maxTotalTokens',
    sourcePath,
    issues,
    (next) => {
      thresholds.maxTotalTokens = next;
    },
    path,
  );

  if (value.maxViolationsBySeverity !== undefined) {
    const maxViolationsBySeverity = parseNumberMap(
      value.maxViolationsBySeverity,
      `${path}.maxViolationsBySeverity`,
      sourcePath,
      issues,
      true,
    );
    if (maxViolationsBySeverity !== undefined) {
      thresholds.maxViolationsBySeverity = maxViolationsBySeverity;
    }
  }

  return thresholds;
}

interface MutableAuditThresholds {
  minimumScore?: number;
  maxFileTokens?: number;
  maxTotalTokens?: number;
  maxViolationsBySeverity?: Partial<Record<ViolationSeverity, number>>;
}

function parseSeverityMap(
  value: unknown,
  path: string,
  sourcePath: string,
  issues: AuditConfigIssue[],
): Record<string, ViolationSeverity> | undefined {
  if (!isRecord(value)) {
    issues.push(invalidValueIssue(`${path} must be an object.`, sourcePath));
    return undefined;
  }

  const map: Record<string, ViolationSeverity> = {};

  for (const [key, severity] of Object.entries(value)) {
    if (!isSeverity(severity)) {
      issues.push(invalidValueIssue(`${path}.${key} must be error, warning, or info.`, sourcePath));
      continue;
    }

    map[key] = severity;
  }

  return map;
}

function parseNumberMap(
  value: unknown,
  path: string,
  sourcePath: string,
  issues: AuditConfigIssue[],
  restrictToSeverityKeys: true,
): Partial<Record<ViolationSeverity, number>> | undefined;

function parseNumberMap(
  value: unknown,
  path: string,
  sourcePath: string,
  issues: AuditConfigIssue[],
  restrictToSeverityKeys: false,
): Record<string, number> | undefined;

function parseNumberMap(
  value: unknown,
  path: string,
  sourcePath: string,
  issues: AuditConfigIssue[],
  restrictToSeverityKeys: boolean,
): Record<string, number> | Partial<Record<ViolationSeverity, number>> | undefined {
  if (!isRecord(value)) {
    issues.push(invalidValueIssue(`${path} must be an object.`, sourcePath));
    return undefined;
  }

  const map: Record<string, number> = {};

  for (const [key, next] of Object.entries(value)) {
    if (restrictToSeverityKeys && !isSeverity(key)) {
      issues.push(
        invalidValueIssue(`${path}.${key} must use error, warning, or info.`, sourcePath),
      );
      continue;
    }

    if (!isFiniteNumber(next)) {
      issues.push(invalidValueIssue(`${path}.${key} must be a finite number.`, sourcePath));
      continue;
    }

    map[key] = next;
  }

  return map;
}

function assignStringArray(
  value: Readonly<Record<string, unknown>>,
  key: string,
  sourcePath: string,
  issues: AuditConfigIssue[],
  assign: (value: string[]) => void,
): void {
  const next = value[key];

  if (next === undefined) {
    return;
  }

  if (!Array.isArray(next) || !next.every((item) => typeof item === 'string')) {
    issues.push(invalidValueIssue(`${key} must be an array of strings.`, sourcePath));
    return;
  }

  assign(next);
}

function assignNumber(
  value: Readonly<Record<string, unknown>>,
  key: string,
  sourcePath: string,
  issues: AuditConfigIssue[],
  assign: (value: number) => void,
  prefix?: string,
): void {
  const next = value[key];
  const propertyPath = prefix === undefined ? key : `${prefix}.${key}`;

  if (next === undefined) {
    return;
  }

  if (!isFiniteNumber(next)) {
    issues.push(invalidValueIssue(`${propertyPath} must be a finite number.`, sourcePath));
    return;
  }

  assign(next);
}

function mergeRuleOverrides(
  explicit: Readonly<Record<string, AuditRuleOverride>>,
  disabledRules: readonly string[],
  severityOverrides: Readonly<Record<string, ViolationSeverity>>,
): Readonly<Record<string, AuditRuleOverride>> {
  const merged: Record<string, AuditRuleOverride> = { ...explicit };

  for (const ruleId of disabledRules) {
    const existing = merged[ruleId] ?? {};
    merged[ruleId] = { ...existing, enabled: false };
  }

  for (const [ruleId, severity] of Object.entries(severityOverrides)) {
    const existing = merged[ruleId] ?? {};
    merged[ruleId] = { ...existing, severity };
  }

  return merged;
}

function mergeThresholds(thresholds: AuditThresholds): AuditThresholds {
  return {
    ...(thresholds.minimumScore !== undefined ? { minimumScore: thresholds.minimumScore } : {}),
    ...(thresholds.maxFileTokens !== undefined ? { maxFileTokens: thresholds.maxFileTokens } : {}),
    ...(thresholds.maxTotalTokens !== undefined
      ? { maxTotalTokens: thresholds.maxTotalTokens }
      : {}),
    ...(thresholds.maxViolationsBySeverity !== undefined
      ? { maxViolationsBySeverity: thresholds.maxViolationsBySeverity }
      : {}),
  };
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return Array.from(new Set(values)).sort();
}

function invalidValueIssue(message: string, sourcePath: string): AuditConfigIssue {
  return makeConfigIssue('invalid_config_value', 'warning', message, sourcePath);
}

function makeConfigIssue(
  code: AuditConfigIssueCode,
  severity: AuditConfigIssueSeverity,
  message: string,
  path: string,
): AuditConfigIssue {
  return {
    id: deterministicId({ kind: 'audit-config-issue', code, severity, message, path }),
    code,
    severity,
    message,
    path,
  };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSeverity(value: unknown): value is ViolationSeverity {
  return value === 'error' || value === 'warning' || value === 'info';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
