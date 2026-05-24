import type { JsonObject, JsonValue } from '@sherpa-labs/shared-types';

export type McpClientErrorCode =
  | 'MCP_STDIO_PROCESS_SPAWN_FAILED'
  | 'MCP_STDIO_PROCESS_EXITED'
  | 'MCP_STDIO_REQUEST_TIMEOUT'
  | 'MCP_STDIO_MALFORMED_JSON_RPC'
  | 'MCP_STDIO_RESPONSE_ERROR'
  | 'MCP_STDIO_STDIN_WRITE_FAILED'
  | 'MCP_STDIO_DISCONNECTED'
  | 'MCP_SSE_CONNECTION_FAILED'
  | 'MCP_SSE_INVALID_EVENT'
  | 'MCP_SSE_MALFORMED_JSON_RPC'
  | 'MCP_SSE_HTTP_POST_FAILED'
  | 'MCP_SSE_HTTP_NON_2XX'
  | 'MCP_SSE_REQUEST_TIMEOUT'
  | 'MCP_SSE_RECONNECT_EXHAUSTED'
  | 'MCP_SSE_DISCONNECTED';

export interface McpClientErrorOptions {
  readonly code: McpClientErrorCode;
  readonly message: string;
  readonly context?: JsonObject;
  readonly cause?: unknown;
}

export class McpClientError extends Error {
  readonly code: McpClientErrorCode;
  readonly context: JsonObject | undefined;
  override readonly cause: unknown;

  constructor(options: McpClientErrorOptions) {
    super(options.message);
    this.name = new.target.name;
    this.code = options.code;
    this.context = options.context;
    this.cause = options.cause;
  }
}

export class StdioProcessSpawnError extends McpClientError {
  constructor(options: {
    readonly command: string;
    readonly args: readonly string[];
    readonly cwd: string | undefined;
    readonly cause?: unknown;
  }) {
    super({
      code: 'MCP_STDIO_PROCESS_SPAWN_FAILED',
      message: `Failed to spawn MCP server process: ${options.command}`,
      context: createProcessContext(options),
      cause: options.cause,
    });
  }
}

export class StdioProcessExitError extends McpClientError {
  constructor(options: {
    readonly command: string;
    readonly args: readonly string[];
    readonly cwd: string | undefined;
    readonly exitCode: number | null;
    readonly signal: NodeJS.Signals | null;
    readonly stderrTail: string;
  }) {
    super({
      code: 'MCP_STDIO_PROCESS_EXITED',
      message: createExitMessage(options),
      context: {
        ...createProcessContext(options),
        exitCode: options.exitCode,
        signal: options.signal,
        stderrTail: options.stderrTail ?? '',
      },
    });
  }
}

export class StdioRequestTimeoutError extends McpClientError {
  constructor(options: {
    readonly id: string | number;
    readonly method: string;
    readonly timeoutMs: number;
  }) {
    super({
      code: 'MCP_STDIO_REQUEST_TIMEOUT',
      message: `MCP request timed out after ${options.timeoutMs}ms: ${options.method}`,
      context: {
        id: options.id,
        method: options.method,
        timeoutMs: options.timeoutMs,
      },
    });
  }
}

export class MalformedJsonRpcError extends McpClientError {
  constructor(reason: string, options: { readonly line?: string; readonly cause?: unknown } = {}) {
    super({
      code: 'MCP_STDIO_MALFORMED_JSON_RPC',
      message: `Malformed JSON-RPC message from MCP server: ${reason}`,
      context: {
        reason,
        lineExcerpt: createExcerpt(options.line),
      },
      cause: options.cause,
    });
  }
}

export class JsonRpcResponseError extends McpClientError {
  readonly responseError: {
    readonly code: number;
    readonly message: string;
    readonly data?: JsonValue;
  };

  constructor(options: {
    readonly id: string | number;
    readonly method: string;
    readonly error: { readonly code: number; readonly message: string; readonly data?: JsonValue };
  }) {
    super({
      code: 'MCP_STDIO_RESPONSE_ERROR',
      message: `MCP server returned JSON-RPC error ${options.error.code} for ${options.method}: ${options.error.message}`,
      context: {
        id: options.id,
        method: options.method,
        rpcErrorCode: options.error.code,
        rpcErrorMessage: options.error.message,
      },
    });
    this.responseError = options.error;
  }
}

