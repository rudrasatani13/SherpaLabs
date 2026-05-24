export * from './performance/index.js';
export * from './protocol/index.js';
export * from './schema/index.js';
export * from './security/index.js';

import { performanceLintRules } from './performance/index.js';
import { protocolLintRules } from './protocol/index.js';
import { schemaLintRules } from './schema/index.js';
import { securityLintRules } from './security/index.js';

export const defaultLintRules = [
  ...protocolLintRules,
  ...schemaLintRules,
  ...securityLintRules,
  ...performanceLintRules,
] as const;
