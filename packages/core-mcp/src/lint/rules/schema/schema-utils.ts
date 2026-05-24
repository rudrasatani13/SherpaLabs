import { stableStringify } from '@sherpa-labs/core-utils';
import type { JsonObject, JsonValue } from '@sherpa-labs/shared-types';

import {
  getJsonObjectProperty,
  getStringProperty,
  isJsonArray,
  isJsonObject,
  jsonObjectEntries,
} from '../helpers.js';

export interface SchemaIssue {
  readonly path: string;
  readonly message: string;
}

const supportedSchemaDialects = new Set([
  'https://json-schema.org/draft/2020-12/schema',
  'https://json-schema.org/draft/2020-12/schema#',
  'http://json-schema.org/draft-07/schema#',
  'https://json-schema.org/draft-07/schema#',
]);

const supportedTypes = new Set([
  'object',
  'array',
  'string',
  'number',
  'integer',
  'boolean',
  'null',
]);

export function validateSchemaShape(
  schema: JsonValue | undefined,
  path: string,
): readonly SchemaIssue[] {
  const issues: SchemaIssue[] = [];

  validateSchemaNode(schema, path, issues);

  return issues;
}

export function findRequiredPropertyIssues(
  schema: JsonValue | undefined,
  path: string,
): readonly SchemaIssue[] {
  const issues: SchemaIssue[] = [];

  inspectRequiredProperties(schema, path, issues);

  return issues;
}

export function validateJsonValueAgainstSchema(
  value: JsonValue | undefined,
  schema: JsonValue | undefined,
  path: string,
): readonly SchemaIssue[] {
  const issues: SchemaIssue[] = [];

  validateValue(value, schema, path, issues);

  return issues;
}

function validateSchemaNode(
  schema: JsonValue | undefined,
  path: string,
  issues: SchemaIssue[],
): void {
  if (typeof schema === 'boolean') {
    return;
  }

  if (!isJsonObject(schema)) {
    issues.push({ path, message: 'schema must be a JSON object or boolean schema' });
    return;
  }

  const schemaDialect = schema.$schema;
  if (schemaDialect !== undefined) {
    if (typeof schemaDialect !== 'string') {
      issues.push({ path: `${path}.$schema`, message: '$schema must be a string URI' });
    } else if (!supportedSchemaDialects.has(schemaDialect)) {
      issues.push({
        path: `${path}.$schema`,
        message: `unsupported JSON Schema dialect ${schemaDialect}`,
      });
    }
  }

  validateTypeKeyword(schema, path, issues);
  validatePropertiesKeyword(schema, path, issues);
  validateRequiredKeyword(schema, path, issues);
  validateItemsKeyword(schema, path, issues);
  validateAdditionalPropertiesKeyword(schema, path, issues);
  validateEnumKeyword(schema, path, issues);
  validatePatternKeyword(schema, path, issues);
  validateCombinationKeyword(schema, 'allOf', path, issues);
  validateCombinationKeyword(schema, 'anyOf', path, issues);
  validateCombinationKeyword(schema, 'oneOf', path, issues);
}

function validateTypeKeyword(schema: JsonObject, path: string, issues: SchemaIssue[]): void {
  const typeValue = schema.type;

  if (typeValue === undefined) {
    return;
  }

  if (typeof typeValue === 'string') {
    if (!supportedTypes.has(typeValue)) {
      issues.push({ path: `${path}.type`, message: `unsupported schema type ${typeValue}` });
    }
    return;
  }

  if (Array.isArray(typeValue) && typeValue.every((item) => typeof item === 'string')) {
    for (const item of typeValue) {
      if (!supportedTypes.has(item)) {
        issues.push({ path: `${path}.type`, message: `unsupported schema type ${item}` });
      }
    }
    return;
  }

  issues.push({ path: `${path}.type`, message: 'type must be a string or array of strings' });
}

function validatePropertiesKeyword(schema: JsonObject, path: string, issues: SchemaIssue[]): void {
  const properties = schema.properties;

  if (properties === undefined) {
    return;
  }

  if (!isJsonObject(properties)) {
    issues.push({ path: `${path}.properties`, message: 'properties must be an object' });
    return;
  }

  for (const [propertyName, propertySchema] of jsonObjectEntries(properties)) {
    validateSchemaNode(propertySchema, `${path}.properties.${propertyName}`, issues);
  }
}

function validateRequiredKeyword(schema: JsonObject, path: string, issues: SchemaIssue[]): void {
  const required = schema.required;

  if (required === undefined) {
    return;
  }

  if (!Array.isArray(required) || !required.every((item) => typeof item === 'string')) {
    issues.push({ path: `${path}.required`, message: 'required must be an array of strings' });
  }
}

