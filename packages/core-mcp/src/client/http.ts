import type { JsonObject } from '@sherpa-labs/shared-types';

import { HttpNon2xxResponseError, HttpPostFailureError, redactUrlForContext } from './errors.js';
import type { JsonRpcOutboundMessage } from './json-rpc.js';
import type { FetchLike, FetchRequestOptions, FetchResponseLike } from './types.js';

export interface PostJsonRpcMessageOptions {
  readonly fetch: FetchLike;
  readonly url: URL;
  readonly headers?: Readonly<Record<string, string>>;
  readonly message: JsonRpcOutboundMessage;
  readonly signal?: AbortSignal;
}

export function createSseStreamHeaders(
  headers: Readonly<Record<string, string>> | undefined,
): Record<string, string> {
  return mergeHeaders(
    {
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
    headers,
  );
}

export function createJsonRpcPostHeaders(
  headers: Readonly<Record<string, string>> | undefined,
): Record<string, string> {
  return mergeHeaders(
    {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
    },
    headers,
  );
}

export async function postJsonRpcMessage(options: PostJsonRpcMessageOptions): Promise<void> {
  const method = options.message.method;
  const id = 'id' in options.message ? options.message.id : undefined;
  const requestOptions: FetchRequestOptions = {
    method: 'POST',
    headers: createJsonRpcPostHeaders(options.headers),
    body: JSON.stringify(options.message),
  };

  if (options.signal != null) {
    Object.assign(requestOptions, { signal: options.signal });
  }

  let response: FetchResponseLike;

  try {
    response = await options.fetch(options.url, requestOptions);
  } catch (error) {
    const errorOptions: ConstructorParameters<typeof HttpPostFailureError>[0] = {
      url: options.url,
      method,
      cause: error,
    };

    if (id != null) {
      Object.assign(errorOptions, { id });
    }

    throw new HttpPostFailureError(errorOptions);
  }

  if (!response.ok) {
    const errorOptions: ConstructorParameters<typeof HttpNon2xxResponseError>[0] = {
      url: options.url,
      operation: 'POST',
      status: response.status,
      statusText: response.statusText,
      bodyExcerpt: await readErrorBodyExcerpt(response),
      method,
    };

    if (id != null) {
      Object.assign(errorOptions, { id });
    }

    throw new HttpNon2xxResponseError(errorOptions);
  }
}

export function createTransportLogMetadata(options: {
  readonly operation: string;
  readonly url: string | URL;
  readonly headers?: Readonly<Record<string, string>>;
  readonly event?: string;
}): JsonObject {
  const metadata: Record<string, string | JsonObject> = {
    transport: 'sse',
    operation: options.operation,
    url: redactUrlForContext(options.url),
  };

  if (options.headers != null) {
    metadata.headers = redactHeadersForContext(options.headers);
  }

  if (options.event != null) {
    metadata.event = options.event;
  }

  return metadata;
}

function mergeHeaders(
  defaults: Readonly<Record<string, string>>,
  overrides: Readonly<Record<string, string>> | undefined,
): Record<string, string> {
  const merged = new Map<string, { readonly name: string; readonly value: string }>();

  for (const [name, value] of Object.entries(defaults)) {
    merged.set(name.toLowerCase(), { name, value });
  }

  for (const [name, value] of Object.entries(overrides ?? {})) {
    merged.set(name.toLowerCase(), { name, value });
  }

  return Object.fromEntries([...merged.values()].map(({ name, value }) => [name, value]));
}

function redactHeadersForContext(headers: Readonly<Record<string, string>>): JsonObject {
  const redacted: Record<string, string> = {};

  for (const [name, value] of Object.entries(headers)) {
    redacted[name] = isSensitiveHeader(name) ? '[REDACTED]' : value;
  }

  return redacted;
}

function isSensitiveHeader(name: string): boolean {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');

  return (
    normalized.includes('authorization') ||
    normalized.includes('cookie') ||
    normalized.includes('token') ||
    normalized.includes('apikey') ||
    normalized.includes('password') ||
    normalized.includes('secret')
  );
}

async function readErrorBodyExcerpt(response: FetchResponseLike): Promise<string> {
  try {
    const body = await response.text();

    return body.length <= 200 ? body : `${body.slice(0, 200)}...`;
  } catch {
    return '';
  }
}
