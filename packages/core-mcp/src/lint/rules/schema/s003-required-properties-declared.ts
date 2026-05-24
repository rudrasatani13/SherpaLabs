import type { LintRule, LintRuleViolationInput } from '../../types.js';
import { createViolation, isJsonObject } from '../helpers.js';
import { findRequiredPropertyIssues } from './schema-utils.js';

export const S003_REQUIRED_PROPERTIES_DECLARED_RULE_ID = 'S003';

export const s003RequiredPropertiesDeclaredRule: LintRule = {
  id: S003_REQUIRED_PROPERTIES_DECLARED_RULE_ID,
  category: 'schema',
  severity: 'error',
  title: 'Required properties are declared',
  description: 'Requires every required schema property to be present in properties.',
  check(context) {
    const violations: LintRuleViolationInput[] = [];

    context.tools.forEach((tool, index) => {
      if (isJsonObject(tool.inputSchema)) {
        violations.push(
          ...findRequiredPropertyIssues(tool.inputSchema, `tools[${index}].inputSchema`).map(
            (issue) =>
              createViolation({
                message: issue.message,
                location: issue.path,
                fixHint:
                  'Declare every required argument under the same schema object properties map.',
              }),
          ),
        );
      }
    });

    return violations;
  },
};
