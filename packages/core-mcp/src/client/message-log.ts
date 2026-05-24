import { createLogger, type LogValue, type Logger } from '@sherpa-labs/core-utils/logger';
import type { JsonObject, JsonValue } from '@sherpa-labs/shared-types';

import type { JsonRpcInboundMessage, JsonRpcOutboundMessage } from './json-rpc.js';

export type ProtocolMessageDirection = 'inbound' | 'outbound';

export interface ProtocolLogEntry {
  readonly direction: ProtocolMessageDirection;
  readonly id?: string | number;
  readonly method?: string;
  readonly message: LogValue;
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
    log: (direction, message) => {
      if (!verbose) {
        return;
      }

      const entry = createProtocolLogEntry(direction, message);
      options.onProtocolMessage?.(entry);
      logger?.debug('mcp protocol message', {
        direction: entry.direction,
        id: entry.id ?? null,
        method: entry.method ?? null,
        message: entry.message,
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
): ProtocolLogEntry {
  const redactedMessage = redactJsonValue(message as unknown as JsonObject);
  const id = 'id' in message ? message.id : undefined;
  const method = 'method' in message ? message.method : undefined;

  const entry: {
    direction: ProtocolMessageDirection;
    message: LogValue;
    id?: string | number;
    method?: string;
  } = {
    direction,
    message: redactedMessage,
  };

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
    normalized.includes('password') ||
    normalized.includes('secret')
  );
}
