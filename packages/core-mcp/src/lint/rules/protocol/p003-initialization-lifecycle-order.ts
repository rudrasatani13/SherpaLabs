import type { LintProtocolMessage, LintRule, LintRuleViolationInput } from '../../types.js';
import { createViolation, getMessageId, getMessageMethod } from '../helpers.js';

export const P003_INITIALIZATION_LIFECYCLE_ORDER_RULE_ID = 'P003';

export const p003InitializationLifecycleOrderRule: LintRule = {
  id: P003_INITIALIZATION_LIFECYCLE_ORDER_RULE_ID,
  category: 'protocol',
  severity: 'error',
  title: 'Initialization lifecycle order is valid',
  description:
    'Flags normal protocol traffic before initialize and notifications/initialized complete.',
  check(context) {
    const violations: LintRuleViolationInput[] = [];
    const initializeRequest = findClientMethod(context.messages, 'initialize');
    const initializeResponseIndex = findInitializeResponseIndex(
      context.messages,
      initializeRequest?.id,
    );
    const initializedNotificationIndex = findClientMethodIndex(
      context.messages,
      'notifications/initialized',
    );

    if (
      context.initialize?.completed === true &&
      context.initialize.initializedNotificationSent !== true &&
      initializedNotificationIndex === -1
    ) {
      violations.push(
        createViolation({
          message: 'initialize completed but notifications/initialized was not observed.',
          location: 'messages',
          fixHint:
            'Send notifications/initialized immediately after a successful initialize result.',
        }),
      );
    }

    context.messages.forEach((entry, index) => {
      const method = getMessageMethod(entry.message);

      if (method === undefined) {
        return;
      }

      if (entry.direction === 'client-to-server' && index < initializeResponseIndex) {
        if (method !== 'initialize' && method !== 'ping') {
          violations.push(
            createViolation({
              message: `${method} was sent before initialize completed.`,
              location: `messages[${index}].method`,
              fixHint: 'Only send initialize or ping before the server returns InitializeResult.',
            }),
          );
        }
      }

      if (
        entry.direction === 'server-to-client' &&
        index < initializedBoundary(initializedNotificationIndex)
      ) {
        if (method !== 'ping' && method !== 'notifications/message') {
          violations.push(
            createViolation({
              message: `Server sent ${method} before notifications/initialized was observed.`,
              location: `messages[${index}].method`,
              fixHint:
                'Do not send server-initiated requests until the client sends notifications/initialized.',
            }),
          );
        }
      }
    });

    return violations;
  },
};

interface MethodPosition {
  readonly index: number;
  readonly id?: string | number | null;
}

function findClientMethod(
  messages: readonly LintProtocolMessage[],
  method: string,
): MethodPosition | undefined {
  const index = findClientMethodIndex(messages, method);

  if (index === -1) {
    return undefined;
  }

  const id = getMessageId(messages[index]?.message);

  return id === undefined ? { index } : { index, id };
}

function findClientMethodIndex(messages: readonly LintProtocolMessage[], method: string): number {
  return messages.findIndex(
    (entry) => entry.direction === 'client-to-server' && getMessageMethod(entry.message) === method,
  );
}

function findInitializeResponseIndex(
  messages: readonly LintProtocolMessage[],
  initializeId: string | number | null | undefined,
): number {
  const index = messages.findIndex((entry) => {
    if (entry.direction !== 'server-to-client' || getMessageMethod(entry.message) !== undefined) {
      return false;
    }

    if (initializeId === undefined || initializeId === null) {
      return true;
    }

    return getMessageId(entry.message) === initializeId;
  });

  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function initializedBoundary(initializedNotificationIndex: number): number {
  return initializedNotificationIndex === -1
    ? Number.MAX_SAFE_INTEGER
    : initializedNotificationIndex;
}