function validateItemsKeyword(schema: JsonObject, path: string, issues: SchemaIssue[]): void {
  const items = schema.items;

  if (items === undefined) {
    return;
  }

  if (isJsonArray(items)) {
    items.forEach((item, index) => {
      validateSchemaNode(item, `${path}.items[${index}]`, issues);
    });
    return;
  }

  validateSchemaNode(items, `${path}.items`, issues);
}

function validateAdditionalPropertiesKeyword(
  schema: JsonObject,
  path: string,
  issues: SchemaIssue[],
): void {
  const additionalProperties = schema.additionalProperties;

  if (additionalProperties === undefined || typeof additionalProperties === 'boolean') {
    return;
  }

  validateSchemaNode(additionalProperties, `${path}.additionalProperties`, issues);
}

function validateEnumKeyword(schema: JsonObject, path: string, issues: SchemaIssue[]): void {
  if (schema.enum !== undefined && !Array.isArray(schema.enum)) {
    issues.push({ path: `${path}.enum`, message: 'enum must be an array' });
  }
}

function validatePatternKeyword(schema: JsonObject, path: string, issues: SchemaIssue[]): void {
  const pattern = schema.pattern;

  if (pattern === undefined) {
    return;
  }

  if (typeof pattern !== 'string') {
    issues.push({ path: `${path}.pattern`, message: 'pattern must be a string' });
    return;
  }

  try {
    new RegExp(pattern);
  } catch {
    issues.push({ path: `${path}.pattern`, message: 'pattern must be a valid regular expression' });
  }
}

function validateCombinationKeyword(
  schema: JsonObject,
  keyword: 'allOf' | 'anyOf' | 'oneOf',
  path: string,
  issues: SchemaIssue[],
): void {
  const children = schema[keyword];

  if (children === undefined) {
    return;
  }

  if (!isJsonArray(children) || children.length === 0) {
    issues.push({ path: `${path}.${keyword}`, message: `${keyword} must be a non-empty array` });
    return;
  }

  children.forEach((child, index) => {
    validateSchemaNode(child, `${path}.${keyword}[${index}]`, issues);
  });
}

function inspectRequiredProperties(
  schema: JsonValue | undefined,
  path: string,
  issues: SchemaIssue[],
): void {
  if (!isJsonObject(schema)) {
    return;
  }

  const required = schema.required;
  const properties = getJsonObjectProperty(schema, 'properties') ?? {};

  if (required !== undefined) {
    if (!Array.isArray(required) || !required.every((item) => typeof item === 'string')) {
      issues.push({ path: `${path}.required`, message: 'required must be an array of strings' });
    } else {
      for (const propertyName of required) {
        if (!(propertyName in properties)) {
          issues.push({
            path: `${path}.required`,
            message: `required property ${propertyName} is missing from properties`,
          });
        }
      }
    }
  }

  for (const [propertyName, propertySchema] of jsonObjectEntries(properties)) {
    inspectRequiredProperties(propertySchema, `${path}.properties.${propertyName}`, issues);
  }
}

function validateValue(
  value: JsonValue | undefined,
  schema: JsonValue | undefined,
  path: string,
  issues: SchemaIssue[],
): void {
  if (schema === true || schema === undefined) {
    return;
  }

  if (schema === false) {
    issues.push({ path, message: 'value is rejected by false schema' });
    return;
  }

  if (!isJsonObject(schema)) {
    return;
  }

  validateEnumValue(value, schema, path, issues);
  validateConstValue(value, schema, path, issues);
  validateTypedValue(value, schema, path, issues);
  validateCombinationValue(value, schema, path, issues);
}

function validateEnumValue(
  value: JsonValue | undefined,
  schema: JsonObject,
  path: string,
  issues: SchemaIssue[],
): void {
  if (!isJsonArray(schema.enum)) {
    return;
  }

  const valueKey = value === undefined ? undefined : stableStringify(value);
  const allowed = schema.enum.some((item) => stableStringify(item) === valueKey);

  if (!allowed) {
    issues.push({ path, message: 'value is not one of the allowed enum values' });
  }
}

function validateConstValue(
  value: JsonValue | undefined,
  schema: JsonObject,
  path: string,
  issues: SchemaIssue[],
): void {
  if (!('const' in schema)) {
    return;
  }

  const constValue = schema.const;

  if (value === undefined || stableStringify(value) !== stableStringify(constValue)) {
    issues.push({ path, message: 'value does not match const' });
  }
}

