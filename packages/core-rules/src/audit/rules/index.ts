export { parseErrorRule, parseWarningRule, parseProblemRules } from './parse-problems.js';
export { TOKEN_BUDGET_OVERRUN_RULE_ID, tokenBudgetOverrunRule } from './token-budget-overrun.js';
export {
  CONFLICTING_DIRECTIVES_RULE_ID,
  conflictingDirectivesRule,
} from './conflicting-directives.js';
export { VAGUE_DIRECTIVES_RULE_ID, vagueDirectivesRule } from './vague-directives.js';
export { MISSING_STACK_CONTEXT_RULE_ID, missingStackContextRule } from './missing-stack-context.js';
export {
  CROSS_FILE_CONTRADICTIONS_RULE_ID,
  crossFileContradictionsRule,
} from './cross-file-contradictions.js';
export { DUPLICATE_SECTIONS_RULE_ID, duplicateSectionsRule } from './duplicate-sections.js';
export {
  OUTDATED_TOOL_REFERENCES_RULE_ID,
  outdatedToolReferencesRule,
} from './outdated-tool-references.js';
export {
  MISSING_PRIORITY_SIGNALS_RULE_ID,
  missingPrioritySignalsRule,
} from './missing-priority-signals.js';
export { VERBOSE_PREAMBLE_RULE_ID, verbosePreambleRule } from './verbose-preamble.js';
export { UNBALANCED_SECTIONS_RULE_ID, unbalancedSectionsRule } from './unbalanced-sections.js';
export { MISSING_EXAMPLES_RULE_ID, missingExamplesRule } from './missing-examples.js';
export {
  AMBIGUOUS_INSTRUCTIONS_RULE_ID,
  ambiguousInstructionsRule,
} from './ambiguous-instructions.js';
import { parseProblemRules } from './parse-problems.js';
import { ambiguousInstructionsRule } from './ambiguous-instructions.js';
import { conflictingDirectivesRule } from './conflicting-directives.js';
import { crossFileContradictionsRule } from './cross-file-contradictions.js';
import { duplicateSectionsRule } from './duplicate-sections.js';
import { missingExamplesRule } from './missing-examples.js';
import { missingPrioritySignalsRule } from './missing-priority-signals.js';
import { missingStackContextRule } from './missing-stack-context.js';
import { outdatedToolReferencesRule } from './outdated-tool-references.js';
import { tokenBudgetOverrunRule } from './token-budget-overrun.js';
import { unbalancedSectionsRule } from './unbalanced-sections.js';
import { vagueDirectivesRule } from './vague-directives.js';
import { verbosePreambleRule } from './verbose-preamble.js';

export const heuristicAuditRules = [
  tokenBudgetOverrunRule,
  conflictingDirectivesRule,
  vagueDirectivesRule,
  missingStackContextRule,
  crossFileContradictionsRule,
  duplicateSectionsRule,
  outdatedToolReferencesRule,
  missingPrioritySignalsRule,
  verbosePreambleRule,
  unbalancedSectionsRule,
  missingExamplesRule,
  ambiguousInstructionsRule,
] as const;

export const defaultAuditRules = [...parseProblemRules, ...heuristicAuditRules] as const;
