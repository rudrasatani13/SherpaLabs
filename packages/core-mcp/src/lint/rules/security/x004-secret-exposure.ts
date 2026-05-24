import type { JsonValue } from '@sherpa-labs/shared-types';

import type { LintRule, LintRuleViolationInput } from '../../types.js';
import {
  createViolation,
  isJsonArray,
  isJsonObject,
  jsonObjectEntries,
  truncateEvidence,
} from '../helpers.js';

export const X004_SECRET_EXPOSURE_RULE_ID = 'X004';

const secretPatterns = [
  { name: 'private key block', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  {
    name: 'authorization bearer token',
    pattern: /Authorization\s*:\s*Bearer\s+[A-Za-z0-9._~+/=-]{8,}/i,
  },
  { name: 'OpenAI-style secret key', pattern: /\bsk_(?:live|test|proj)_[A-Za-z0-9_-]{8,}\b/ },
  { name: 'GitHub token', pattern: /\bgh[opsu]_[A-Za-z0-9_]{12,}\b/ },
  { name: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  {
    name: 'secret assignment',
    pattern: /\b(?:api[_-]?key|secret|token|password)\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]{12,}/i,
  },
] as const;

export const x004SecretExposureRule: LintRule = {
  id: X004_SECRET_EXPOSURE_RULE_ID,
  category: 'security',
  severity: 'error',
  title: 'Secrets are not exposed',
  description:
    'Flags plaintext tokens, private keys, and authorization headers in MCP-visible text.',
  check(context) {
    const texts: TextCandidate[] = [];

    context.tools.forEach((tool, index) => {
      pushText(texts, `tools[${index}].name`, tool.name);
      pushText(texts, `tools[${index}].description`, tool.description);
      tool.calls?.forEach((call, callIndex) => {
        pushJsonText(texts, `tools[${index}].calls[${callIndex}].result`, call.result);
        pushJsonText(texts, `tools[${index}].calls[${callIndex}].content`, call.content);
        pushJsonText(
          texts,
          `tools[${index}].calls[${callIndex}].structuredContent`,
          call.structuredContent,
        );
      });
    });

    context.resources.forEach((resource, index) => {
      pushText(texts, `resources[${index}].uri`, resource.uri);
      pushText(texts, `resources[${index}].name`, resource.name);
      pushText(texts, `resources[${index}].description`, resource.description);
      resource.reads?.forEach((read, readIndex) => {
        pushJsonText(texts, `resources[${index}].reads[${readIndex}].result`, read.result);
      });
    });

    context.prompts.forEach((prompt, index) => {
      pushText(texts, `prompts[${index}].name`, prompt.name);
      pushText(texts, `prompts[${index}].description`, prompt.description);
      pushJsonText(texts, `prompts[${index}].getResult`, prompt.getResult);
    });

    context.errors.forEach((error, index) => {
      pushText(texts, `errors[${index}].message`, error.message);
      pushJsonText(texts, `errors[${index}].data`, error.data);
    });

    context.messages.forEach((message, index) => {
      pushText(texts, `messages[${index}].raw`, message.raw);
      pushJsonText(texts, `messages[${index}].message`, message.message);
    });

    context.metadata.scanText?.forEach((entry) => {
      pushText(texts, entry.path, entry.text);
    });

    return texts.flatMap((candidate) => secretViolations(candidate));
  },
};

interface TextCandidate {
  readonly path: string;
  readonly text: string;
}

function secretViolations(candidate: TextCandidate): readonly LintRuleViolationInput[] {
  return secretPatterns
    .filter((pattern) => pattern.pattern.test(candidate.text))
    .map((pattern) =>
      createViolation({
        message: `Potential plaintext secret detected: ${pattern.name}.`,
        location: candidate.path,
        evidence: truncateEvidence(candidate.text),
        fixHint:
          'Remove the secret from MCP-visible text and return a redacted placeholder instead.',
      }),
    );
}

function pushText(candidates: TextCandidate[], path: string, text: string | undefined): void {
  if (text !== undefined && text.trim() !== '') {
    candidates.push({ path, text });
  }
}

function pushJsonText(
  candidates: TextCandidate[],
  path: string,
  value: JsonValue | undefined,
): void {
  if (value === undefined || value === null) {
    return;
  }

  if (typeof value === 'string') {
    pushText(candidates, path, value);
    return;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return;
  }

  if (isJsonArray(value)) {
    value.forEach((item, index) => {
      pushJsonText(candidates, `${path}[${index}]`, item);
    });
    return;
  }

  if (!isJsonObject(value)) {
    return;
  }

  for (const [key, childValue] of jsonObjectEntries(value)) {
    pushJsonText(candidates, `${path}.${key}`, childValue);
  }
}
