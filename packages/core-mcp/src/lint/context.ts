import type { JsonObject, JsonValue } from '@sherpa-labs/shared-types';

import type { McpInitializeResult, McpListToolsResult, ProtocolLogEntry } from '../client/index.js';
import { DEFAULT_LINT_SEVERITY_WEIGHTS } from './scoring.js';
import type {
  LintConfig,
  LintContext,
  LintErrorObservation,
  LintInitializeObservation,
  LintMessageDirection,
  LintMetadata,
  LintProtocolMessage,
  LintRuleOverride,
  LintRuleSeverity,
  LintThresholds,
  LintTimings,
  LintTransportChannel,
  LintToolObservation,
  ResolvedLintConfig,
} from './types.js';

export const DEFAULT_LINT_CONFIG: ResolvedLintConfig = {
  ignoredRules: [],
  includedRules: [],
  ruleOverrides: {},
  severityWeights: DEFAULT_LINT_SEVERITY_WEIGHTS,
  thresholds: {},
};

export interface BuildLintContextInput {
  readonly transport: LintContext['transport'];
  readonly protocolVersion?: string;
  readonly initialize?: LintInitializeObservation;
  readonly initializeResult?: JsonValue;
  readonly capabilities?: JsonObject;
  readonly serverInfo?: JsonObject;
  readonly tools?: readonly LintToolObservation[];
  readonly resources?: LintContext['resources'];
  readonly prompts?: LintContext['prompts'];
  readonly messages?: readonly LintProtocolMessage[];
  readonly timings?: LintTimings;
  readonly errors?: readonly LintErrorObservation[];
  readonly metadata?: LintMetadata;
  readonly config?: LintConfig | ResolvedLintConfig;
}

export interface BuildLintContextFromClientObservationsInput extends Omit<
  BuildLintContextInput,
  'initializeResult' | 'tools' | 'messages'
> {
  readonly initializeResult?: McpInitializeResult;
  readonly toolsResult?: McpListToolsResult;
  readonly protocolMessages?: readonly ProtocolLogEntry[];
  readonly messages?: readonly LintProtocolMessage[];
}

export function buildLintContext(input: BuildLintContextInput): LintContext {
  const config = resolveLintConfig(input.config ?? DEFAULT_LINT_CONFIG);
  const initializeResult = input.initializeResult ?? input.initialize?.result;
  const protocolVersion =
    input.protocolVersion ?? getStringProperty(initializeResult, 'protocolVersion');
  const capabilities =
    input.capabilities ?? getJsonObjectProperty(initializeResult, 'capabilities') ?? {};
  const serverInfo = input.serverInfo ?? getJsonObjectProperty(initializeResult, 'serverInfo');
  const initialize = normalizeInitialize(input.initialize, initializeResult);
  const context: MutableLintContext = {
    transport: input.transport,
    capabilities,
    tools: input.tools ?? [],
    resources: input.resources ?? [],
    prompts: input.prompts ?? [],
    messages: input.messages ?? [],
    timings: input.timings ?? {},
    errors: input.errors ?? [],
    metadata: input.metadata ?? {},
    config,
    thresholds: config.thresholds,
  };

  if (protocolVersion !== undefined) {
    context.protocolVersion = protocolVersion;
  }

  if (serverInfo !== undefined) {
    context.serverInfo = serverInfo;
  }

  if (initialize !== undefined) {
    context.initialize = initialize;
  }

  return context;
}

export function createLintContext(input: BuildLintContextInput): LintContext {
  return buildLintContext(input);
}

export function buildLintContextFromClientObservations(
  input: BuildLintContextFromClientObservationsInput,
): LintContext {
  const convertedMessages = (input.protocolMessages ?? []).map(protocolLogEntryToLintMessage);
  const tools = input.toolsResult?.tools.map((tool) => ({
    name: tool.name,
    ...(tool.description !== undefined ? { description: tool.description } : {}),
    ...(tool.inputSchema !== undefined ? { inputSchema: tool.inputSchema } : {}),
    ...(tool.outputSchema !== undefined ? { outputSchema: tool.outputSchema } : {}),
  }));

  return buildLintContext({
    ...input,
    ...(input.initializeResult !== undefined ? { initializeResult: input.initializeResult } : {}),
    ...(tools !== undefined ? { tools } : {}),
    messages: [...(input.messages ?? []), ...convertedMessages],
  });
}

export function withLintConfig(
  context: LintContext,
  config: LintConfig | ResolvedLintConfig,
): LintContext {
  const resolvedConfig = resolveLintConfig(config);

  return {
    ...context,
    config: resolvedConfig,
    thresholds: resolvedConfig.thresholds,
  };
}

