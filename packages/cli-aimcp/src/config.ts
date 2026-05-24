import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';

import type { LintConfig, LintRuleOverride, LintRuleSeverity } from '@sherpa-labs/core-mcp';

import { configError } from './errors.js';

export const CONFIG_FILE_NAME = '.aimcp-lint.json';
export const outputFormats = ['terminal', 'json', 'markdown'] as const;

export type OutputFormat = (typeof outputFormats)[number];

export interface CommonFlagInput {
  readonly format?: OutputFormat;
  readonly failUnder?: number;
  readonly ignore?: readonly string[];
  readonly only?: readonly string[];
  readonly config?: string;
  readonly verbose?: boolean;
  readonly quiet?: boolean;
  readonly detailed?: boolean;
}

export interface AimcpLintConfigFile {
  readonly command?: string | readonly string[];
  readonly format?: OutputFormat;
  readonly failUnder?: number;
  readonly ignore?: readonly string[];
  readonly only?: readonly string[];
  readonly ignoredRules?: readonly string[];
  readonly includedRules?: readonly string[];
  readonly severityOverrides?: Readonly<Record<string, LintRuleSeverity>>;
  readonly ruleOverrides?: Readonly<Record<string, LintRuleOverride>>;
  readonly thresholds?: Readonly<Record<string, number>>;
  readonly severityWeights?: Readonly<Partial<Record<LintRuleSeverity, number>>>;
  readonly watch?: readonly string[] | AimcpLintWatchConfig;
  readonly detailed?: boolean;
  readonly quiet?: boolean;
  readonly verbose?: boolean;
}

export interface AimcpLintWatchConfig {
  readonly paths?: readonly string[];
}

export interface LoadedCliConfig {
  readonly config: AimcpLintConfigFile;
  readonly sourcePath: string;
  readonly exists: boolean;
}

export interface ResolvedCliConfig {
  readonly format: OutputFormat;
  readonly failUnder?: number;
  readonly ignoredRules: readonly string[];
  readonly includedRules: readonly string[];
  readonly watchPaths: readonly string[];
  readonly configPath: string;
  readonly configExists: boolean;
  readonly verbose: boolean;
  readonly quiet: boolean;
  readonly detailed: boolean;
  readonly lintConfig: LintConfig;
  readonly commandTokens?: readonly string[];
}

export const DEFAULT_INIT_CONFIG = {
  command: 'node ./server.mjs',
  format: 'terminal',
  failUnder: 80,
  ignore: [],
  only: [],
  severityOverrides: {},
  ruleOverrides: {},
  thresholds: {},
  severityWeights: {},
  watch: {
    paths: ['.'],
  },
  detailed: false,
  quiet: false,
  verbose: false,
} as const satisfies AimcpLintConfigFile;

export function isOutputFormat(value: string): value is OutputFormat {
  return outputFormats.includes(value as OutputFormat);
}

export function createInitialConfigContent(): string {
  return `${JSON.stringify(DEFAULT_INIT_CONFIG, null, 2)}\n`;
}

export async function resolveCliConfig(input: {
  readonly cwd: string;
  readonly options: CommonFlagInput;
}): Promise<ResolvedCliConfig> {
  const loaded = await loadCliConfig({
    cwd: input.cwd,
    ...(input.options.config !== undefined ? { configPath: input.options.config } : {}),
  });
  const config = loaded.config;
  const format = input.options.format ?? config.format ?? 'terminal';
  const failUnder = input.options.failUnder ?? config.failUnder;
  const ignoredRules = uniqueStrings(
    input.options.ignore ??
      (input.options.only !== undefined
        ? []
        : [...(config.ignore ?? []), ...(config.ignoredRules ?? [])]),
  );
  const includedRules = uniqueStrings(
    input.options.only ?? [...(config.only ?? []), ...(config.includedRules ?? [])],
  );
  const quiet = input.options.quiet === true || config.quiet === true;
  const verbose = quiet ? false : input.options.verbose === true || config.verbose === true;
  const detailed = input.options.detailed ?? config.detailed ?? false;
  const commandTokens = resolveConfigCommand(config);

  const lintConfigInput: Record<string, unknown> = {
    ignoredRules,
    includedRules,
  };

  if (failUnder !== undefined) lintConfigInput.failUnder = failUnder;
  if (config.severityOverrides !== undefined)
    lintConfigInput.severityOverrides = config.severityOverrides;
  if (config.ruleOverrides !== undefined) lintConfigInput.ruleOverrides = config.ruleOverrides;
  if (config.thresholds !== undefined) lintConfigInput.thresholds = config.thresholds;
  if (config.severityWeights !== undefined)
    lintConfigInput.severityWeights = config.severityWeights;

  const lintConfig = createLintConfig(lintConfigInput as Parameters<typeof createLintConfig>[0]);
  const resolved: MutableResolvedCliConfig = {
    format,
    ignoredRules,
    includedRules,
    watchPaths: parseWatchPaths(config.watch),
    configPath: loaded.sourcePath,
    configExists: loaded.exists,
    verbose,
    quiet,
    detailed,
    lintConfig,
    ...(commandTokens !== undefined ? { commandTokens } : {}),
  };

  if (failUnder !== undefined) {
    resolved.failUnder = failUnder;
  }

  return resolved;
}