export class StdinWriteFailureError extends McpClientError {
  constructor(options: {
    readonly method: string;
    readonly id?: string | number;
    readonly cause?: unknown;
  }) {
    super({
      code: 'MCP_STDIO_STDIN_WRITE_FAILED',
      message: `Failed to write MCP message to stdin: ${options.method}`,
      context: {
        method: options.method,
        id: options.id ?? null,
      },
      cause: options.cause,
    });
  }
}

export class DisconnectedClientError extends McpClientError {
  constructor(message = 'MCP stdio client is not connected') {
    super({
      code: 'MCP_STDIO_DISCONNECTED',
      message,
    });
  }
}

export class SseConnectionFailureError extends McpClientError {
  constructor(options: {
    readonly url: string | URL;
    readonly reason: string;
    readonly cause?: unknown;
  }) {
    super({
      code: 'MCP_SSE_CONNECTION_FAILED',
      message: `Failed to connect to MCP SSE endpoint: ${redactUrlForContext(options.url)}`,
      context: createHttpContext({
        url: options.url,
        reason: options.reason,
      }),
      cause: options.cause,
    });
  }
}

export class InvalidSseEventError extends McpClientError {
  constructor(
    reason: string,
    options: {
      readonly url?: string | URL;
      readonly event?: string;
      readonly data?: string;
      readonly cause?: unknown;
    } = {},
  ) {
    super({
      code: 'MCP_SSE_INVALID_EVENT',
      message: `Invalid MCP SSE event: ${reason}`,
      context: createSseEventContext(reason, options),
      cause: options.cause,
    });
  }
}

export class SseMalformedJsonRpcError extends McpClientError {
  constructor(reason: string, options: { readonly data?: string; readonly cause?: unknown } = {}) {
    super({
      code: 'MCP_SSE_MALFORMED_JSON_RPC',
      message: `Malformed JSON-RPC message from MCP SSE stream: ${reason}`,
      context: {
        reason,
        dataExcerpt: createExcerpt(options.data),
      },
      cause: options.cause,
    });
  }
}

export class HttpPostFailureError extends McpClientError {
  constructor(options: {
    readonly url: string | URL;
    readonly method: string;
    readonly id?: string | number;
    readonly cause?: unknown;
  }) {
    super({
      code: 'MCP_SSE_HTTP_POST_FAILED',
      message: `Failed to POST MCP JSON-RPC message over SSE transport: ${options.method}`,
      context: createHttpContext({
        url: options.url,
        method: options.method,
        id: options.id,
      }),
      cause: options.cause,
    });
  }
}

export class HttpNon2xxResponseError extends McpClientError {
  constructor(options: {
    readonly url: string | URL;
    readonly operation: string;
    readonly status: number;
    readonly statusText: string;
    readonly bodyExcerpt?: string;
    readonly method?: string;
    readonly id?: string | number;
  }) {
    super({
      code: 'MCP_SSE_HTTP_NON_2XX',
      message: `MCP SSE HTTP ${options.operation} returned ${options.status} ${options.statusText}`,
      context: createHttpContext({
        url: options.url,
        operation: options.operation,
        status: options.status,
        statusText: options.statusText,
        bodyExcerpt: options.bodyExcerpt,
        method: options.method,
        id: options.id,
      }),
    });
  }
}

export class SseRequestTimeoutError extends McpClientError {
  constructor(options: {
    readonly id?: string | number;
    readonly method: string;
    readonly timeoutMs: number;
  }) {
    super({
      code: 'MCP_SSE_REQUEST_TIMEOUT',
      message: `MCP SSE request timed out after ${options.timeoutMs}ms: ${options.method}`,
      context: createHttpContext({
        method: options.method,
        id: options.id,
        timeoutMs: options.timeoutMs,
      }),
    });
  }
}

export class SseReconnectExhaustedError extends McpClientError {
  constructor(options: {
    readonly url: string | URL;
    readonly attempts: number;
    readonly cause?: unknown;
  }) {
    super({
      code: 'MCP_SSE_RECONNECT_EXHAUSTED',
      message: `MCP SSE reconnect attempts exhausted after ${options.attempts} attempts`,
      context: createHttpContext({
        url: options.url,
        attempts: options.attempts,
      }),
      cause: options.cause,
    });
  }
}

