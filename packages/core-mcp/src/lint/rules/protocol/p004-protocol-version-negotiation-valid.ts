import type { LintRule, LintRuleViolationInput } from '../../types.js';
import { createViolation } from '../helpers.js';

export const P004_PROTOCOL_VERSION_NEGOTIATION_VALID_RULE_ID = 'P004';

const defaultSupportedProtocolVersions = ['2025-11-25', '2025-06-18', '2024-11-05'] as const;

export const p004ProtocolVersionNegotiationValidRule: LintRule = {
  id: P004_PROTOCOL_VERSION_NEGOTIATION_VALID_RULE_ID,
  category: 'protocol',
  severity: 'error',
  title: 'Protocol version negotiation is valid',
  description: 'Flags malformed or unsupported negotiated MCP protocol versions.',
  check(context) {
    const violations: LintRuleViolationInput[] = [];
    const version = context.protocolVersion;

    if (version === undefined) {
      return violations;
    }

    if (!isProtocolVersionDate(version)) {
      violations.push(
        createViolation({
          message: `Negotiated protocol version ${version} is not a YYYY-MM-DD date string.`,
          location: 'protocolVersion',
          fixHint: 'Return an MCP protocol version date such as 2025-11-25.',
        }),
      );
    }

    const supportedVersions =
      context.metadata.supportedProtocolVersions ?? defaultSupportedProtocolVersions;
    if (!supportedVersions.includes(version)) {
      violations.push(
        createViolation({
          message: `Negotiated protocol version ${version} was not in the supported version set.`,
          location: 'protocolVersion',
          evidence: supportedVersions.join(', '),
          fixHint: 'Negotiate a protocol version supported by the client or disconnect cleanly.',
        }),
      );
    }

    return violations;
  },
};

function isProtocolVersionDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
