import type { LintRule, LintRuleViolationInput } from '../../types.js';
import {
  createViolation,
  getJsonObjectProperty,
  getStringProperty,
  isJsonObject,
} from '../helpers.js';

export const P001_INITIALIZATION_RESPONSE_REQUIRED_RULE_ID = 'P001';

export const p001InitializationResponseRequiredRule: LintRule = {
  id: P001_INITIALIZATION_RESPONSE_REQUIRED_RULE_ID,
  category: 'protocol',
  severity: 'error',
  title: 'Initialization response is complete',
  description:
    'Requires initialize to complete with protocolVersion, capabilities, and serverInfo.',
  check(context) {
    const violations: LintRuleViolationInput[] = [];
    const initialize = context.initialize;

    if (initialize === undefined) {
      return [
        createViolation({
          message: 'No initialize observation was captured.',
          location: 'initialize',
          fixHint:
            'Capture and return a JSON-RPC initialize response before running MCP lint rules.',
        }),
      ];
    }

    if (initialize.completed === false || initialize.error !== undefined) {
      violations.push(
        createViolation({
          message: `initialize did not complete successfully${
            initialize.error?.message !== undefined ? `: ${initialize.error.message}` : ''
          }.`,
          location: initialize.error?.location ?? 'initialize',
          fixHint: 'Ensure the server responds to initialize within the client timeout.',
        }),
      );
    }

    const result = initialize.result ?? getJsonObjectProperty(initialize.response, 'result');

    if (!isJsonObject(result)) {
      violations.push(
        createViolation({
          message: 'initialize response result must be a JSON object.',
          location: 'initialize.result',
          fixHint:
            'Return InitializeResult as an object with protocolVersion, capabilities, and serverInfo.',
        }),
      );
      return violations;
    }

    if (getStringProperty(result, 'protocolVersion') === undefined) {
      violations.push(
        createViolation({
          message: 'initialize result is missing protocolVersion.',
          location: 'initialize.result.protocolVersion',
          fixHint:
            'Include the negotiated MCP protocol version in initialize.result.protocolVersion.',
        }),
      );
    }

    if (!isJsonObject(result.capabilities)) {
      violations.push(
        createViolation({
          message: 'initialize result is missing capabilities.',
          location: 'initialize.result.capabilities',
          fixHint:
            'Return a capabilities object, even when no optional capabilities are supported.',
        }),
      );
    }

    const serverInfo = getJsonObjectProperty(result, 'serverInfo');
    if (serverInfo === undefined) {
      violations.push(
        createViolation({
          message: 'initialize result is missing serverInfo.',
          location: 'initialize.result.serverInfo',
          fixHint: 'Return serverInfo with at least a stable name and version.',
        }),
      );
    }

    return violations;
  },
};
