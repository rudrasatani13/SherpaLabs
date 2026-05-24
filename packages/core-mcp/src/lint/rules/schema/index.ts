export {
  S001_TOOL_INPUT_SCHEMA_PRESENT_RULE_ID,
  s001ToolInputSchemaPresentRule,
} from './s001-tool-input-schema-present.js';
export {
  S002_TOOL_SCHEMA_DIALECT_VALID_RULE_ID,
  s002ToolSchemaDialectValidRule,
} from './s002-tool-schema-dialect-valid.js';
export {
  S003_REQUIRED_PROPERTIES_DECLARED_RULE_ID,
  s003RequiredPropertiesDeclaredRule,
} from './s003-required-properties-declared.js';
export {
  S004_TOOL_NAME_FORMAT_STABLE_RULE_ID,
  s004ToolNameFormatStableRule,
} from './s004-tool-name-format-stable.js';
export {
  S005_TOOL_OUTPUT_SCHEMA_HONORED_RULE_ID,
  s005ToolOutputSchemaHonoredRule,
} from './s005-tool-output-schema-honored.js';

import { s001ToolInputSchemaPresentRule } from './s001-tool-input-schema-present.js';
import { s002ToolSchemaDialectValidRule } from './s002-tool-schema-dialect-valid.js';
import { s003RequiredPropertiesDeclaredRule } from './s003-required-properties-declared.js';
import { s004ToolNameFormatStableRule } from './s004-tool-name-format-stable.js';
import { s005ToolOutputSchemaHonoredRule } from './s005-tool-output-schema-honored.js';

export const schemaLintRules = [
  s001ToolInputSchemaPresentRule,
  s002ToolSchemaDialectValidRule,
  s003RequiredPropertiesDeclaredRule,
  s004ToolNameFormatStableRule,
  s005ToolOutputSchemaHonoredRule,
] as const;
