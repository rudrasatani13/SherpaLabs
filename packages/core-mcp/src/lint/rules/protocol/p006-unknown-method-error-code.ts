import type { LintMethodObservation, LintRule } from '../../types.js';
import { createViolation, getMethodObservation } from '../helpers.js';

export const P006_UNKNOWN_METHOD_ERROR_CODE_RULE_ID = 'P006';

export const p006UnknownMethodErrorCodeRule: LintRule = {
  id: P006_UNKNOWN_METHOD_ERROR_CODE_RULE_ID,
  category: 'protocol',
  severity: 'warning',
  title: 'Unknown methods return method-not-found',
  description: 'Requires the unknown-method probe to return JSON-RPC -32601.',
  check(context) {
    const observation =
      context.metadata.unknownMethod ??
      getMethodObservation(context, 'sherpa/unknownMethod') ??
      findUnknownMethodObservation(context.metadata.methodObservations ?? []);

    if (observation === undefined) {
      return [
        createViolation({
          message: 'Unknown method probe was not captured.',
          location: 'metadata.unknownMethod',
          fixHint: 'Capture a deterministic unknown-method probe and verify it returns -32601.',
        }),
      ];
    }

    if (observation.ok) {
      return [
        createViolation({
          message: `Unknown method ${observation.method} returned success.`,
          location: 'metadata.unknownMethod',
          fixHint: 'Return a JSON-RPC error with code -32601 for unsupported methods.',
        }),
      ];
    }

    if (observation.errorCode !== -32601) {
      return [
        createViolation({
          message: `Unknown method ${observation.method} returned ${String(
            observation.errorCode,
          )} instead of -32601.`,
          location: 'metadata.unknownMethod.errorCode',
          fixHint: 'Use JSON-RPC code -32601 for method-not-found responses.',
        }),
      ];
    }

    return [];
  },
};

function findUnknownMethodObservation(
  observations: readonly LintMethodObservation[],
): LintMethodObservation | undefined {
  return observations.find((observation) => observation.method.toLowerCase().includes('unknown'));
}
