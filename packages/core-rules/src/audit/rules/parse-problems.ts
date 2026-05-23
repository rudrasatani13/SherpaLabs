import type { RuleParseError } from '@sherpa-labs/shared-types';
import type { AuditRule, AuditRuleViolationInput } from '../types.js';

export const parseErrorRule: AuditRule = {
  id: 'core.parse-errors',
  severity: 'error',
  title: 'Rule files parse without errors',
  description: 'Reports parser errors discovered before audit rules run.',
  check(context) {
    return buildParseProblemViolations(
      context.ruleSet.parseErrors.filter((error) => error.severity === 'error'),
    );
  },
};

export const parseWarningRule: AuditRule = {
  id: 'core.parse-warnings',
  severity: 'warning',
  title: 'Rule files parse without warnings',
  description: 'Reports parser warnings discovered before audit rules run.',
  check(context) {
    return buildParseProblemViolations(
      context.ruleSet.parseErrors.filter((error) => error.severity === 'warning'),
    );
  },
};

export const parseProblemRules = [parseErrorRule, parseWarningRule] as const;

function buildParseProblemViolations(
  errors: readonly RuleParseError[],
): readonly AuditRuleViolationInput[] {
  return errors.map((error) => ({
    message: error.message,
    category: 'structure',
    ...(error.location !== undefined ? { location: error.location } : {}),
  }));
}