function validateTypedValue(
  value: JsonValue | undefined,
  schema: JsonObject,
  path: string,
  issues: SchemaIssue[],
): void {
  const types = getSchemaTypes(schema);

  if (types.length > 0 && !types.some((type) => matchesType(value, type))) {
    issues.push({ path, message: `value does not match schema type ${types.join('|')}` });
    return;
  }

  if (isJsonObject(value)) {
    validateObjectValue(value, schema, path, issues);
  }

  if (Array.isArray(value)) {
    validateArrayValue(value, schema, path, issues);
  }

  if (typeof value === 'string') {
    validateStringValue(value, schema, path, issues);
  }

  if (typeof value === 'number') {
    validateNumberValue(value, schema, path, issues);
  }
}

function validateObjectValue(
  value: JsonObject,
  schema: JsonObject,
  path: string,
  issues: SchemaIssue[],
): void {
  const properties = getJsonObjectProperty(schema, 'properties') ?? {};
  const required = schema.required;

  if (Array.isArray(required)) {
    for (const propertyName of required) {
      if (typeof propertyName === 'string' && !(propertyName in value)) {
        issues.push({ path, message: `missing required property ${propertyName}` });
      }
    }
  }

  for (const [propertyName, propertySchema] of jsonObjectEntries(properties)) {
    if (propertyName in value) {
      validateValue(value[propertyName], propertySchema, `${path}.${propertyName}`, issues);
    }
  }

  if (schema.additionalProperties === false) {
    for (const propertyName of Object.keys(value)) {
      if (!(propertyName in properties)) {
        issues.push({
          path: `${path}.${propertyName}`,
          message: 'additional property is not allowed',
        });
      }
    }
  }
}

function validateArrayValue(
  value: readonly JsonValue[],
  schema: JsonObject,
  path: string,
  issues: SchemaIssue[],
): void {
  const items = schema.items;

  if (items === undefined || isJsonArray(items)) {
    return;
  }

  value.forEach((item, index) => {
    validateValue(item, items, `${path}[${index}]`, issues);
  });
}

function validateStringValue(
  value: string,
  schema: JsonObject,
  path: string,
  issues: SchemaIssue[],
): void {
  const pattern = getStringProperty(schema, 'pattern');
  const minLength = typeof schema.minLength === 'number' ? schema.minLength : undefined;
  const maxLength = typeof schema.maxLength === 'number' ? schema.maxLength : undefined;

  if (pattern !== undefined && !new RegExp(pattern).test(value)) {
    issues.push({ path, message: 'string does not match pattern' });
  }

  if (minLength !== undefined && value.length < minLength) {
    issues.push({ path, message: `string is shorter than minLength ${minLength}` });
  }

  if (maxLength !== undefined && value.length > maxLength) {
    issues.push({ path, message: `string is longer than maxLength ${maxLength}` });
  }
}

function validateNumberValue(
  value: number,
  schema: JsonObject,
  path: string,
  issues: SchemaIssue[],
): void {
  const minimum = typeof schema.minimum === 'number' ? schema.minimum : undefined;
  const maximum = typeof schema.maximum === 'number' ? schema.maximum : undefined;

  if (minimum !== undefined && value < minimum) {
    issues.push({ path, message: `number is less than minimum ${minimum}` });
  }

  if (maximum !== undefined && value > maximum) {
    issues.push({ path, message: `number is greater than maximum ${maximum}` });
  }
}

function validateCombinationValue(
  value: JsonValue | undefined,
  schema: JsonObject,
  path: string,
  issues: SchemaIssue[],
): void {
  const allOf = schema.allOf;
  if (isJsonArray(allOf)) {
    allOf.forEach((child, index) => {
      validateValue(value, child, `${path}.allOf[${index}]`, issues);
    });
  }

  const anyOf = schema.anyOf;
  if (
    isJsonArray(anyOf) &&
    !anyOf.some((child) => validateJsonValueAgainstSchema(value, child, path).length === 0)
  ) {
    issues.push({ path, message: 'value does not match any anyOf schema' });
  }

  const oneOf = schema.oneOf;
  if (isJsonArray(oneOf)) {
    const matchCount = oneOf.filter(
      (child) => validateJsonValueAgainstSchema(value, child, path).length === 0,
    ).length;
    if (matchCount !== 1) {
      issues.push({ path, message: 'value must match exactly one oneOf schema' });
    }
  }
}

function getSchemaTypes(schema: JsonObject): readonly string[] {
  if (typeof schema.type === 'string') {
    return [schema.type];
  }

  if (Array.isArray(schema.type)) {
    return schema.type.filter((item): item is string => typeof item === 'string');
  }

  return [];
}

function matchesType(value: JsonValue | undefined, type: string): boolean {
  if (value === undefined) {
    return false;
  }

  if (type === 'null') {
    return value === null;
  }

  if (type === 'array') {
    return Array.isArray(value);
  }

  if (type === 'object') {
    return isJsonObject(value);
  }

  if (type === 'integer') {
    return typeof value === 'number' && Number.isInteger(value);
  }

  return typeof value === type;
}
