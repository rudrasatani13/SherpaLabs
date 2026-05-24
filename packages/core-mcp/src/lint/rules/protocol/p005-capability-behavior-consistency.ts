import type { LintContext, LintRule, LintRuleViolationInput } from '../../types.js';
import { createViolation, hasCapability, methodFailed } from '../helpers.js';

export const P005_CAPABILITY_BEHAVIOR_CONSISTENCY_RULE_ID = 'P005';

export const p005CapabilityBehaviorConsistencyRule: LintRule = {
  id: P005_CAPABILITY_BEHAVIOR_CONSISTENCY_RULE_ID,
  category: 'protocol',
  severity: 'warning',
  title: 'Capabilities match observed behavior',
  description:
    'Flags advertised capabilities that fail and discovered features that were not advertised.',
  check(context) {
    return [
      ...checkCapability(context, 'tools', 'tools/list', context.tools.length),
      ...checkCapability(context, 'resources', 'resources/list', context.resources.length),
      ...checkCapability(context, 'prompts', 'prompts/list', context.prompts.length),
    ];
  },
};

function checkCapability(
  context: LintContext,
  capability: 'tools' | 'resources' | 'prompts',
  method: string,
  discoveredCount: number,
): readonly LintRuleViolationInput[] {
  const violations: LintRuleViolationInput[] = [];
  const advertised = hasCapability(context, capability);

  if (advertised && methodFailed(context, method)) {
    violations.push(
      createViolation({
        message: `Server advertised ${capability} but ${method} failed.`,
        location: `capabilities.${capability}`,
        fixHint: `Only advertise ${capability} when ${method} is implemented and returns a valid result.`,
      }),
    );
  }

  if (!advertised && discoveredCount > 0) {
    violations.push(
      createViolation({
        message: `Server exposed ${discoveredCount} ${capability} item(s) without advertising ${capability}.`,
        location: capability,
        fixHint: `Advertise capabilities.${capability} during initialize before exposing ${method}.`,
      }),
    );
  }

  return violations;
}
