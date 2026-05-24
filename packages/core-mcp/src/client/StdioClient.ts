import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import process from 'node:process';
import { setTimeout as sleepFor } from 'node:timers/promises';

import { deterministicId } from '@sherpa-labs/core-utils/hash';
import type { JsonObject, JsonValue } from '@sherpa-labs/shared-types';

import {
  DisconnectedClientError,
  JsonRpcResponseError,
  MalformedJsonRpcError,
  StdioProcessExitError,
  StdioProcessSpawnError,
  StdinWriteFailureError,
  StdioRequestTimeoutError,
} from './errors.js';
import {
  createJsonRpcNotification,
  createJsonRpcRequest,
  isJsonRpcResponse,
  parseJsonRpcLine,
  type JsonRpcId,
  type JsonRpcParams,
} from './json-rpc.js';
import type { McpClient } from './McpClient.js';
import { createProtocolMessageLogger, type ProtocolMessageLogger } from './message-log.js';
import {
  defaultInitializeTimeoutMs,
  defaultMcpProtocolVersion,
  defaultRequestTimeoutMs,
  type McpInitializeParams,
  type McpInitializeResult,
  type McpListToolsResult,
  type StdioClientOptions,
  type StdioRequestOptions,
} from './types.js';

interface PendingRequest {
  readonly id: JsonRpcId;
  readonly method: string;
  readonly timeoutMs: number;
  readonly resolve: (result: JsonValue) => void;
  readonly reject: (error: Error) => void;
  readonly timeout: NodeJS.Timeout;
}

const stderrTailLimit = 8_192;
const disconnectGraceMs = 500;

export class StdioClient implements McpClient<StdioRequestOptions> {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string | undefined;
  readonly initializeTimeoutMs: number;
  readonly requestTimeoutMs: number;

  #child: ChildProcessWithoutNullStreams | undefined;
  #stdoutBuffer = '';
  #stderrTail = '';
  #pendingRequests = new Map<JsonRpcId, PendingRequest>();
  #abandonedRequestIds = new Set<JsonRpcId>();
  #requestCounter = 0;
  #disconnecting = false;
  #fatalError: Error | undefined;
  #initializeResult: McpInitializeResult | undefined;
  #protocolLogger: ProtocolMessageLogger;
  #options: StdioClientOptions;
  #sessionPrefix: string;

