import { Buffer } from 'node:buffer';
import { performance } from 'node:perf_hooks';

import {
  JsonRpcResponseError,
  StdioClient,
  buildLintContext,
  defaultMcpProtocolVersion,
  runLint,
  type LintConfig,
  type LintContext,
  type LintErrorObservation,
  type LintMetadata,
  type LintMethodObservation,
  type LintProtocolMessage,
  type LintPromptArgumentObservation,
  type LintPromptObservation,
  type LintResourceObservation,
  type LintResult,
  type LintToolObservation,
  type McpInitializeParams,
  type McpInitializeResult,
} from '@sherpa-labs/core-mcp';

import type { WritableStreamLike } from './output.js';
import type { ServerCommand } from './server-command.js';
import { packageVersion } from './version.js';

export interface CollectStdioLintContextInput {
  readonly serverCommand: ServerCommand;
  readonly cwd: string;
  readonly config: LintConfig;
  readonly verbose?: boolean;
  readonly stderr?: WritableStreamLike;
  readonly diagnostics?: (message: string) => void;
}

export async function collectStdioLintContext(
  input: CollectStdioLintContextInput,
): Promise<LintContext> {
  const observations = createObservations();
  const verboseProtocolLogging = input.verbose === true && input.stderr !== undefined;
  const client = new StdioClient({
    command: input.serverCommand.command,
    args: input.serverCommand.args,
    cwd: input.cwd,
    verbose: verboseProtocolLogging,
    ...(verboseProtocolLogging ? { logger: createStderrLogger(input.stderr) } : {}),
  });

  try {
    input.diagnostics?.(`Starting ${input.serverCommand.display}`);
    await client.connect();
    input.diagnostics?.('Initializing MCP server');
    const initialize = await observeInitialize(client, observations);
    input.diagnostics?.('Collecting tools/list');
    const toolsResult = await observeMethod(client, observations, 'tools/list', 'toolsListMs');
    input.diagnostics?.('Collecting resources/list');
    const resourcesResult = await observeMethod(
      client,
      observations,
      'resources/list',
      'resourcesListMs',
    );
    input.diagnostics?.('Collecting prompts/list');
    const promptsResult = await observeMethod(
      client,
      observations,
      'prompts/list',
      'promptsListMs',
    );
    input.diagnostics?.('Checking unknown method behavior');
    const unknownMethod = await observeMethod(client, observations, 'sherpa/unknownMethod');

    if (unknownMethod.observation !== undefined) {
      observations.unknownMethod = unknownMethod.observation;
    }

    return buildLintContext({
      transport: 'stdio',
      initialize: initialize.observation,
      initializeResult: initialize.result,
      capabilities: initialize.result.capabilities ?? {},
      ...(initialize.result.serverInfo !== undefined
        ? { serverInfo: initialize.result.serverInfo }
        : {}),
      tools: toToolObservations(toRecordArray(toRecordValue(toolsResult.result)?.tools)),
      resources: toResourceObservations(
        toRecordArray(toRecordValue(resourcesResult.result)?.resources),
      ),
      prompts: toPromptObservations(toRecordArray(toRecordValue(promptsResult.result)?.prompts)),
      messages: observations.messages,
      timings: observations.timings,
      errors: observations.errors,
      metadata: createMetadata(observations),
      config: input.config,
    });
  } finally {
    await client.disconnect();
  }
}

export async function runLintEngine(input: {
  readonly context: LintContext;
  readonly config: LintConfig;
}): Promise<LintResult> {
  return await runLint({ context: input.context, config: input.config });
}

interface Observations {
  nextId(): number;
  readonly messages: LintProtocolMessage[];
  readonly stdoutLines: string[];
  readonly errors: LintErrorObservation[];
  readonly methodObservations: LintMethodObservation[];
  readonly timings: MutableLintTimings;
  readonly listPayloadBytes: Partial<Record<'tools' | 'resources' | 'prompts', number>>;
  unknownMethod?: LintMethodObservation;
}

interface MutableLintTimings {
  initializeMs?: number;
  toolsListMs?: number;
  resourcesListMs?: number;
  promptsListMs?: number;
}

type ListTimingKey = 'toolsListMs' | 'resourcesListMs' | 'promptsListMs';
type JsonMessage = NonNullable<LintProtocolMessage['message']>;
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function createObservations(): Observations {
  let id = 0;
  return {
    nextId: () => {
      id += 1;
      return id;
    },
    messages: [],
    stdoutLines: [],
    errors: [],
    methodObservations: [],
    timings: {},
    listPayloadBytes: {},
  };
}

