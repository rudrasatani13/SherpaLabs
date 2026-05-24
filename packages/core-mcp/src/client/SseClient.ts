import process from 'node:process';
import { setTimeout as sleepFor } from 'node:timers/promises';
import { TextDecoder } from 'node:util';

import { deterministicId } from '@sherpa-labs/core-utils/hash';
import { retry } from '@sherpa-labs/core-utils/retry';
import type { JsonObject, JsonValue } from '@sherpa-labs/shared-types';

import {
  HttpNon2xxResponseError,
  InvalidSseEventError,
  JsonRpcResponseError,
  SseConnectionFailureError,
  SseDisconnectedClientError,
  SseMalformedJsonRpcError,
  SseReconnectExhaustedError,
  SseRequestTimeoutError,
} from './errors.js';
import { createSseStreamHeaders, createTransportLogMetadata, postJsonRpcMessage } from './http.js';
import {
  createJsonRpcNotification,
  createJsonRpcRequest,
  isJsonRpcResponse,
  parseJsonRpcLine,
  type JsonRpcId,
  type JsonRpcParams,
  type JsonRpcOutboundMessage,
} from './json-rpc.js';
import type { McpClient } from './McpClient.js';
import { createProtocolMessageLogger, type ProtocolMessageLogger } from './message-log.js';
import { SseParser, type SseEvent } from './sse-parser.js';
import {
  defaultConnectTimeoutMs,
  defaultInitializeTimeoutMs,
  defaultMcpProtocolVersion,
  defaultReconnectInitialDelayMs,
  defaultReconnectMaxAttempts,
  defaultRequestTimeoutMs,
  type FetchLike,
  type McpInitializeParams,
  type McpInitializeResult,
  type McpListToolsResult,
  type SseClientOptions,
  type SseRequestOptions,
} from './types.js';

interface PendingRequest {
  readonly id: JsonRpcId;
  readonly method: string;
  readonly resolve: (result: JsonValue) => void;
  readonly reject: (error: Error) => void;
  readonly timeout: NodeJS.Timeout;
  readonly postAbortController: AbortController;
}

interface EndpointWaiter {
  readonly resolve: (endpoint: URL) => void;
  readonly reject: (error: Error) => void;
  readonly timeout: NodeJS.Timeout;
}

const disconnectGraceMs = 500;

export class SseClient implements McpClient<SseRequestOptions> {
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly connectTimeoutMs: number;
  readonly initializeTimeoutMs: number;
  readonly requestTimeoutMs: number;
  readonly reconnect: boolean;
  readonly reconnectMaxAttempts: number;
  readonly reconnectInitialDelayMs: number;

  #fetch: FetchLike;
  #protocolLogger: ProtocolMessageLogger;
  #sseUrl: URL;
  #sseAbortController: AbortController | undefined;
  #streamPromise: Promise<void> | undefined;
  #connectPromise: Promise<void> | undefined;
  #reconnectPromise: Promise<void> | undefined;
  #reconnectAbortController: AbortController | undefined;
  #postEndpoint: URL | undefined;
  #pendingRequests = new Map<JsonRpcId, PendingRequest>();
  #endpointWaiters = new Set<EndpointWaiter>();
  #abandonedRequestIds = new Set<JsonRpcId>();
  #requestCounter = 0;
  #disconnecting = false;
  #fatalError: Error | undefined;
  #initializeResult: McpInitializeResult | undefined;
  #sessionPrefix: string;

