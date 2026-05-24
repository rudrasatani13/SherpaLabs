import type { JsonValue } from '@sherpa-labs/shared-types';

import type { LintRule, LintRuleViolationInput, LintToolCallObservation } from '../../types.js';
import { createViolation, getStructuredContent, isJsonObject } from '../helpers.js';
import { validateJsonValueAgainstSchema } from './schema-utils.js';

export const S005_TOOL_OUTPUT_SCHEMA_HONORED_RULE_ID = 'S005';

export const s005ToolOutputSchemaHonoredRule: LintRule = {
  id: S005_TOOL_OUTPUT_SCHEMA_HONORED_RULE_ID,
  category: 'schema',
  severity: 'warning',
  title: 'Tool output schema is honored',
  description: 'Checks sampled safe structuredContent against declared outputSchema.',
  check(context) {
    const violations: LintRuleViolationInput[] = [];

    context.tools.forEach((tool, toolIndex) => {
      if (!isJsonObject(tool.outputSchema)) {
        return;
      }

      const outputSchema = tool.outputSchema;

      (tool.calls ?? []).forEach((call, callIndex) => {
        if (call.safe === false || call.isError === true) {
          return;
        }

        violations.push(
          ...validateCall(outputSchema, call, `tools[${toolIndex}].calls[${callIndex}]`),
        );
      });
    });

    return violations;
  },
};

function validateCall(
  outputSchema: JsonValue,
  call: LintToolCallObservation,
  path: string,
): readonly LintRuleViolationInput[] {
  const structuredContent = getStructuredContent(call);

  if (structuredContent === undefined) {
    return [
      createViolation({
        message: 'Tool declares outputSchema but sampled call did not return structuredContent.',
        location: `${path}.structuredContent`,
        fixHint:
          'Return structuredContent that conforms to the declared outputSchema for successful calls.',
      }),
    ];
  }

  return validateJsonValueAgainstSchema(
    structuredContent,
    outputSchema,
    `${path}.structuredContent`,
  ).map((issue) =>
    createViolation({
      message: issue.message,
      location: issue.path,
      fixHint:
        'Align successful structuredContent with the tool outputSchema or update the schema.',
    }),
  );
}
