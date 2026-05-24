import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';

import type { LintConfig } from '@sherpa-labs/core-mcp';

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
  readonly format?: OutputFormat;
  readonly failUnder?: number;
  readonly ignore?: readonly string[];
  readonly only?: readonly string[];
  readonly ignoredRules?: readonly string[];
  readonly includedRules?: readonly string[];
  readonly watch?: readonly string[] | AimcpLintWatchConfig;
  readonly detailed?: boolean;
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
}

export const DEFAULT_INIT_CONFIG = {
  format: 'terminal',
  failUnder: 80,
  ignore: [],
  only: [],
  watch: {
    paths: ['.'],
  },
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
  const quiet = input.options.quiet === true;
  const detailed = input.options.detailed ?? config.detailed ?? false;
  const lintConfig = createLintConfig({
    ...(failUnder !== undefined ? { failUnder } : {}),
    ignoredRules,
    includedRules,
  });
  const resolved: MutableResolvedCliConfig = {
    format,
    ignoredRules,
    includedRules,
    watchPaths: parseWatchPaths(config.watch),
    configPath: loaded.sourcePath,
    configExists: loaded.exists,
    verbose: quiet ? false : input.options.verbose === true,
    quiet,
    detailed,
    lintConfig,
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
  const sourcePath = resolveConfigPath(input.cwd, input.configPath);

  let content: string;
  try {
    content = await readFile(sourcePath, 'utf8');
  } catch (error) {
    if (isNodeErrorCode(error, 'ENOENT') && input.configPath === undefined) {
      return { config: {}, sourcePath, exists: false };
    }

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

export function resolveConfigPath(cwd: string, configPath: string | undefined): string {
  if (configPath === undefined) {
    return resolve(cwd, CONFIG_FILE_NAME);
  }

  return isAbsolute(configPath) ? configPath : resolve(cwd, configPath);
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
}

function createLintConfig(input: {
  readonly failUnder?: number;
  readonly ignoredRules: readonly string[];
  readonly includedRules: readonly string[];
}): LintConfig {
  const lintConfig: MutableLintConfig = {
    ignoredRules: input.ignoredRules,
    includedRules: input.includedRules,
  };

  if (input.failUnder !== undefined) {
    lintConfig.failUnder = input.failUnder;
  }

  return lintConfig;
}

interface MutableLintConfig {
  failUnder?: number;
  ignoredRules: readonly string[];
  includedRules: readonly string[];
}

function parseConfigObject(value: unknown, sourcePath: string): AimcpLintConfigFile {
  if (!isRecord(value)) {
    throw configError(`${sourcePath} must contain a JSON object.`);
  }

  const config: MutableAimcpLintConfigFile = {};

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

  if (value.watch !== undefined) {
    config.watch = parseWatchConfig(value.watch, sourcePath);
  }

  if (value.detailed !== undefined) {
    if (typeof value.detailed !== 'boolean') {
      throw configError(`${sourcePath}: detailed must be a boolean.`);
    }
    config.detailed = value.detailed;
  }

  return config;
}

interface MutableAimcpLintConfigFile {
  format?: OutputFormat;
  failUnder?: number;
  ignore?: readonly string[];
  only?: readonly string[];
  ignoredRules?: readonly string[];
  includedRules?: readonly string[];
  watch?: readonly string[] | AimcpLintWatchConfig;
  detailed?: boolean;
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
