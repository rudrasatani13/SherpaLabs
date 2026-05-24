import type { LintContext, LintRule, LintRuleViolationInput } from '../../types.js';
import { createViolation, isJsonObject, truncateEvidence } from '../helpers.js';

export const P007_STDIO_FRAMING_CLEAN_RULE_ID = 'P007';

export const p007StdioFramingCleanRule: LintRule = {
  id: P007_STDIO_FRAMING_CLEAN_RULE_ID,
  category: 'protocol',
  severity: 'error',
  title: 'stdio framing is clean',
  description: 'Flags non-MCP stdout lines, partial lines, and non-JSON-RPC stdout frames.',
  check(context) {
    if (context.transport !== 'stdio') {
      return [];
    }

    const violations: LintRuleViolationInput[] = [];
    const stdoutLines = context.metadata.stdio?.stdoutLines ?? stdoutRawMessages(context);

    stdoutLines.forEach((line, index) => {
      if (line.trim() === '') {
        return;
      }

      if (line.includes('\n') || line.includes('\r')) {
        violations.push(
          createViolation({
            message: 'stdio stdout frame contains an embedded newline.',
            location: `metadata.stdio.stdoutLines[${index}]`,
            evidence: truncateEvidence(line),
            fixHint:
              'Write each JSON-RPC message as one compact JSON line terminated by a single newline.',
          }),
        );
        return;
      }

      validateStdoutLine(line, index, violations);
    });

    if (context.metadata.stdio?.stdoutHadPartialLine === true) {
      violations.push(
        createViolation({
          message: 'stdio stdout ended with a partial non-newline-delimited frame.',
          location: 'metadata.stdio.stdoutHadPartialLine',
          fixHint: 'Terminate every stdout JSON-RPC frame with a newline.',
        }),
      );
    }

    return violations;
  },
};

function validateStdoutLine(
  line: string,
  index: number,
  violations: LintRuleViolationInput[],
): void {
  let parsed: unknown;

  try {
    parsed = JSON.parse(line);
  } catch {
    violations.push(
      createViolation({
        message: 'stdio stdout line is not valid JSON.',
        location: `metadata.stdio.stdoutLines[${index}]`,
        evidence: truncateEvidence(line),
        fixHint:
          'Send logs to stderr only and reserve stdout for newline-delimited JSON-RPC messages.',
      }),
    );
    return;
  }

  if (!isJsonObject(parsed) || parsed.jsonrpc !== '2.0') {
    violations.push(
      createViolation({
        message: 'stdio stdout line is not a JSON-RPC 2.0 object.',
        location: `metadata.stdio.stdoutLines[${index}]`,
        evidence: truncateEvidence(line),
        fixHint: 'Write only JSON-RPC 2.0 protocol objects to stdout.',
      }),
    );
  }
}

function stdoutRawMessages(context: LintContext): readonly string[] {
  return context.messages
    .filter((entry) => entry.channel === 'stdout' && entry.raw !== undefined)
    .map((entry) => entry.raw ?? '');
}