  constructor(options: SseClientOptions) {
    this.#sseUrl = normalizeUrl(options.url);
    this.url = this.#sseUrl.toString();
    this.headers = options.headers ?? {};
    this.#fetch = options.fetch ?? globalThis.fetch;
    this.connectTimeoutMs = validateTimeout(
      options.connectTimeoutMs ?? defaultConnectTimeoutMs,
      'connectTimeoutMs',
    );
    this.initializeTimeoutMs = validateTimeout(
      options.initializeTimeoutMs ?? defaultInitializeTimeoutMs,
      'initializeTimeoutMs',
    );
    this.requestTimeoutMs = validateTimeout(
      options.requestTimeoutMs ?? defaultRequestTimeoutMs,
      'requestTimeoutMs',
    );
    this.reconnect = options.reconnect === true;
    this.reconnectMaxAttempts = validatePositiveInteger(
      options.reconnectMaxAttempts ?? defaultReconnectMaxAttempts,
      'reconnectMaxAttempts',
    );
    this.reconnectInitialDelayMs = validateNonNegativeNumber(
      options.reconnectInitialDelayMs ?? defaultReconnectInitialDelayMs,
      'reconnectInitialDelayMs',
    );
    this.#protocolLogger = createProtocolMessageLogger(options);
    this.#sessionPrefix = deterministicId(
      {
        url: this.url,
        parentPid: process.pid,
        createdAt: Date.now(),
      },
      { prefix: 'mcp-sse', length: 12 },
    );
  }

  get isConnected(): boolean {
    return (
      this.#sseAbortController != null &&
      this.#postEndpoint != null &&
      this.#fatalError == null &&
      !this.#disconnecting
    );
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

    if (this.#connectPromise != null) {
      await this.#connectPromise;
      return;
    }

    if (this.#reconnectPromise != null) {
      await this.#reconnectPromise;

      if (this.#fatalError != null) {
        throw this.#fatalError;
      }

      return;
    }

    this.#fatalError = undefined;
    this.#disconnecting = false;
    this.#connectPromise = this.#connectOnce();

    try {
      await this.#connectPromise;
    } finally {
      this.#connectPromise = undefined;
    }
  }

  async initialize(
    params?: Partial<McpInitializeParams>,
    options?: SseRequestOptions,
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
      throw new SseMalformedJsonRpcError('initialize result must be a JSON object');
    }

    this.#initializeResult = result;
    await this.notify('notifications/initialized');

    return result;
  }

  async request<T = JsonValue>(
    method: string,
    params?: JsonRpcParams,
    options?: SseRequestOptions,
  ): Promise<T> {
    this.#ensureConnected();
    validateMethod(method);

    const id = this.#nextRequestId();
    const timeoutMs = validateTimeout(options?.timeoutMs ?? this.requestTimeoutMs, 'timeoutMs');
    const message = createJsonRpcRequest(id, method, params);

    return await new Promise<T>((resolve, reject) => {
      const postAbortController = new AbortController();
      const timeout = setTimeout(() => {
        this.#pendingRequests.delete(id);
        this.#abandonedRequestIds.add(id);
        postAbortController.abort();
        reject(new SseRequestTimeoutError({ id, method, timeoutMs }));
      }, timeoutMs);

      const pending: PendingRequest = {
        id,
        method,
        resolve: (result) => {
          resolve(result as T);
        },
        reject,
        timeout,
        postAbortController,
      };

      this.#pendingRequests.set(id, pending);
      this.#sendMessage(message, postAbortController.signal).catch((error: unknown) => {
        this.#rejectPendingRequest(id, toError(error));
      });
    });
  }

  async notify(method: string, params?: JsonRpcParams): Promise<void> {
    this.#ensureConnected();
    validateMethod(method);

    const timeoutMs = this.requestTimeoutMs;
    const abortController = new AbortController();
    const timeout = setTimeout(() => {
      abortController.abort();
    }, timeoutMs);

    try {
      await this.#sendMessage(createJsonRpcNotification(method, params), abortController.signal);
    } catch (error) {
      if (abortController.signal.aborted) {
        throw new SseRequestTimeoutError({ method, timeoutMs });
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async listTools(options?: SseRequestOptions): Promise<McpListToolsResult> {
    return await this.request<McpListToolsResult>('tools/list', undefined, options);
  }

  async disconnect(): Promise<void> {
    this.#disconnecting = true;
    this.#fatalError = undefined;
    this.#initializeResult = undefined;
    this.#reconnectAbortController?.abort();
    this.#reconnectAbortController = undefined;
    this.#rejectEndpointWaiters(
      new SseDisconnectedClientError('MCP SSE client disconnected before endpoint discovery'),
    );
    this.#rejectAllPending(new SseDisconnectedClientError('MCP SSE client disconnected'));

    const streamPromise = this.#streamPromise;
    this.#abortCurrentStream();

    if (streamPromise != null) {
      await Promise.race([streamPromise, sleepFor(disconnectGraceMs)]).catch(() => undefined);
    }

    this.#disconnecting = false;
  }

  async #connectOnce(): Promise<void> {
    this.#postEndpoint = undefined;

    try {
      await this.#openSseStream();
      await this.#waitForEndpoint(this.connectTimeoutMs);
    } catch (error) {
      this.#abortCurrentStream();
      throw error;
    }
  }

  async #openSseStream(): Promise<void> {
    const abortController = new AbortController();
    const requestOptions = {
      method: 'GET',
      headers: createSseStreamHeaders(this.headers),
      signal: abortController.signal,
    };

    let response: Awaited<ReturnType<FetchLike>>;

    try {
      response = await this.#fetch(this.#sseUrl, requestOptions);
    } catch (error) {
      throw new SseConnectionFailureError({
        url: this.#sseUrl,
        reason: 'SSE GET request failed',
        cause: error,
      });
    }

    if (!response.ok) {
      throw new HttpNon2xxResponseError({
        url: this.#sseUrl,
        operation: 'SSE connect',
        status: response.status,
        statusText: response.statusText,
        bodyExcerpt: await readResponseText(response),
      });
    }

    if (response.body == null) {
      throw new SseConnectionFailureError({
        url: this.#sseUrl,
        reason: 'SSE response did not include a readable body',
      });
    }

    this.#sseAbortController = abortController;
    this.#streamPromise = this.#readSseStream(response.body, abortController);
  }

  async #readSseStream(
    stream: NonNullable<Awaited<ReturnType<FetchLike>>['body']>,
    abortController: AbortController,
  ): Promise<void> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    const parser = new SseParser();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        if (!this.#handleSseEvents(parser.push(decoder.decode(value, { stream: true })))) {
          return;
        }
      }

      if (!this.#handleSseEvents(parser.push(decoder.decode()))) {
        return;
      }

      if (!this.#handleSseEvents(parser.end())) {
        return;
      }

      this.#handleStreamFailure(
        new SseConnectionFailureError({
          url: this.#sseUrl,
          reason: 'SSE stream closed',
        }),
        abortController,
      );
    } catch (error) {
      if (this.#disconnecting || isAbortError(error)) {
        return;
      }

      if (error instanceof InvalidSseEventError) {
        this.#failProtocol(error);
        return;
      }

      this.#handleStreamFailure(
        error instanceof Error
          ? error
          : new SseConnectionFailureError({
              url: this.#sseUrl,
              reason: 'SSE stream failed with a non-error value',
              cause: error,
            }),
        abortController,
      );
    } finally {
      reader.releaseLock();
    }
  }

  #handleSseEvents(events: readonly SseEvent[]): boolean {
    for (const event of events) {
      if (!this.#handleSseEvent(event)) {
        return false;
      }
    }

    return true;
  }

  #handleSseEvent(event: SseEvent): boolean {
    if (event.event === 'endpoint') {
      this.#handleEndpointEvent(event);
      return this.#fatalError == null;
    }

    const message = this.#parseSseJsonRpc(event);

    if (message == null) {
      return false;
    }

    this.#protocolLogger.log(
      'inbound',
      message,
      createTransportLogMetadata({
        operation: 'SSE event',
        url: this.#sseUrl,
        event: event.event,
      }),
    );

    if (!isJsonRpcResponse(message)) {
      return true;
    }

    const pending = this.#pendingRequests.get(message.id);

    if (pending == null) {
      if (this.#abandonedRequestIds.has(message.id)) {
        this.#abandonedRequestIds.delete(message.id);
        return true;
      }

      this.#failProtocol(
        new SseMalformedJsonRpcError(
          `received response for unknown request id ${String(message.id)}`,
        ),
      );
      return false;
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
      return true;
    }

    pending.resolve(message.result);
    return true;
  }

  #handleEndpointEvent(event: SseEvent): void {
    const endpoint = event.data.trim();

    if (endpoint === '') {
      this.#failProtocol(
        new InvalidSseEventError('endpoint event data must be a non-empty URI', {
          url: this.#sseUrl,
          event: event.event,
          data: event.data,
        }),
      );
      return;
    }

    try {
      this.#postEndpoint = new URL(endpoint, this.#sseUrl);
    } catch (error) {
      this.#failProtocol(
        new InvalidSseEventError('endpoint event data must be an absolute or relative URI', {
          url: this.#sseUrl,
          event: event.event,
          data: event.data,
          cause: error,
        }),
      );
      return;
    }

    this.#resolveEndpointWaiters(this.#postEndpoint);
  }

  #parseSseJsonRpc(event: SseEvent): ReturnType<typeof parseJsonRpcLine> | undefined {
    try {
      return parseJsonRpcLine(event.data);
    } catch (error) {
      const reason = extractMalformedReason(error);
      this.#failProtocol(new SseMalformedJsonRpcError(reason, { data: event.data, cause: error }));
      return undefined;
    }
  }

  async #sendMessage(message: JsonRpcOutboundMessage, signal: AbortSignal): Promise<void> {
    const endpoint = this.#postEndpoint;

    if (endpoint == null) {
      throw new SseDisconnectedClientError('MCP SSE POST endpoint has not been discovered');
    }

    this.#protocolLogger.log(
      'outbound',
      message,
      createTransportLogMetadata({
        operation: 'HTTP POST',
        url: endpoint,
        headers: this.headers,
      }),
    );

    await postJsonRpcMessage({
      fetch: this.#fetch,
      url: endpoint,
      headers: this.headers,
      message,
      signal,
    });
  }

  #handleStreamFailure(error: Error, abortController: AbortController): void {
    if (this.#sseAbortController !== abortController || this.#disconnecting) {
      return;
    }

    this.#sseAbortController = undefined;
    this.#streamPromise = undefined;
    this.#postEndpoint = undefined;
    this.#rejectEndpointWaiters(error);
    this.#rejectAllPending(error);

    if (this.reconnect) {
      this.#beginReconnect();
      return;
    }

    this.#fatalError = error;
  }

  #failProtocol(error: Error): void {
    this.#fatalError = error;
    this.#rejectEndpointWaiters(error);
    this.#rejectAllPending(error);
    this.#abortCurrentStream();
  }

  #beginReconnect(): void {
    if (this.#reconnectPromise != null || this.#disconnecting) {
      return;
    }

    const abortController = new AbortController();
    this.#reconnectAbortController = abortController;
    this.#fatalError = undefined;
    this.#reconnectPromise = retry(
      async () => {
        if (this.#disconnecting || abortController.signal.aborted) {
          throw new SseDisconnectedClientError('MCP SSE reconnect was cancelled');
        }

        await this.#connectOnce();
      },
      {
        maxAttempts: this.reconnectMaxAttempts,
        initialDelayMs: this.reconnectInitialDelayMs,
        jitter: false,
        sleep: async (delayMs) => {
          await sleepFor(delayMs, undefined, { signal: abortController.signal });
        },
        shouldRetry: (error) => {
          return !this.#disconnecting && !abortController.signal.aborted && isReconnectable(error);
        },
      },
    )
      .catch((error: unknown) => {
        if (this.#disconnecting || abortController.signal.aborted) {
          return;
        }

        const finalError = isReconnectable(error)
          ? new SseReconnectExhaustedError({
              url: this.#sseUrl,
              attempts: this.reconnectMaxAttempts,
              cause: error,
            })
          : toError(error);
        this.#fatalError = finalError;
        this.#rejectEndpointWaiters(finalError);
        this.#rejectAllPending(finalError);
      })
      .finally(() => {
        const shouldRestartReconnect =
          !this.#disconnecting &&
          !abortController.signal.aborted &&
          this.reconnect &&
          this.#fatalError == null &&
          this.#sseAbortController == null;

        if (this.#reconnectAbortController === abortController) {
          this.#reconnectAbortController = undefined;
        }

        this.#reconnectPromise = undefined;

        if (shouldRestartReconnect) {
          this.#beginReconnect();
        }
      });
  }

  #waitForEndpoint(timeoutMs: number): Promise<URL> {
    if (this.#postEndpoint != null) {
      return Promise.resolve(this.#postEndpoint);
    }

    return awaitEndpoint(timeoutMs, this.#endpointWaiters, this.#sseUrl);
  }

  #resolveEndpointWaiters(endpoint: URL): void {
    const waiters = [...this.#endpointWaiters];
    this.#endpointWaiters.clear();

    for (const waiter of waiters) {
      clearTimeout(waiter.timeout);
      waiter.resolve(endpoint);
    }
  }

  #rejectEndpointWaiters(error: Error): void {
    const waiters = [...this.#endpointWaiters];
    this.#endpointWaiters.clear();

    for (const waiter of waiters) {
      clearTimeout(waiter.timeout);
      waiter.reject(error);
    }
  }

  #rejectPendingRequest(id: JsonRpcId, error: Error): void {
    const pending = this.#pendingRequests.get(id);

    if (pending == null) {
      return;
    }

    this.#pendingRequests.delete(id);
    clearTimeout(pending.timeout);
    pending.postAbortController.abort();
    pending.reject(error);
  }

  #rejectAllPending(error: Error): void {
    const pendingRequests = [...this.#pendingRequests.values()];
    this.#pendingRequests.clear();

    for (const pending of pendingRequests) {
      clearTimeout(pending.timeout);
      pending.postAbortController.abort();
      pending.reject(error);
    }
  }

  #abortCurrentStream(): void {
    this.#sseAbortController?.abort();
    this.#sseAbortController = undefined;
    this.#streamPromise = undefined;
    this.#postEndpoint = undefined;
  }

  #nextRequestId(): string {
    this.#requestCounter += 1;

    return `${this.#sessionPrefix}-${this.#requestCounter}`;
  }

  #ensureConnected(): void {
    if (this.#fatalError != null) {
      throw this.#fatalError;
    }

    if (!this.isConnected) {
      throw new SseDisconnectedClientError();
    }
  }
}