export class SseDisconnectedClientError extends McpClientError {
  constructor(message = 'MCP SSE client is not connected') {
    super({
      code: 'MCP_SSE_DISCONNECTED',
      message,
    });
  }
}

function createExitMessage(options: {
  readonly command: string;
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
}): string {
  const reason =
    options.signal == null
      ? `exit code ${options.exitCode ?? 'unknown'}`
      : `signal ${options.signal}`;

  return `MCP server process exited before completing pending requests: ${options.command} (${reason})`;
}

function createProcessContext(options: {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string | undefined;
}): JsonObject {
  return {
    command: options.command,
    args: redactCommandArgs(options.args),
    cwd: options.cwd ?? null,
  };
}

function redactCommandArgs(args: readonly string[]): readonly string[] {
  const redacted: string[] = [];
  let redactNext = false;

  for (const arg of args) {
    if (redactNext) {
      redacted.push('[REDACTED]');
      redactNext = false;
      continue;
    }

    const [name, value] = splitArg(arg);

    if (isSecretKey(name)) {
      if (value == null) {
        redacted.push(name);
        redactNext = true;
      } else {
        redacted.push(`${name}=[REDACTED]`);
      }
      continue;
    }

    redacted.push(arg);
  }

  return redacted;
}

function splitArg(arg: string): readonly [string, string | undefined] {
  const equalsIndex = arg.indexOf('=');

  if (equalsIndex === -1) {
    return [arg, undefined];
  }

  return [arg.slice(0, equalsIndex), arg.slice(equalsIndex + 1)];
}

function isSecretKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');

  return (
    normalized.includes('token') ||
    normalized.includes('authorization') ||
    normalized.includes('apikey') ||
    normalized.includes('cookie') ||
    normalized.includes('password') ||
    normalized.includes('secret')
  );
}

function createExcerpt(line: string | undefined): string {
  if (line == null) {
    return '';
  }

  return line.length <= 200 ? line : `${line.slice(0, 200)}...`;
}

export function redactUrlForContext(url: string | URL): string {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return createExcerpt(String(url));
  }

  if (parsed.username !== '') {
    parsed.username = '[REDACTED]';
  }

  if (parsed.password !== '') {
    parsed.password = '[REDACTED]';
  }

  for (const key of [...parsed.searchParams.keys()]) {
    if (isSecretKey(key) || key.toLowerCase().includes('session')) {
      parsed.searchParams.set(key, '[REDACTED]');
    }
  }

  return parsed.toString();
}

function createHttpContext(input: {
  readonly url?: string | URL | undefined;
  readonly reason?: string | undefined;
  readonly operation?: string | undefined;
  readonly status?: number | undefined;
  readonly statusText?: string | undefined;
  readonly bodyExcerpt?: string | undefined;
  readonly method?: string | undefined;
  readonly id?: string | number | undefined;
  readonly timeoutMs?: number | undefined;
  readonly attempts?: number | undefined;
}): JsonObject {
  const context: Record<string, JsonValue> = {};

  if (input.url != null) {
    context.url = redactUrlForContext(input.url);
  }

  if (input.reason != null) {
    context.reason = input.reason;
  }

  if (input.operation != null) {
    context.operation = input.operation;
  }

  if (input.status != null) {
    context.status = input.status;
  }

  if (input.statusText != null) {
    context.statusText = input.statusText;
  }

  if (input.bodyExcerpt != null) {
    context.bodyExcerpt = createExcerpt(input.bodyExcerpt);
  }

  if (input.method != null) {
    context.method = input.method;
  }

  if (input.id != null) {
    context.id = input.id;
  }

  if (input.timeoutMs != null) {
    context.timeoutMs = input.timeoutMs;
  }

  if (input.attempts != null) {
    context.attempts = input.attempts;
  }

  return context;
}

function createSseEventContext(
  reason: string,
  options: {
    readonly url?: string | URL;
    readonly event?: string;
    readonly data?: string;
  },
): JsonObject {
  const context: Record<string, JsonValue> = { reason };

  if (options.url != null) {
    context.url = redactUrlForContext(options.url);
  }

  if (options.event != null) {
    context.event = options.event;
  }

  if (options.data != null) {
    context.dataExcerpt = createExcerpt(options.data);
  }

  return context;
}
