import { createLogger, type LogValue, type Logger } from '@sherpa-labs/core-utils/logger';
import type { JsonObject, JsonValue } from '@sherpa-labs/shared-types';

import type { JsonRpcInboundMessage, JsonRpcOutboundMessage } from './json-rpc.js';

export type ProtocolMessageDirection = 'inbound' | 'outbound';

export interface ProtocolLogEntry {
  readonly direction: ProtocolMessageDirection;
  readonly id?: string | number;
  readonly method?: string;
  readonly message: LogValue;
  readonly transport?: LogValue;
}

export interface ProtocolMessageLoggerOptions {
  readonly verbose?: boolean;
  readonly logger?: Logger;
  readonly onProtocolMessage?: (entry: ProtocolLogEntry) => void;
}

export interface ProtocolMessageLogger {
  log(
    direction: ProtocolMessageDirection,
    message: JsonRpcInboundMessage | JsonRpcOutboundMessage,
    transport?: JsonObject,
  ): void;
}

export function createProtocolMessageLogger(
  options: ProtocolMessageLoggerOptions,
): ProtocolMessageLogger {
  const verbose = options.verbose === true;
  const logger =
    options.logger ??
    (verbose && options.onProtocolMessage == null ? createLogger({ level: 'debug' }) : undefined);

  return {
    log: (direction, message, transport) => {
      if (!verbose) {
        return;
      }

      const entry = createProtocolLogEntry(direction, message, transport);
      options.onProtocolMessage?.(entry);
      logger?.debug('mcp protocol message', {
        direction: entry.direction,
        id: entry.id ?? null,
        method: entry.method ?? null,
        message: entry.message,
        transport: entry.transport ?? null,
      });
    },
  };
}

export function redactJsonValue(value: JsonValue): LogValue {
  if (
    value == null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    const arrayValue = value as readonly JsonValue[];

    return arrayValue.map((item) => redactJsonValue(item));
  }

  const redacted: Record<string, LogValue> = {};

  for (const [key, childValue] of Object.entries(value)) {
    redacted[key] = isSecretField(key) ? '[REDACTED]' : redactJsonValue(childValue);
  }

  return redacted;
}

function createProtocolLogEntry(
  direction: ProtocolMessageDirection,
  message: JsonRpcInboundMessage | JsonRpcOutboundMessage,
  transport: JsonObject | undefined,
): ProtocolLogEntry {
  const redactedMessage = redactJsonValue(message as unknown as JsonObject);
  const id = 'id' in message ? message.id : undefined;
  const method = 'method' in message ? message.method : undefined;

  const entry: {
    direction: ProtocolMessageDirection;
    message: LogValue;
    id?: string | number;
    method?: string;
    transport?: LogValue;
  } = {
    direction,
    message: redactedMessage,
  };

  if (transport != null) {
    entry.transport = redactJsonValue(transport);
  }

  if (id != null) {
    entry.id = id;
  }

  if (method != null) {
    entry.method = method;
  }

  return entry;
}

function isSecretField(key: string): boolean {
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