  constructor(options: StdioClientOptions) {
    if (options.command.trim() === '') {
      throw new TypeError('command must be a non-empty string.');
    }

    this.command = options.command;
    this.args = options.args ?? [];
    this.cwd = options.cwd;
    this.initializeTimeoutMs = validateTimeout(
      options.initializeTimeoutMs ?? defaultInitializeTimeoutMs,
      'initializeTimeoutMs',
    );
    this.requestTimeoutMs = validateTimeout(
      options.requestTimeoutMs ?? defaultRequestTimeoutMs,
      'requestTimeoutMs',
    );
    this.#options = options;
    this.#protocolLogger = createProtocolMessageLogger(options);
    this.#sessionPrefix = deterministicId(
      {
        command: options.command,
        args: [...this.args],
        cwd: options.cwd ?? '',
        parentPid: process.pid,
        createdAt: Date.now(),
      },
      { prefix: 'mcp', length: 12 },
    );
  }

  get isConnected(): boolean {
    return this.#child != null && this.#fatalError == null && !this.#disconnecting;
  }

  get initializeResult(): McpInitializeResult | undefined {
    return this.#initializeResult;
  }

  get protocolVersion(): string | undefined {
    return this.#initializeResult?.protocolVersion;
  }

  get serverInfo(): JsonObject | undefined {
    return this.#initializeResult?.serverInfo;
  }

  get serverCapabilities(): JsonObject | undefined {
    return this.#initializeResult?.capabilities;
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    if (this.#child != null) {
      throw this.#fatalError ?? new DisconnectedClientError();
    }

    const child = spawn(this.command, [...this.args], {
      cwd: this.cwd,
      env: this.#options.env == null ? process.env : { ...process.env, ...this.#options.env },
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
    });

    this.#child = child;
    this.#fatalError = undefined;
    this.#disconnecting = false;
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      this.#handleStdoutData(chunk);
    });
    child.stderr.on('data', (chunk: string) => {
      this.#appendStderr(chunk);
    });
    child.on('exit', (exitCode, signal) => {
      this.#handleChildExit(exitCode, signal);
    });

    await new Promise<void>((resolve, reject) => {
      const onRuntimeError = (error: Error): void => {
        this.#handleChildProcessError(error);
      };

      const onSpawn = (): void => {
        child.off('error', onSpawnError);
        child.on('error', onRuntimeError);
        resolve();
      };

      const onSpawnError = (error: Error): void => {
        child.off('spawn', onSpawn);
        const spawnError = new StdioProcessSpawnError({
          command: this.command,
          args: this.args,
          cwd: this.cwd,
          cause: error,
        });
        this.#fatalError = spawnError;
        this.#child = undefined;
        reject(spawnError);
      };

      child.once('spawn', onSpawn);
      child.once('error', onSpawnError);
    });
  }

  async initialize(
    params?: Partial<McpInitializeParams>,
    options?: StdioRequestOptions,
  ): Promise<McpInitializeResult> {
    const initializeParams: McpInitializeParams = {
      protocolVersion: defaultMcpProtocolVersion,
      capabilities: {},
      clientInfo: {
        name: '@sherpa-labs/core-mcp',
        version: '0.0.0',
      },
      ...params,
    };

    const result = await this.request<McpInitializeResult>('initialize', initializeParams, {
      timeoutMs: options?.timeoutMs ?? this.initializeTimeoutMs,
    });

    if (!isJsonObject(result)) {
      throw new MalformedJsonRpcError('initialize result must be a JSON object');
    }

    this.#initializeResult = result;
    await this.notify('notifications/initialized');

    return result;
  }

  async request<T = JsonValue>(
    method: string,
    params?: JsonRpcParams,
    options?: StdioRequestOptions,
  ): Promise<T> {
    this.#ensureConnected();
    validateMethod(method);

    const id = this.#nextRequestId();
    const timeoutMs = validateTimeout(options?.timeoutMs ?? this.requestTimeoutMs, 'timeoutMs');
    const message = createJsonRpcRequest(id, method, params);

    return await new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.#pendingRequests.delete(id);
        this.#abandonedRequestIds.add(id);
        reject(new StdioRequestTimeoutError({ id, method, timeoutMs }));
      }, timeoutMs);

      const pending: PendingRequest = {
        id,
        method,
        timeoutMs,
        resolve: (result) => {
          resolve(result as T);
        },
        reject,
        timeout,
      };
      this.#pendingRequests.set(id, pending);

      try {
        this.#writeMessage(message, (error) => {
          if (error != null) {
            this.#rejectPendingRequest(
              id,
              new StdinWriteFailureError({ method, id, cause: error }),
            );
          }
        });
      } catch (error) {
        this.#rejectPendingRequest(id, new StdinWriteFailureError({ method, id, cause: error }));
      }
    });
  }

  async notify(method: string, params?: JsonRpcParams): Promise<void> {
    this.#ensureConnected();
    validateMethod(method);

    const message = createJsonRpcNotification(method, params);

    await new Promise<void>((resolve, reject) => {
      try {
        this.#writeMessage(message, (error) => {
          if (error == null) {
            resolve();
            return;
          }

          reject(new StdinWriteFailureError({ method, cause: error }));
        });
      } catch (error) {
        reject(new StdinWriteFailureError({ method, cause: error }));
      }
    });
  }

  async listTools(options?: StdioRequestOptions): Promise<McpListToolsResult> {
    return await this.request<McpListToolsResult>('tools/list', undefined, options);
  }

  async disconnect(): Promise<void> {
    const child = this.#child;

    if (child == null) {
      return;
    }

    this.#disconnecting = true;
    this.#rejectAllPending(
      new DisconnectedClientError('MCP stdio client disconnected before response'),
    );

    if (!child.stdin.destroyed) {
      child.stdin.end();
    }

    if (child.exitCode != null || child.signalCode != null) {
      this.#child = undefined;
      this.#disconnecting = false;
      return;
    }

    if (!(await waitForExit(child, disconnectGraceMs))) {
      child.kill('SIGTERM');
    }

    if (!(await waitForExit(child, disconnectGraceMs))) {
      child.kill('SIGKILL');
      await waitForExit(child, disconnectGraceMs);
    }

    this.#child = undefined;
    this.#disconnecting = false;
  }

  #nextRequestId(): string {
    this.#requestCounter += 1;

    return `${this.#sessionPrefix}-${this.#requestCounter}`;
  }

  #writeMessage(
    message: ReturnType<typeof createJsonRpcRequest> | ReturnType<typeof createJsonRpcNotification>,
    callback: (error: Error | null | undefined) => void,
  ): void {
    const child = this.#child;

    if (child == null || child.stdin.destroyed || !child.stdin.writable) {
      throw new DisconnectedClientError();
    }

    this.#protocolLogger.log('outbound', message);
    child.stdin.write(`${JSON.stringify(message)}\n`, 'utf8', callback);
  }

  #handleStdoutData(chunk: string): void {
    this.#stdoutBuffer += chunk;

    while (true) {
      const newlineIndex = this.#stdoutBuffer.indexOf('\n');

      if (newlineIndex === -1) {
        return;
      }

      const line = this.#stdoutBuffer.slice(0, newlineIndex).replace(/\r$/, '');
      this.#stdoutBuffer = this.#stdoutBuffer.slice(newlineIndex + 1);
      this.#handleStdoutLine(line);
    }
  }

  #handleStdoutLine(line: string): void {
    if (line.trim() === '') {
      return;
    }

    let message: ReturnType<typeof parseJsonRpcLine>;

    try {
      message = parseJsonRpcLine(line);
    } catch (error) {
      this.#failTransport(
        error instanceof Error ? error : new MalformedJsonRpcError('unknown parser failure'),
      );
      return;
    }

    this.#protocolLogger.log('inbound', message);

    if (!isJsonRpcResponse(message)) {
      return;
    }

    const pending = this.#pendingRequests.get(message.id);

    if (pending == null) {
      if (this.#abandonedRequestIds.has(message.id)) {
        this.#abandonedRequestIds.delete(message.id);
        return;
      }

      this.#failTransport(
        new MalformedJsonRpcError(`received response for unknown request id ${String(message.id)}`),
      );
      return;
    }

    this.#pendingRequests.delete(message.id);
    clearTimeout(pending.timeout);

    if ('error' in message) {
      pending.reject(
        new JsonRpcResponseError({
          id: message.id,
          method: pending.method,
          error: message.error,
        }),
      );
      return;
    }

    pending.resolve(message.result);
  }

  #handleChildExit(exitCode: number | null, signal: NodeJS.Signals | null): void {
    const child = this.#child;
    this.#child = undefined;

    if (this.#disconnecting) {
      return;
    }

    const exitError = new StdioProcessExitError({
      command: this.command,
      args: this.args,
      cwd: this.cwd,
      exitCode,
      signal,
      stderrTail: this.#stderrTail,
    });
    this.#fatalError = this.#fatalError ?? exitError;
    this.#rejectAllPending(this.#fatalError);

    if (child != null) {
      child.stdout.removeAllListeners();
      child.stderr.removeAllListeners();
    }
  }

  #handleChildProcessError(error: Error): void {
    if (this.#disconnecting) {
      return;
    }

    const processError = new StdioProcessExitError({
      command: this.command,
      args: this.args,
      cwd: this.cwd,
      exitCode: null,
      signal: null,
      stderrTail: this.#stderrTail === '' ? error.message : `${this.#stderrTail}\n${error.message}`,
    });
    this.#fatalError = this.#fatalError ?? processError;
    this.#rejectAllPending(this.#fatalError);
  }

  #appendStderr(chunk: string): void {
    this.#stderrTail = `${this.#stderrTail}${chunk}`;

    if (this.#stderrTail.length > stderrTailLimit) {
      this.#stderrTail = this.#stderrTail.slice(this.#stderrTail.length - stderrTailLimit);
    }
  }

  #failTransport(error: Error): void {
    this.#fatalError = error;
    this.#rejectAllPending(error);

    const child = this.#child;

    if (child == null) {
      return;
    }

    this.#child = undefined;
    child.kill('SIGTERM');
  }

  #rejectPendingRequest(id: JsonRpcId, error: Error): void {
    const pending = this.#pendingRequests.get(id);

    if (pending == null) {
      return;
    }

    this.#pendingRequests.delete(id);
    clearTimeout(pending.timeout);
    pending.reject(error);
  }

  #rejectAllPending(error: Error): void {
    const pendingRequests = [...this.#pendingRequests.values()];
    this.#pendingRequests.clear();

    for (const pending of pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
  }

  #ensureConnected(): void {
    if (this.#fatalError != null) {
      throw this.#fatalError;
    }

    if (!this.isConnected) {
      throw new DisconnectedClientError();
    }
  }
}

function validateMethod(method: string): void {
  if (method.trim() === '') {
    throw new TypeError('method must be a non-empty string.');
  }
}

function validateTimeout(timeoutMs: number, name: string): number {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new RangeError(`${name} must be a positive finite number.`);
  }

  return timeoutMs;
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === 'object' && value != null && !Array.isArray(value);
}

async function waitForExit(
  child: ChildProcessWithoutNullStreams,
  timeoutMs: number,
): Promise<boolean> {
  if (child.exitCode != null || child.signalCode != null) {
    return true;
  }

  return await Promise.race([
    new Promise<boolean>((resolve) => {
      child.once('exit', () => {
        resolve(true);
      });
    }),
    sleepFor(timeoutMs).then(() => false),
  ]);
}
