import type { JsonObject, JsonValue } from '@sherpa-labs/shared-types';

export type McpClientErrorCode =
  | 'MCP_STDIO_PROCESS_SPAWN_FAILED'
  | 'MCP_STDIO_PROCESS_EXITED'
  | 'MCP_STDIO_REQUEST_TIMEOUT'
  | 'MCP_STDIO_MALFORMED_JSON_RPC'
  | 'MCP_STDIO_RESPONSE_ERROR'
  | 'MCP_STDIO_STDIN_WRITE_FAILED'
  | 'MCP_STDIO_DISCONNECTED';

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
