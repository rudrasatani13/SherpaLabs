import type { Logger } from '@sherpa-labs/core-utils/logger';
import type { JsonObject, McpToolInfo } from '@sherpa-labs/shared-types';
import type { ReadableStream } from 'node:stream/web';

import type { JsonRpcParams } from './json-rpc.js';
import type { ProtocolLogEntry } from './message-log.js';

export const defaultMcpProtocolVersion = '2025-11-25';
export const defaultConnectTimeoutMs = 5_000;
export const defaultInitializeTimeoutMs = 5_000;
export const defaultRequestTimeoutMs = 10_000;
export const defaultReconnectMaxAttempts = 3;
export const defaultReconnectInitialDelayMs = 100;

export interface FetchResponseHeadersLike {
  get(name: string): string | null;
}

export interface FetchResponseLike {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  readonly headers: FetchResponseHeadersLike;
  readonly body: ReadableStream<Uint8Array> | null;
  text(): Promise<string>;
}

export interface FetchRequestOptions {
  readonly method?: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: string;
  readonly signal?: AbortSignal;
}

export type FetchLike = (
  input: string | URL,
  init?: FetchRequestOptions,
) => Promise<FetchResponseLike>;

export interface McpRequestOptions {
  readonly timeoutMs?: number;
}

export interface StdioClientOptions {
  readonly command: string;
  readonly args?: readonly string[];
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly initializeTimeoutMs?: number;
  readonly requestTimeoutMs?: number;
  readonly verbose?: boolean;
  readonly logger?: Logger;
  readonly onProtocolMessage?: (entry: ProtocolLogEntry) => void;
}

export type StdioRequestOptions = McpRequestOptions;

export interface SseClientOptions {
  readonly url: string | URL;
  readonly headers?: Readonly<Record<string, string>>;
  readonly fetch?: FetchLike;
  readonly connectTimeoutMs?: number;
  readonly initializeTimeoutMs?: number;
  readonly requestTimeoutMs?: number;
  readonly reconnect?: boolean;
  readonly reconnectMaxAttempts?: number;
  readonly reconnectInitialDelayMs?: number;
  readonly verbose?: boolean;
  readonly logger?: Logger;
  readonly onProtocolMessage?: (entry: ProtocolLogEntry) => void;
}

export type SseRequestOptions = McpRequestOptions;

export interface McpImplementationInfo extends JsonObject {
  readonly name: string;
  readonly version?: string;
  readonly title?: string;
}

export interface McpInitializeParams extends JsonObject {
  readonly protocolVersion: string;
  readonly capabilities: JsonObject;
  readonly clientInfo: McpImplementationInfo;
}

export interface McpInitializeResult extends JsonObject {
  readonly protocolVersion?: string;
  readonly capabilities?: JsonObject;
  readonly serverInfo?: JsonObject;
  readonly instructions?: string;
}

export interface McpListToolsResult {
  readonly tools: readonly McpToolInfo[];
  readonly nextCursor?: string;
}

export type McpRequestParams = JsonRpcParams;
