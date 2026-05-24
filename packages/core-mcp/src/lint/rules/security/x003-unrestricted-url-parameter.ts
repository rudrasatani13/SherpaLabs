import type { JsonObject, JsonValue } from '@sherpa-labs/shared-types';

import type { LintRule, LintRuleViolationInput, LintToolObservation } from '../../types.js';
import {
  createViolation,
  getJsonObjectProperty,
  getStringProperty,
  isJsonObject,
} from '../helpers.js';

export const X003_UNRESTRICTED_URL_PARAMETER_RULE_ID = 'X003';

const urlParameterPattern = /(^|[_-])(url|uri|endpoint|callback|webhook|redirect)([_-]|$)/i;

export const x003UnrestrictedUrlParameterRule: LintRule = {
  id: X003_UNRESTRICTED_URL_PARAMETER_RULE_ID,
  category: 'security',
  severity: 'warning',
  title: 'URL parameters are constrained',
  description:
    'Flags URL-like string parameters without scheme, host, enum, or allowlist constraints.',
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
      if (isUnrestrictedUrlParameter(tool, propertyName, propertySchema)) {
        violations.push(
          createViolation({
            message: `URL-like parameter ${propertyName} is unconstrained.`,
            location: propertyPath,
            fixHint:
              'Constrain URL parameters with an enum, host allowlist pattern, or approved endpoint list.',
          }),
        );
      }

      inspectSchemaProperties(tool, propertySchema, propertyPath, violations);
    }
  }
}

function isUnrestrictedUrlParameter(
  tool: LintToolObservation,
  propertyName: string,
  schema: JsonObject,
): boolean {
  if (!urlParameterPattern.test(propertyName) || !isStringLikeSchema(schema)) {
    return false;
  }

  if (hasHardConstraint(schema)) {
    return false;
  }

  const text =
    `${tool.description ?? ''} ${getStringProperty(schema, 'description') ?? ''}`.toLowerCase();

  return !(
    text.includes('allowlist') ||
    text.includes('approved host') ||
    text.includes('approved endpoint')
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
    hasNonEmptyString(schema.pattern) || hasNonEmptyArray(schema.enum) || schema.const !== undefined
  );
}

function hasNonEmptyString(value: JsonValue | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasNonEmptyArray(value: JsonValue | undefined): boolean {
  return Array.isArray(value) && value.length > 0;
}
