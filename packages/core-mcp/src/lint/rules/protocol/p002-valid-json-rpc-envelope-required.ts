import type { JsonObject, JsonValue } from '@sherpa-labs/shared-types';

import type { LintProtocolMessage, LintRule, LintRuleViolationInput } from '../../types.js';
import { createViolation, getMessageMethod, isJsonObject, isJsonRpcId } from '../helpers.js';

export const P002_VALID_JSON_RPC_ENVELOPE_REQUIRED_RULE_ID = 'P002';

export const p002ValidJsonRpcEnvelopeRequiredRule: LintRule = {
  id: P002_VALID_JSON_RPC_ENVELOPE_REQUIRED_RULE_ID,
  category: 'protocol',
  severity: 'error',
  title: 'JSON-RPC envelopes are valid',
  description: 'Flags malformed JSON-RPC version, id, request, response, and error envelopes.',
  check(context) {
    const violations: LintRuleViolationInput[] = [];

    context.messages.forEach((entry, index) => {
      violations.push(...validateObservedMessage(entry, index));
    });

    return violations;
  },
};

function validateObservedMessage(
  entry: LintProtocolMessage,
  index: number,
): readonly LintRuleViolationInput[] {
  const violations: LintRuleViolationInput[] = [];
  const messagePath = `messages[${index}]`;

  if (entry.malformed === true) {
    violations.push(
      createViolation({
        message: entry.error ?? 'Observed protocol message was marked malformed.',
        location: messagePath,
        fixHint: 'Emit one valid JSON-RPC 2.0 object for each MCP protocol message.',
        ...(entry.raw !== undefined ? { evidence: entry.raw } : {}),
      }),
    );
  }

  if (entry.message === undefined) {
    return violations;
  }

  if (Array.isArray(entry.message)) {
    violations.push(
      createViolation({
        message: 'JSON-RPC batch arrays are not valid for modern MCP sessions.',
        location: messagePath,
        fixHint: 'Send each JSON-RPC request, response, or notification as a separate message.',
      }),
    );
    return violations;
  }

  if (!isJsonObject(entry.message)) {
    violations.push(
      createViolation({
        message: 'JSON-RPC message must be an object.',
        location: messagePath,
        fixHint: 'Serialize protocol messages as JSON objects with jsonrpc: "2.0".',
      }),
    );
    return violations;
  }

  if (entry.message.jsonrpc !== '2.0') {
    violations.push(
      createViolation({
        message: 'JSON-RPC message is missing jsonrpc: "2.0".',
        location: `${messagePath}.jsonrpc`,
        fixHint: 'Set jsonrpc to exactly "2.0" on every MCP protocol message.',
      }),
    );
  }

  if (getMessageMethod(entry.message) !== undefined) {
    validateRequestOrNotification(entry.message, messagePath, violations);
  } else {
    validateResponse(entry.message, messagePath, violations);
  }

  return violations;
}

function validateRequestOrNotification(
  message: JsonObject,
  path: string,
  violations: LintRuleViolationInput[],
): void {
  const method = message.method;

  if (typeof method !== 'string' || method.trim() === '') {
    violations.push(
      createViolation({
        message: 'JSON-RPC request or notification has an invalid method.',
        location: `${path}.method`,
        fixHint: 'Use a non-empty string method name for every request and notification.',
      }),
    );
  }

  if ('id' in message && !isJsonRpcId(message.id)) {
    violations.push(
      createViolation({
        message: 'JSON-RPC request id must be a non-null string or number.',
        location: `${path}.id`,
        fixHint: 'Use string or number IDs for requests and omit id entirely for notifications.',
      }),
    );
  }

  if ('params' in message && !isJsonRpcParams(message.params)) {
    violations.push(
      createViolation({
        message: 'JSON-RPC params must be an object or array when present.',
        location: `${path}.params`,
        fixHint: 'Encode params as a JSON object or array, or omit params when there are none.',
      }),
    );
  }
}

function validateResponse(
  message: JsonObject,
  path: string,
  violations: LintRuleViolationInput[],
): void {
  if (!isJsonRpcId(message.id)) {
    violations.push(
      createViolation({
        message: 'JSON-RPC response id must be a non-null string or number.',
        location: `${path}.id`,
        fixHint: 'Echo the original request id in every result or error response.',
      }),
    );
  }

  const hasResult = 'result' in message;
  const hasError = 'error' in message;

  if (hasResult === hasError) {
    violations.push(
      createViolation({
        message: 'JSON-RPC response must include exactly one of result or error.',
        location: path,
        fixHint: 'Return either result for success or error for failure, never both or neither.',
      }),
    );
  }

  if (hasError) {
    validateErrorObject(message.error, `${path}.error`, violations);
  }
}

function validateErrorObject(
  error: JsonValue | undefined,
  path: string,
  violations: LintRuleViolationInput[],
): void {
  if (!isJsonObject(error)) {
    violations.push(
      createViolation({
        message: 'JSON-RPC error must be an object.',
        location: path,
        fixHint: 'Return error with integer code and string message fields.',
      }),
    );
    return;
  }

  if (typeof error.code !== 'number' || !Number.isInteger(error.code)) {
    violations.push(
      createViolation({
        message: 'JSON-RPC error code must be an integer.',
        location: `${path}.code`,
        fixHint: 'Use standard JSON-RPC integer error codes such as -32601 for unknown methods.',
      }),
    );
  }

  if (typeof error.message !== 'string') {
    violations.push(
      createViolation({
        message: 'JSON-RPC error message must be a string.',
        location: `${path}.message`,
        fixHint: 'Include a human-readable error.message string in every JSON-RPC error.',
      }),
    );
  }
}

function isJsonRpcParams(value: JsonValue | undefined): boolean {
  return Array.isArray(value) || isJsonObject(value);
}
