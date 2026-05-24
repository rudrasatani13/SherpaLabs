import type { JsonValue } from '@sherpa-labs/shared-types';

import type { JsonRpcParams } from './json-rpc.js';
import type {
  McpInitializeParams,
  McpInitializeResult,
  McpListToolsResult,
  McpRequestOptions,
} from './types.js';

export interface McpClient<TRequestOptions extends McpRequestOptions = McpRequestOptions> {
  readonly isConnected: boolean;

  connect(): Promise<void>;

  initialize(
    params?: Partial<McpInitializeParams>,
    options?: TRequestOptions,
  ): Promise<McpInitializeResult>;

  request<T = JsonValue>(
    method: string,
    params?: JsonRpcParams,
    options?: TRequestOptions,
  ): Promise<T>;

  notify(method: string, params?: JsonRpcParams): Promise<void>;

  disconnect(): Promise<void>;

  listTools?(options?: TRequestOptions): Promise<McpListToolsResult>;
}
