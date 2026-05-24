import { Buffer } from 'node:buffer';

import type { LintContext, LintRule, LintRuleViolationInput } from '../../types.js';
import { createViolation, getRuleThreshold } from '../helpers.js';

export const F003_EXCESSIVE_LIST_PAYLOAD_RULE_ID = 'F003';
export const DEFAULT_MAX_LIST_ITEMS = 100;
export const DEFAULT_MAX_LIST_PAYLOAD_BYTES = 512 * 1024;

export const f003ExcessiveListPayloadRule: LintRule = {
  id: F003_EXCESSIVE_LIST_PAYLOAD_RULE_ID,
  category: 'performance',
  severity: 'warning',
  title: 'List payloads stay bounded',
  description: 'Flags discovery lists with too many items or too many response bytes.',
  check(context) {
    const maxItems = getRuleThreshold(
      context,
      F003_EXCESSIVE_LIST_PAYLOAD_RULE_ID,
      'maxListItems',
      DEFAULT_MAX_LIST_ITEMS,
    );
    const maxBytes = getRuleThreshold(
      context,
      F003_EXCESSIVE_LIST_PAYLOAD_RULE_ID,
      'maxListPayloadBytes',
      DEFAULT_MAX_LIST_PAYLOAD_BYTES,
    );

    return [
      ...checkList(
        context,
        'tools',
        context.tools.length,
        serializedByteLength(context.tools),
        maxItems,
        maxBytes,
      ),
      ...checkList(
        context,
        'resources',
        context.resources.length,
        serializedByteLength(context.resources),
        maxItems,
        maxBytes,
      ),
      ...checkList(
        context,
        'prompts',
        context.prompts.length,
        serializedByteLength(context.prompts),
        maxItems,
        maxBytes,
      ),
    ];
  },
};

function checkList(
  context: LintContext,
  name: 'tools' | 'resources' | 'prompts',
  count: number,
  fallbackBytes: number,
  maxItems: number,
  maxBytes: number,
): readonly LintRuleViolationInput[] {
  const violations: LintRuleViolationInput[] = [];
  const bytes = context.metadata.listPayloadBytes?.[name] ?? fallbackBytes;

  if (count > maxItems) {
    violations.push(
      createViolation({
        message: `${name}/list returned ${count} items, above the ${maxItems} item budget.`,
        location: name,
        fixHint:
          'Paginate large discovery lists and return nextCursor instead of one oversized page.',
      }),
    );
  }

  if (bytes > maxBytes) {
    violations.push(
      createViolation({
        message: `${name}/list payload was ${bytes} bytes, above the ${maxBytes} byte budget.`,
        location: `metadata.listPayloadBytes.${name}`,
        fixHint:
          'Shorten descriptions, paginate list responses, or defer large details until item access.',
      }),
    );
  }

  return violations;
}

function serializedByteLength(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}