export async function loadCliConfig(input: {
  readonly cwd: string;
  readonly configPath?: string;
}): Promise<LoadedCliConfig> {
  if (input.configPath !== undefined) {
    const sourcePath = resolveConfigPath(input.cwd, input.configPath);

    let content: string;
    try {
      content = await readFile(sourcePath, 'utf8');
    } catch (error) {
      if (isNodeErrorCode(error, 'ENOENT')) {
        throw configError(`Config file not found: ${sourcePath}`);
      }

      throw configError(`Could not read config file ${sourcePath}: ${describeUnknown(error)}`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      throw configError(`Malformed ${CONFIG_FILE_NAME}: ${describeUnknown(error)}`);
    }

    return { config: parseConfigObject(parsed, sourcePath), sourcePath, exists: true };
  }

  let current = resolve(input.cwd);
  const root = resolve('/');
  const candidates: string[] = [];

  for (;;) {
    const candidate = resolve(current, CONFIG_FILE_NAME);
    candidates.push(candidate);

    try {
      const content = await readFile(candidate, 'utf8');
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch (error) {
        throw configError(`Malformed ${candidate}: ${describeUnknown(error)}`);
      }

      return { config: parseConfigObject(parsed, candidate), sourcePath: candidate, exists: true };
    } catch (error) {
      if (isNodeErrorCode(error, 'ENOENT')) {
        if (current === root || current === '/') {
          return { config: {}, sourcePath: candidates[0]!, exists: false };
        }

        current = dirname(current);
        continue;
      }

      throw error;
    }
  }
}

export function resolveConfigPath(cwd: string, configPath: string | undefined): string {
  if (configPath !== undefined) {
    return isAbsolute(configPath) ? configPath : resolve(cwd, configPath);
  }

  return resolve(cwd, CONFIG_FILE_NAME);
}

interface MutableResolvedCliConfig {
  format: OutputFormat;
  failUnder?: number;
  ignoredRules: readonly string[];
  includedRules: readonly string[];
  watchPaths: readonly string[];
  configPath: string;
  configExists: boolean;
  verbose: boolean;
  quiet: boolean;
  detailed: boolean;
  lintConfig: LintConfig;
  commandTokens?: readonly string[];
}

function createLintConfig(input: {
  readonly failUnder?: number;
  readonly ignoredRules: readonly string[];
  readonly includedRules: readonly string[];
  readonly severityOverrides?: Readonly<Record<string, LintRuleSeverity>>;
  readonly ruleOverrides?: Readonly<Record<string, LintRuleOverride>>;
  readonly thresholds?: Readonly<Record<string, number>>;
  readonly severityWeights?: Readonly<Partial<Record<LintRuleSeverity, number>>>;
}): LintConfig {
  const lintConfig: MutableLintConfig = {
    ignoredRules: input.ignoredRules,
    includedRules: input.includedRules,
  };

  if (input.failUnder !== undefined) {
    lintConfig.failUnder = input.failUnder;
  }

  if (input.severityOverrides !== undefined) {
    lintConfig.severityOverrides = input.severityOverrides;
  }

  if (input.ruleOverrides !== undefined) {
    lintConfig.ruleOverrides = input.ruleOverrides;
  }

  if (input.thresholds !== undefined) {
    lintConfig.thresholds = input.thresholds;
  }

  if (input.severityWeights !== undefined) {
    lintConfig.severityWeights = input.severityWeights;
  }

  return lintConfig;
}

interface MutableLintConfig {
  failUnder?: number;
  ignoredRules: readonly string[];
  includedRules: readonly string[];
  severityOverrides?: Readonly<Record<string, LintRuleSeverity>>;
  ruleOverrides?: Readonly<Record<string, LintRuleOverride>>;
  thresholds?: Readonly<Record<string, number>>;
  severityWeights?: Readonly<Partial<Record<LintRuleSeverity, number>>>;
}

function parseConfigObject(value: unknown, sourcePath: string): AimcpLintConfigFile {
  if (!isRecord(value)) {
    throw configError(`${sourcePath} must contain a JSON object.`);
  }

  const config: MutableAimcpLintConfigFile = {};

  if (value.command !== undefined) {
    config.command = parseConfigCommand(value.command, sourcePath);
  }

  if (value.format !== undefined) {
    if (typeof value.format !== 'string' || !isOutputFormat(value.format)) {
      throw configError(`${sourcePath}: format must be terminal, json, or markdown.`);
    }

    config.format = value.format;
  }

  assignNumber(value, 'failUnder', sourcePath, (next) => {
    config.failUnder = next;
  });
  assignStringArray(value, 'ignore', sourcePath, (next) => {
    config.ignore = next;
  });
  assignStringArray(value, 'only', sourcePath, (next) => {
    config.only = next;
  });
  assignStringArray(value, 'ignoredRules', sourcePath, (next) => {
    config.ignoredRules = next;
  });
  assignStringArray(value, 'includedRules', sourcePath, (next) => {
    config.includedRules = next;
  });

  if (value.severityOverrides !== undefined) {
    config.severityOverrides = parseSeverityOverrides(value.severityOverrides, sourcePath);
  }

  if (value.ruleOverrides !== undefined) {
    config.ruleOverrides = parseRuleOverrides(value.ruleOverrides, sourcePath);
  }

  if (value.thresholds !== undefined) {
    config.thresholds = parseThresholds(value.thresholds, sourcePath);
  }

  if (value.severityWeights !== undefined) {
    config.severityWeights = parseSeverityWeights(value.severityWeights, sourcePath);
  }

  if (value.watch !== undefined) {
    config.watch = parseWatchConfig(value.watch, sourcePath);
  }

  if (value.detailed !== undefined) {
    if (typeof value.detailed !== 'boolean') {
      throw configError(`${sourcePath}: detailed must be a boolean.`);
    }
    config.detailed = value.detailed;
  }

  if (value.quiet !== undefined) {
    if (typeof value.quiet !== 'boolean') {
      throw configError(`${sourcePath}: quiet must be a boolean.`);
    }
    config.quiet = value.quiet;
  }

  if (value.verbose !== undefined) {
    if (typeof value.verbose !== 'boolean') {
      throw configError(`${sourcePath}: verbose must be a boolean.`);
    }
    config.verbose = value.verbose;
  }

  return config;
}

interface MutableAimcpLintConfigFile {
  command?: string | readonly string[];
  format?: OutputFormat;
  failUnder?: number;
  ignore?: readonly string[];
  only?: readonly string[];
  ignoredRules?: readonly string[];
  includedRules?: readonly string[];
  severityOverrides?: Readonly<Record<string, LintRuleSeverity>>;
  ruleOverrides?: Readonly<Record<string, LintRuleOverride>>;
  thresholds?: Readonly<Record<string, number>>;
  severityWeights?: Readonly<Partial<Record<LintRuleSeverity, number>>>;
  watch?: readonly string[] | AimcpLintWatchConfig;
  detailed?: boolean;
  quiet?: boolean;
  verbose?: boolean;
}

function parseConfigCommand(value: unknown, sourcePath: string): string | readonly string[] {
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim();
  }

  if (isStringArray(value) && value.length > 0) {
    return value;
  }

  throw configError(
    `${sourcePath}: command must be a non-empty string or a non-empty array of strings.`,
  );
}

