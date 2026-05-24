import type { Logger } from '@sherpa-labs/core-utils/logger';
import type { JsonObject, McpToolInfo } from '@sherpa-labs/shared-types';

import type { JsonRpcParams } from './json-rpc.js';
import type { ProtocolLogEntry } from './message-log.js';

export const defaultMcpProtocolVersion = '2025-11-25';
export const defaultInitializeTimeoutMs = 5_000;
export const defaultRequestTimeoutMs = 10_000;

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

export interface StdioRequestOptions {
  readonly timeoutMs?: number;
}

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