function normalizeUrl(url: string | URL): URL {
  try {
    return new URL(url);
  } catch (error) {
    throw new TypeError('url must be an absolute URL.', { cause: error });
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

function validatePositiveInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} must be an integer greater than or equal to 1.`);
  }

  return value;
}

function validateNonNegativeNumber(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite non-negative number.`);
  }

  return value;
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === 'object' && value != null && !Array.isArray(value);
}

function extractMalformedReason(error: unknown): string {
  if (error instanceof Error && 'context' in error) {
    const context = error.context;

    if (
      typeof context === 'object' &&
      context != null &&
      !Array.isArray(context) &&
      'reason' in context &&
      typeof context.reason === 'string'
    ) {
      return context.reason;
    }
  }

  return error instanceof Error ? error.message : 'unknown parser failure';
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error != null &&
    'name' in error &&
    (error as { readonly name?: unknown }).name === 'AbortError'
  );
}

function isReconnectable(error: unknown): boolean {
  return error instanceof SseConnectionFailureError || error instanceof HttpNon2xxResponseError;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

async function awaitEndpoint(
  timeoutMs: number,
  waiters: Set<EndpointWaiter>,
  url: URL,
): Promise<URL> {
  return await new Promise<URL>((resolve, reject) => {
    const timeout = setTimeout(() => {
      waiters.delete(waiter);
      reject(
        new InvalidSseEventError('endpoint event was not received before connect timeout', {
          url,
        }),
      );
    }, timeoutMs);

    const waiter: EndpointWaiter = {
      resolve,
      reject,
      timeout,
    };

    waiters.add(waiter);
  });
}

async function readResponseText(response: Awaited<ReturnType<FetchLike>>): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}