function parseSeverityOverrides(
  value: unknown,
  sourcePath: string,
): Readonly<Record<string, LintRuleSeverity>> {
  if (!isRecord(value)) {
    throw configError(
      `${sourcePath}: severityOverrides must be an object mapping rule IDs to error, warning, or info.`,
    );
  }

  const validSeverities = new Set<LintRuleSeverity>(['error', 'warning', 'info']);

  for (const [ruleId, severity] of Object.entries(value)) {
    if (!validSeverities.has(severity as LintRuleSeverity)) {
      throw configError(
        `${sourcePath}: severityOverrides.${ruleId} must be error, warning, or info.`,
      );
    }
  }

  return value as Readonly<Record<string, LintRuleSeverity>>;
}

function parseRuleOverrides(
  value: unknown,
  sourcePath: string,
): Readonly<Record<string, LintRuleOverride>> {
  if (!isRecord(value)) {
    throw configError(`${sourcePath}: ruleOverrides must be an object.`);
  }

  for (const [ruleId, override] of Object.entries(value)) {
    if (!isRecord(override)) {
      throw configError(`${sourcePath}: ruleOverrides.${ruleId} must be an object.`);
    }

    if (override.enabled !== undefined && typeof override.enabled !== 'boolean') {
      throw configError(`${sourcePath}: ruleOverrides.${ruleId}.enabled must be a boolean.`);
    }

    if (override.severity !== undefined) {
      const validSeverities = new Set<string>(['error', 'warning', 'info']);
      if (!validSeverities.has(override.severity as string)) {
        throw configError(
          `${sourcePath}: ruleOverrides.${ruleId}.severity must be error, warning, or info.`,
        );
      }
    }

    if (override.thresholds !== undefined) {
      if (!isRecord(override.thresholds)) {
        throw configError(
          `${sourcePath}: ruleOverrides.${ruleId}.thresholds must be an object of numbers.`,
        );
      }

      for (const [thresholdKey, thresholdValue] of Object.entries(override.thresholds)) {
        if (
          typeof thresholdValue !== 'number' ||
          !Number.isFinite(thresholdValue) ||
          thresholdValue < 0
        ) {
          throw configError(
            `${sourcePath}: ruleOverrides.${ruleId}.thresholds.${thresholdKey} must be a non-negative finite number.`,
          );
        }
      }
    }
  }

  return value as Readonly<Record<string, LintRuleOverride>>;
}

