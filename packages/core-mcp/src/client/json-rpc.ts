import type { JsonArray, JsonObject, JsonValue } from '@sherpa-labs/shared-types';

import { MalformedJsonRpcError } from './errors.js';

export const jsonRpcVersion = '2.0';

export type JsonRpcId = string | number;
export type JsonRpcParams = JsonObject | JsonArray;

export interface JsonRpcRequest {
  readonly jsonrpc: typeof jsonRpcVersion;
  readonly id: JsonRpcId;
  readonly method: string;
  readonly params?: JsonRpcParams;
}

export interface JsonRpcNotification {
  readonly jsonrpc: typeof jsonRpcVersion;
  readonly method: string;
  readonly params?: JsonRpcParams;
}

export interface JsonRpcErrorObject {
  readonly code: number;
  readonly message: string;
  readonly data?: JsonValue;
}

export interface JsonRpcSuccessResponse {
  readonly jsonrpc: typeof jsonRpcVersion;
  readonly id: JsonRpcId;
  readonly result: JsonValue;
}

export interface JsonRpcErrorResponse {
  readonly jsonrpc: typeof jsonRpcVersion;
  readonly id: JsonRpcId;
  readonly error: JsonRpcErrorObject;
}

export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;
export type JsonRpcInboundMessage = JsonRpcRequest | JsonRpcNotification | JsonRpcResponse;
export type JsonRpcOutboundMessage = JsonRpcRequest | JsonRpcNotification;

export function createJsonRpcRequest(
  id: JsonRpcId,
  method: string,
  params?: JsonRpcParams,
): JsonRpcRequest {
  return params == null
    ? { jsonrpc: jsonRpcVersion, id, method }
    : { jsonrpc: jsonRpcVersion, id, method, params };
}

export function createJsonRpcNotification(
  method: string,
  params?: JsonRpcParams,
): JsonRpcNotification {
  return params == null
    ? { jsonrpc: jsonRpcVersion, method }
    : { jsonrpc: jsonRpcVersion, method, params };
}

export function parseJsonRpcLine(line: string): JsonRpcInboundMessage {
  let parsed: unknown;

  try {
    parsed = JSON.parse(line);
  } catch (error) {
    throw new MalformedJsonRpcError('stdout line is not valid JSON', { line, cause: error });
  }

  if (!isJsonObjectRecord(parsed)) {
    throw new MalformedJsonRpcError('stdout line is not a JSON-RPC object', { line });
  }

  if (parsed.jsonrpc !== jsonRpcVersion) {
    throw new MalformedJsonRpcError('JSON-RPC message is missing jsonrpc: "2.0"', { line });
  }

  if ('method' in parsed) {
    return parseRequestOrNotification(parsed, line);
  }

  return parseResponse(parsed, line);
}

export function isJsonRpcResponse(message: JsonRpcInboundMessage): message is JsonRpcResponse {
  return 'id' in message && ('result' in message || 'error' in message) && !('method' in message);
}

function parseRequestOrNotification(
  message: Record<string, unknown>,
  line: string,
): JsonRpcRequest | JsonRpcNotification {
  if (typeof message.method !== 'string' || message.method.length === 0) {
    throw new MalformedJsonRpcError('JSON-RPC request/notification has invalid method', { line });
  }

  const params = parseParams(message, line);

  if ('id' in message) {
    if (!isJsonRpcId(message.id)) {
      throw new MalformedJsonRpcError('JSON-RPC request has invalid id', { line });
    }

    return params == null
      ? { jsonrpc: jsonRpcVersion, id: message.id, method: message.method }
      : { jsonrpc: jsonRpcVersion, id: message.id, method: message.method, params };
  }

  return params == null
    ? { jsonrpc: jsonRpcVersion, method: message.method }
    : { jsonrpc: jsonRpcVersion, method: message.method, params };
}

function parseResponse(message: Record<string, unknown>, line: string): JsonRpcResponse {
  if (!isJsonRpcId(message.id)) {
    throw new MalformedJsonRpcError('JSON-RPC response has invalid id', { line });
  }

  const hasResult = 'result' in message;
  const hasError = 'error' in message;

  if (hasResult === hasError) {
    throw new MalformedJsonRpcError(
      'JSON-RPC response must include exactly one of result or error',
      {
        line,
      },
    );
  }

  if (hasError) {
    return {
      jsonrpc: jsonRpcVersion,
      id: message.id,
      error: parseErrorObject(message.error, line),
    };
  }

  return { jsonrpc: jsonRpcVersion, id: message.id, result: toJsonValue(message.result) };
}

function parseErrorObject(error: unknown, line: string): JsonRpcErrorObject {
  if (!isJsonObjectRecord(error)) {
    throw new MalformedJsonRpcError('JSON-RPC error response has invalid error object', { line });
  }

  const code = error.code;
  const message = error.message;

  if (typeof code !== 'number' || !Number.isInteger(code) || typeof message !== 'string') {
    throw new MalformedJsonRpcError('JSON-RPC error object has invalid code or message', { line });
  }

  return 'data' in error ? { code, message, data: toJsonValue(error.data) } : { code, message };
}

function parseParams(message: Record<string, unknown>, line: string): JsonRpcParams | undefined {
  if (!('params' in message)) {
    return undefined;
  }

  if (!isJsonRpcParams(message.params)) {
    throw new MalformedJsonRpcError('JSON-RPC params must be an object or array', { line });
  }

  return message.params;
}

function isJsonRpcParams(value: unknown): value is JsonRpcParams {
  return Array.isArray(value) || isJsonObjectRecord(value);
}

function isJsonRpcId(value: unknown): value is JsonRpcId {
  return typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value));
}

function toJsonValue(value: unknown): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (Number.isFinite(value)) {
      return value;
    }

    throw new MalformedJsonRpcError('JSON-RPC message contains a non-finite number');
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item));
  }

  if (isJsonObjectRecord(value)) {
    const result: Record<string, JsonValue> = {};

    for (const [key, childValue] of Object.entries(value)) {
      result[key] = toJsonValue(childValue);
    }

    return result;
  }

  throw new MalformedJsonRpcError('JSON-RPC message contains a non-JSON value');
}

function isJsonObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value);
}
