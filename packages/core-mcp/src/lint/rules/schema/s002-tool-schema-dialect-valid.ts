import type { JsonValue } from '@sherpa-labs/shared-types';

import type { LintRule, LintRuleViolationInput } from '../../types.js';
import { createViolation, isJsonObject } from '../helpers.js';
import { validateSchemaShape } from './schema-utils.js';

export const S002_TOOL_SCHEMA_DIALECT_VALID_RULE_ID = 'S002';

export const s002ToolSchemaDialectValidRule: LintRule = {
  id: S002_TOOL_SCHEMA_DIALECT_VALID_RULE_ID,
  category: 'schema',
  severity: 'error',
  title: 'Tool schemas use a supported dialect',
  description: 'Validates input and output schema structure for supported JSON Schema dialects.',
  check(context) {
    const violations: LintRuleViolationInput[] = [];

    context.tools.forEach((tool, index) => {
      if (isJsonObject(tool.inputSchema)) {
        violations.push(...schemaViolations(tool.inputSchema, `tools[${index}].inputSchema`));
      }

      if (tool.outputSchema !== undefined) {
        violations.push(...schemaViolations(tool.outputSchema, `tools[${index}].outputSchema`));
      }
    });

    return violations;
  },
};

function schemaViolations(
  schema: JsonValue | undefined,
  path: string,
): readonly LintRuleViolationInput[] {
  return validateSchemaShape(schema, path).map((issue) =>
    createViolation({
      message: issue.message,
      location: issue.path,
      fixHint: 'Use valid JSON Schema 2020-12 by default or an explicitly supported draft URI.',
    }),
  );
}