function parseThresholds(value: unknown, sourcePath: string): Readonly<Record<string, number>> {
  if (!isRecord(value)) {
    throw configError(`${sourcePath}: thresholds must be an object of numbers.`);
  }

  for (const [key, thresholdValue] of Object.entries(value)) {
    if (
      typeof thresholdValue !== 'number' ||
      !Number.isFinite(thresholdValue) ||
      thresholdValue < 0
    ) {
      throw configError(`${sourcePath}: thresholds.${key} must be a non-negative finite number.`);
    }
  }

  return value as Readonly<Record<string, number>>;
}

const VALID_SEVERITIES: ReadonlySet<string> = new Set(['error', 'warning', 'info']);

function parseSeverityWeights(
  value: unknown,
  sourcePath: string,
): Readonly<Partial<Record<LintRuleSeverity, number>>> {
  if (!isRecord(value)) {
    throw configError(
      `${sourcePath}: severityWeights must be an object with optional error, warning, and info keys.`,
    );
  }

  for (const [key, weight] of Object.entries(value)) {
    if (!VALID_SEVERITIES.has(key)) {
      throw configError(
        `${sourcePath}: severityWeights.${key} is not a valid key; expected error, warning, or info.`,
      );
    }

    if (typeof weight !== 'number' || !Number.isFinite(weight)) {
      throw configError(`${sourcePath}: severityWeights.${key} must be a finite number.`);
    }
  }

  return value;
}

function resolveConfigCommand(config: AimcpLintConfigFile): readonly string[] | undefined {
  if (config.command === undefined) {
    return undefined;
  }

  if (typeof config.command === 'string') {
    return config.command.split(/\s+/u);
  }

  return config.command;
}

function parseWatchConfig(
  value: unknown,
  sourcePath: string,
): readonly string[] | AimcpLintWatchConfig {
  if (Array.isArray(value)) {
    return parseStringArrayValue(value, `${sourcePath}: watch`);
  }

  if (!isRecord(value)) {
    throw configError(`${sourcePath}: watch must be an object or an array of paths.`);
  }

  if (value.paths === undefined) {
    return {};
  }

  return { paths: parseStringArrayValue(value.paths, `${sourcePath}: watch.paths`) };
}

function parseWatchPaths(value: AimcpLintConfigFile['watch']): readonly string[] {
  if (value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return uniqueStrings(value);
  }

  return uniqueStrings(isWatchConfigObject(value) ? (value.paths ?? []) : []);
}

function isWatchConfigObject(
  value: NonNullable<AimcpLintConfigFile['watch']>,
): value is AimcpLintWatchConfig {
  return !Array.isArray(value);
}

function assignNumber(
  value: Readonly<Record<string, unknown>>,
  key: string,
  sourcePath: string,
  assign: (next: number) => void,
): void {
  const candidate = value[key];

  if (candidate === undefined) {
    return;
  }

  if (typeof candidate !== 'number' || !Number.isFinite(candidate) || candidate < 0) {
    throw configError(`${sourcePath}: ${key} must be a non-negative finite number.`);
  }

  assign(candidate);
}

function assignStringArray(
  value: Readonly<Record<string, unknown>>,
  key: string,
  sourcePath: string,
  assign: (next: readonly string[]) => void,
): void {
  const candidate = value[key];

  if (candidate === undefined) {
    return;
  }

  assign(parseStringArrayValue(candidate, `${sourcePath}: ${key}`));
}

function parseStringArrayValue(value: unknown, label: string): readonly string[] {
  if (!isStringArray(value)) {
    throw configError(`${label} must be an array of strings.`);
  }

  return value.map((item) => item);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return Array.from(new Set(values.filter((value) => value.trim() !== '')));
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNodeErrorCode(error: unknown, code: string): boolean {
  return isRecord(error) && error.code === code;
}

function describeUnknown(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
