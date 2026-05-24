import type { LintRule, LintRuleViolationInput } from '../../types.js';
import { createViolation, isJsonObject } from '../helpers.js';

export const S001_TOOL_INPUT_SCHEMA_PRESENT_RULE_ID = 'S001';

export const s001ToolInputSchemaPresentRule: LintRule = {
  id: S001_TOOL_INPUT_SCHEMA_PRESENT_RULE_ID,
  category: 'schema',
  severity: 'error',
  title: 'Tool input schema is present',
  description: 'Requires every tool to expose an object inputSchema.',
  check(context) {
    const violations: LintRuleViolationInput[] = [];

    context.tools.forEach((tool, index) => {
      if (!isJsonObject(tool.inputSchema)) {
        violations.push(
          createViolation({
            message: `Tool ${tool.name ?? index} is missing a valid object inputSchema.`,
            location: `tools[${index}].inputSchema`,
            fixHint: 'Define inputSchema as a JSON Schema object, even for no-argument tools.',
          }),
        );
      }
    });

    return violations;
  },
};