export function resolveLintConfig(
  config: LintConfig | ResolvedLintConfig = {},
): ResolvedLintConfig {
  const ignoredRules = uniqueStrings(config.ignoredRules ?? []);
  const includedRules = uniqueStrings(config.includedRules ?? []);
  const severityOverrides = 'severityOverrides' in config ? (config.severityOverrides ?? {}) : {};
  const ruleOverrides = mergeRuleOverrides(config.ruleOverrides ?? {}, severityOverrides);
  const severityWeights = {
    ...DEFAULT_LINT_SEVERITY_WEIGHTS,
    ...config.severityWeights,
  } satisfies Record<LintRuleSeverity, number>;
  const resolved: MutableResolvedLintConfig = {
    ignoredRules,
    includedRules,
    ruleOverrides,
    severityWeights,
    thresholds: normalizeThresholds(config.thresholds ?? {}),
  };

  if (config.failUnder !== undefined) {
    resolved.failUnder = config.failUnder;
  }

  return resolved;
}

interface MutableLintContext {
  transport: LintContext['transport'];
  protocolVersion?: string;
  initialize?: LintInitializeObservation;
  capabilities: JsonObject;
  serverInfo?: JsonObject;
  tools: readonly LintToolObservation[];
  resources: LintContext['resources'];
  prompts: LintContext['prompts'];
  messages: readonly LintProtocolMessage[];
  timings: LintTimings;
  errors: readonly LintErrorObservation[];
  metadata: LintMetadata;
  config: ResolvedLintConfig;
  thresholds: LintThresholds;
}

interface MutableResolvedLintConfig {
  failUnder?: number;
  ignoredRules: readonly string[];
  includedRules: readonly string[];
  ruleOverrides: Readonly<Record<string, LintRuleOverride>>;
  severityWeights: Readonly<Record<LintRuleSeverity, number>>;
  thresholds: LintThresholds;
}

function normalizeInitialize(
  input: LintInitializeObservation | undefined,
  result: JsonValue | undefined,
): LintInitializeObservation | undefined {
  if (input === undefined && result === undefined) {
    return undefined;
  }

  const initialize: MutableInitialize = {};

  if (input?.request !== undefined) {
    initialize.request = input.request;
  }

  if (input?.response !== undefined) {
    initialize.response = input.response;
  }

  if (result !== undefined) {
    initialize.result = result;
  }

  if (input?.error !== undefined) {
    initialize.error = input.error;
  }

  if (input?.completed !== undefined) {
    initialize.completed = input.completed;
  } else if (result !== undefined) {
    initialize.completed = true;
  }

  if (input?.initializedNotificationSent !== undefined) {
    initialize.initializedNotificationSent = input.initializedNotificationSent;
  }

  return initialize;
}

interface MutableInitialize {
  request?: JsonValue;
  response?: JsonValue;
  result?: JsonValue;
  error?: LintErrorObservation;
  completed?: boolean;
  initializedNotificationSent?: boolean;
}

function protocolLogEntryToLintMessage(entry: ProtocolLogEntry): LintProtocolMessage {
  const message: MutableProtocolMessage = {
    direction: entry.direction === 'outbound' ? 'client-to-server' : 'server-to-client',
    message: logValueToJsonValue(entry.message),
  };

  if (entry.transport !== undefined) {
    const transport = logValueToJsonValue(entry.transport);
    if (isJsonObject(transport)) {
      const channel = getStringProperty(transport, 'transport');
      if (channel === 'sse' || channel === 'http') {
        message.channel = channel;
      }
    }
  }

  return message;
}

interface MutableProtocolMessage {
  direction: LintMessageDirection;
  channel?: LintTransportChannel;
  message?: JsonValue;
}

function logValueToJsonValue(value: ProtocolLogEntry['message']): JsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => logValueToJsonValue(item));
  }

  const result: Record<string, JsonValue> = {};

  for (const [key, childValue] of Object.entries(value)) {
    result[key] = logValueToJsonValue(childValue);
  }

  return result;
}

function getStringProperty(value: JsonValue | undefined, key: string): string | undefined {
  if (!isJsonObject(value)) {
    return undefined;
  }

  const child = value[key];

  return typeof child === 'string' ? child : undefined;
}

function getJsonObjectProperty(value: JsonValue | undefined, key: string): JsonObject | undefined {
  if (!isJsonObject(value)) {
    return undefined;
  }

  const child = value[key];

  return isJsonObject(child) ? child : undefined;
}

function isJsonObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeRuleOverrides(
  explicit: Readonly<Record<string, LintRuleOverride>>,
  severityOverrides: Readonly<Record<string, LintRuleSeverity>>,
): Readonly<Record<string, LintRuleOverride>> {
  const merged: Record<string, LintRuleOverride> = { ...explicit };

  for (const [ruleId, severity] of Object.entries(severityOverrides)) {
    const existing = merged[ruleId] ?? {};
    merged[ruleId] = { ...existing, severity };
  }

  return merged;
}

function normalizeThresholds(thresholds: LintThresholds): LintThresholds {
  return Object.fromEntries(
    Object.entries(thresholds).filter((entry): entry is [string, number] => {
      const [, value] = entry;
      return typeof value === 'number' && Number.isFinite(value);
    }),
  );
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return Array.from(new Set(values)).sort();
}