async function observeInitialize(
  client: StdioClient,
  observations: Observations,
): Promise<{
  readonly result: McpInitializeResult;
  readonly observation: NonNullable<LintContext['initialize']>;
}> {
  const id = observations.nextId();
  const params: McpInitializeParams = {
    protocolVersion: defaultMcpProtocolVersion,
    capabilities: {},
    clientInfo: { name: 'aimcp-lint', version: packageVersion },
  };
  const request = createRequestMessage(id, 'initialize', params);
  observations.messages.push({
    direction: 'client-to-server',
    phase: 'initialize',
    message: request,
  });
  const startedAt = performance.now();
  const result = await client.initialize(params);
  observations.timings.initializeMs = elapsedMs(startedAt);
  const response = createResultMessage(id, result);
  observations.messages.push({
    direction: 'server-to-client',
    phase: 'initialize',
    message: response,
  });
  observations.stdoutLines.push(JSON.stringify(response));
  observations.messages.push({
    direction: 'client-to-server',
    phase: 'post-initialize',
    message: { jsonrpc: '2.0', method: 'notifications/initialized' },
  });

  return {
    result,
    observation: {
      request,
      response,
      result,
      completed: true,
      initializedNotificationSent: true,
    },
  };
}

async function observeMethod(
  client: StdioClient,
  observations: Observations,
  method: string,
  timingKey?: ListTimingKey,
): Promise<{ readonly result: unknown; readonly observation?: LintMethodObservation }> {
  const id = observations.nextId();
  const request = createRequestMessage(id, method);
  observations.messages.push({
    direction: 'client-to-server',
    phase: 'post-initialize',
    message: request,
  });
  const startedAt = performance.now();

  try {
    const result = await client.request<unknown>(method);
    const durationMs = elapsedMs(startedAt);
    setListTiming(observations.timings, timingKey, durationMs);
    const response = createResultMessage(id, result);
    const responseBytes = serializedByteLength(result);
    observations.messages.push({
      direction: 'server-to-client',
      phase: 'post-initialize',
      message: response,
    });
    observations.stdoutLines.push(JSON.stringify(response));
    assignListPayloadBytes(observations, method, result);

    const observation: LintMethodObservation = {
      method,
      ok: true,
      result: toJsonMessage(result),
      responseBytes,
    };
    observations.methodObservations.push(observation);
    return { result, observation };
  } catch (error) {
    const durationMs = elapsedMs(startedAt);
    setListTiming(observations.timings, timingKey, durationMs);

    if (error instanceof JsonRpcResponseError) {
      const response = createErrorMessage(id, error.responseError);
      observations.messages.push({
        direction: 'server-to-client',
        phase: 'post-initialize',
        message: response,
      });
      observations.stdoutLines.push(JSON.stringify(response));
      const lintError = createLintErrorObservation(method, error.responseError);
      const observation: LintMethodObservation = {
        method,
        ok: false,
        errorCode: error.responseError.code,
        responseBytes: serializedByteLength(response),
      };
      observations.errors.push(lintError);
      observations.methodObservations.push(observation);
      return { result: undefined, observation };
    }

    const lintError: LintErrorObservation = { method, message: describeUnknown(error) };
    const observation: LintMethodObservation = { method, ok: false };
    observations.errors.push(lintError);
    observations.methodObservations.push(observation);
    return { result: undefined, observation };
  }
}

function createMetadata(observations: Observations): LintMetadata {
  return {
    supportedProtocolVersions: [defaultMcpProtocolVersion],
    stdio: {
      stdoutLines: observations.stdoutLines,
      stdoutHadPartialLine: false,
    },
    methodObservations: observations.methodObservations,
    listPayloadBytes: observations.listPayloadBytes,
    ...(observations.unknownMethod !== undefined
      ? { unknownMethod: observations.unknownMethod }
      : {}),
  };
}

function createRequestMessage(id: number, method: string, params?: unknown): JsonMessage {
  return {
    jsonrpc: '2.0',
    id,
    method,
    ...(params !== undefined ? { params: toJsonMessage(params) } : {}),
  };
}

function createResultMessage(id: number, result: unknown): JsonMessage {
  return { jsonrpc: '2.0', id, result: toJsonMessage(result) };
}

function createErrorMessage(
  id: number,
  error: { readonly code: number; readonly message: string; readonly data?: unknown },
): JsonMessage {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code: error.code,
      message: error.message,
      ...(error.data !== undefined ? { data: toJsonMessage(error.data) } : {}),
    },
  };
}

function createLintErrorObservation(
  method: string,
  error: { readonly code: number; readonly message: string; readonly data?: unknown },
): LintErrorObservation {
  return {
    method,
    code: error.code,
    message: error.message,
    ...(error.data !== undefined ? { data: toJsonMessage(error.data) } : {}),
  };
}

function setListTiming(
  timings: MutableLintTimings,
  key: ListTimingKey | undefined,
  durationMs: number,
): void {
  if (key !== undefined) {
    timings[key] = durationMs;
  }
}

