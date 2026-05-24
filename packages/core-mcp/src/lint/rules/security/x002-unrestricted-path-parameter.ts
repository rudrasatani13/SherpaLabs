import type { JsonObject, JsonValue } from '@sherpa-labs/shared-types';

import type { LintRule, LintRuleViolationInput, LintToolObservation } from '../../types.js';
import {
  createViolation,
  getJsonObjectProperty,
  getStringProperty,
  isJsonObject,
} from '../helpers.js';

export const X002_UNRESTRICTED_PATH_PARAMETER_RULE_ID = 'X002';

const pathParameterPattern =
  /(^|[_-])(path|file|filename|directory|dir|root|repo_path|workspace)([_-]|$)/i;

export const x002UnrestrictedPathParameterRule: LintRule = {
  id: X002_UNRESTRICTED_PATH_PARAMETER_RULE_ID,
  category: 'security',
  severity: 'warning',
  title: 'Path parameters are constrained',
  description:
    'Flags path-like string parameters without patterns, enums, or documented root boundaries.',
  check(context) {
    const violations: LintRuleViolationInput[] = [];

    context.tools.forEach((tool, toolIndex) => {
      if (!isJsonObject(tool.inputSchema)) {
        return;
      }

      inspectSchemaProperties(
        tool,
        tool.inputSchema,
        `tools[${toolIndex}].inputSchema`,
        violations,
      );
    });

    return violations;
  },
};

function inspectSchemaProperties(
  tool: LintToolObservation,
  schema: JsonObject,
  path: string,
  violations: LintRuleViolationInput[],
): void {
  const properties = getJsonObjectProperty(schema, 'properties');

  if (properties === undefined) {
    return;
  }

  for (const [propertyName, propertySchema] of Object.entries(properties)) {
    const propertyPath = `${path}.properties.${propertyName}`;

    if (isJsonObject(propertySchema)) {
      if (isUnrestrictedPathParameter(tool, propertyName, propertySchema)) {
        violations.push(
          createViolation({
            message: `Path-like parameter ${propertyName} is unconstrained.`,
            location: propertyPath,
            fixHint:
              'Constrain path parameters with a safe pattern, enum, or documented allowed root behavior.',
          }),
        );
      }

      inspectSchemaProperties(tool, propertySchema, propertyPath, violations);
    }
  }
}

function isUnrestrictedPathParameter(
  tool: LintToolObservation,
  propertyName: string,
  schema: JsonObject,
): boolean {
  if (!pathParameterPattern.test(propertyName) || !isStringLikeSchema(schema)) {
    return false;
  }

  if (hasHardConstraint(schema)) {
    return false;
  }

  const text =
    `${tool.description ?? ''} ${getStringProperty(schema, 'description') ?? ''}`.toLowerCase();

  return !(
    text.includes('allowed root') ||
    text.includes('allowed director') ||
    text.includes('workspace root') ||
    text.includes('within root') ||
    text.includes('read-only')
  );
}

function isStringLikeSchema(schema: JsonObject): boolean {
  const type = schema.type;

  return (
    type === undefined ||
    type === 'string' ||
    (Array.isArray(type) && type.some((item) => item === 'string'))
  );
}

function hasHardConstraint(schema: JsonObject): boolean {
  return (
    hasNonEmptyString(schema.pattern) ||
    hasNonEmptyArray(schema.enum) ||
    schema.const !== undefined ||
    (typeof schema.format === 'string' && schema.format.toLowerCase().includes('path'))
  );
}

function hasNonEmptyString(value: JsonValue | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasNonEmptyArray(value: JsonValue | undefined): boolean {
  return Array.isArray(value) && value.length > 0;
}
