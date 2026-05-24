import { Buffer } from 'node:buffer';

import type { JsonObject, JsonValue } from '@sherpa-labs/shared-types';

import type {
  LintContext,
  LintMethodObservation,
  LintRuleViolationInput,
  LintToolCallObservation,
} from '../types.js';

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isJsonArray(value: unknown): value is readonly JsonValue[] {
  return Array.isArray(value);
}

export function jsonObjectEntries(value: JsonObject): readonly (readonly [string, JsonValue])[] {
  return Object.entries(value);
}

export function getStringProperty(value: JsonValue | undefined, key: string): string | undefined {
  if (!isJsonObject(value)) {
    return undefined;
  }

  const child = value[key];

  return typeof child === 'string' ? child : undefined;
}

export function getNumberProperty(value: JsonValue | undefined, key: string): number | undefined {
  if (!isJsonObject(value)) {
    return undefined;
  }

  const child = value[key];

  return typeof child === 'number' && Number.isFinite(child) ? child : undefined;
}

export function getJsonObjectProperty(
  value: JsonValue | undefined,
  key: string,
): JsonObject | undefined {
  if (!isJsonObject(value)) {
    return undefined;
  }

  const child = value[key];

  return isJsonObject(child) ? child : undefined;
}

export function getJsonArrayProperty(
  value: JsonValue | undefined,
  key: string,
): readonly JsonValue[] | undefined {
  if (!isJsonObject(value)) {
    return undefined;
  }

  const child = value[key];

  return Array.isArray(child) ? child : undefined;
}

export function getMessageMethod(message: JsonValue | undefined): string | undefined {
  return getStringProperty(message, 'method');
}

export function getMessageId(message: JsonValue | undefined): string | number | null | undefined {
  if (!isJsonObject(message) || !('id' in message)) {
    return undefined;
  }

  const id = message.id;

  return typeof id === 'string' || typeof id === 'number' || id === null ? id : undefined;
}

export function isJsonRpcId(value: JsonValue | undefined): value is string | number {
  return typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value));
}

export function hasCapability(context: LintContext, name: string): boolean {
  const value = context.capabilities[name];

  return value !== undefined && value !== null && value !== false;
}

export function methodFailed(context: LintContext, method: string): boolean {
  return (
    context.errors.some((error) => error.method === method) ||
    getMethodObservation(context, method)?.ok === false
  );
}

export function getMethodObservation(
  context: LintContext,
  method: string,
): LintMethodObservation | undefined {
  const observations = context.metadata.methodObservations ?? [];

  return observations.find((observation) => observation.method === method);
}

export function getRuleThreshold(
  context: LintContext,
  ruleId: string,
  key: string,
  defaultValue: number,
): number {
  const overrideThreshold = context.config.ruleOverrides[ruleId]?.thresholds?.[key];
  const globalThreshold = context.thresholds[key];
  const threshold = overrideThreshold ?? globalThreshold ?? defaultValue;

  return Number.isFinite(threshold) ? threshold : defaultValue;
}

export function jsonByteLength(value: JsonValue): number {
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

export function createViolation(input: LintRuleViolationInput): LintRuleViolationInput {
  return input;
}

export function getStructuredContent(call: LintToolCallObservation): JsonValue | undefined {
  if (call.structuredContent !== undefined) {
    return call.structuredContent;
  }

  return isJsonObject(call.result) ? call.result.structuredContent : undefined;
}

export function getResultContent(call: LintToolCallObservation): JsonValue | undefined {
  if (call.content !== undefined) {
    return call.content;
  }

  return isJsonObject(call.result) ? call.result.content : undefined;
}

export function truncateEvidence(value: string, maxLength = 160): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
}

export function location(path: string): string {
  return path;
}

export function normalizeContentType(value: string): string {
  return value.split(';', 1)[0]?.trim().toLowerCase() ?? '';
}
