import type { LintRule, LintRuleViolationInput } from '../../types.js';
import { createViolation } from '../helpers.js';

export const S004_TOOL_NAME_FORMAT_STABLE_RULE_ID = 'S004';

const stableToolNamePattern = /^[A-Za-z0-9_.-]{1,128}$/;

export const s004ToolNameFormatStableRule: LintRule = {
  id: S004_TOOL_NAME_FORMAT_STABLE_RULE_ID,
  category: 'schema',
  severity: 'warning',
  title: 'Tool names are stable',
  description:
    'Flags tool names outside the recommended ASCII letters, digits, underscore, hyphen, and dot format.',
  check(context) {
    const violations: LintRuleViolationInput[] = [];

    context.tools.forEach((tool, index) => {
      if (typeof tool.name !== 'string' || !stableToolNamePattern.test(tool.name)) {
        violations.push(
          createViolation({
            message: `Tool name ${tool.name ?? '<missing>'} is not stable across MCP clients.`,
            location: `tools[${index}].name`,
            fixHint:
              'Use 1-128 ASCII letters, digits, underscores, hyphens, or dots for tool names.',
          }),
        );
      }
    });

    return violations;
  },
};