function assignListPayloadBytes(observations: Observations, method: string, result: unknown): void {
  if (method === 'tools/list') {
    observations.listPayloadBytes.tools = serializedByteLength(
      toRecordValue(result)?.tools ?? result,
    );
  } else if (method === 'resources/list') {
    observations.listPayloadBytes.resources = serializedByteLength(
      toRecordValue(result)?.resources ?? result,
    );
  } else if (method === 'prompts/list') {
    observations.listPayloadBytes.prompts = serializedByteLength(
      toRecordValue(result)?.prompts ?? result,
    );
  }
}

function toToolObservations(values: readonly unknown[]): readonly LintToolObservation[] {
  return values.map(toToolObservation).filter(isDefined);
}

function toToolObservation(value: unknown): LintToolObservation | undefined {
  const record = toRecordValue(value);

  if (record === undefined) {
    return undefined;
  }

  const annotations = toRecordValue(record.annotations) as
    | NonNullable<LintToolObservation['annotations']>
    | undefined;

  return {
    ...assignStringField(record, 'name'),
    ...assignStringField(record, 'description'),
    ...(record.inputSchema !== undefined ? { inputSchema: toJsonMessage(record.inputSchema) } : {}),
    ...(record.outputSchema !== undefined
      ? { outputSchema: toJsonMessage(record.outputSchema) }
      : {}),
    ...(annotations !== undefined ? { annotations } : {}),
  };
}

function toResourceObservations(values: readonly unknown[]): readonly LintResourceObservation[] {
  return values.map(toResourceObservation).filter(isDefined);
}

function toResourceObservation(value: unknown): LintResourceObservation | undefined {
  const record = toRecordValue(value);

  if (record === undefined) {
    return undefined;
  }

  return {
    ...assignStringField(record, 'uri'),
    ...assignStringField(record, 'name'),
    ...assignStringField(record, 'description'),
    ...assignStringField(record, 'mimeType'),
    ...(typeof record.size === 'number' && Number.isFinite(record.size)
      ? { size: record.size }
      : {}),
  };
}

function toPromptObservations(values: readonly unknown[]): readonly LintPromptObservation[] {
  return values.map(toPromptObservation).filter(isDefined);
}

function toPromptObservation(value: unknown): LintPromptObservation | undefined {
  const record = toRecordValue(value);

  if (record === undefined) {
    return undefined;
  }

  const args = toRecordArray(record.arguments).map(toPromptArgumentObservation).filter(isDefined);

  return {
    ...assignStringField(record, 'name'),
    ...assignStringField(record, 'description'),
    ...(args.length > 0 ? { arguments: args } : {}),
  };
}

function toPromptArgumentObservation(value: unknown): LintPromptArgumentObservation | undefined {
  const record = toRecordValue(value);

  if (record === undefined) {
    return undefined;
  }

  return {
    ...assignStringField(record, 'name'),
    ...assignStringField(record, 'description'),
    ...(typeof record.required === 'boolean' ? { required: record.required } : {}),
  };
}

function assignStringField(
  value: Readonly<Record<string, unknown>>,
  key: string,
): Readonly<Record<string, string>> {
  const child = value[key];
  return typeof child === 'string' ? { [key]: child } : {};
}

function toRecordArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function toRecordValue(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : undefined;
}

function toJsonMessage(value: unknown): JsonMessage {
  return value as JsonMessage;
}

function elapsedMs(startedAt: number): number {
  return Math.max(0, Math.round(performance.now() - startedAt));
}

function serializedByteLength(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value) ?? 'null', 'utf8');
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function describeUnknown(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function createStderrLogger(stream: WritableStreamLike): {
  debug(message: string, fields?: Readonly<Record<string, unknown>>): void;
  info(message: string, fields?: Readonly<Record<string, unknown>>): void;
  warn(message: string, fields?: Readonly<Record<string, unknown>>): void;
  error(message: string, fields?: Readonly<Record<string, unknown>>): void;
  getLevel(): LogLevel;
  setLevel(level: LogLevel): void;
} {
  let level: LogLevel = 'debug';
  const write = (
    nextLevel: LogLevel,
    message: string,
    fields?: Readonly<Record<string, unknown>>,
  ) => {
    const fieldText = fields === undefined ? '' : ` ${JSON.stringify(fields)}`;
    stream.write(`${nextLevel.toUpperCase()} ${message}${fieldText}\n`);
  };

  return {
    debug: (message, fields) => {
      write('debug', message, fields);
    },
    info: (message, fields) => {
      write('info', message, fields);
    },
    warn: (message, fields) => {
      write('warn', message, fields);
    },
    error: (message, fields) => {
      write('error', message, fields);
    },
    getLevel: () => level,
    setLevel: (nextLevel) => {
      level = nextLevel;
    },
  };
}
