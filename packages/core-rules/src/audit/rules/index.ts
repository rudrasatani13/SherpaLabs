export { parseErrorRule, parseWarningRule, parseProblemRules } from './parse-problems.js';
import { parseProblemRules } from './parse-problems.js';

export const defaultAuditRules = [...parseProblemRules] as const;
