import type { AuditRule } from '../types.js';
import { findTextMatches, formatFilePath } from './helpers.js';

export const OUTDATED_TOOL_REFERENCES_RULE_ID = 'heuristic.outdated-tool-references';

const OUTDATED_REFERENCES = [
  {
    label: 'Node.js 12/14/16',
    pattern: /\bnode(?:\.js)?\s*(?:version\s*)?v?(?:12|14|16)\b/i,
    fixHint:
      'Update the rule to the supported Node.js version for this repo, or remove the pinned old runtime.',
  },
  {
    label: 'Python 2',
    pattern: /\bpython\s*2(?:\.\d+)?\b/i,
    fixHint: 'Replace the Python 2 guidance with Python 3 tooling and commands.',
  },
  {
    label: 'TSLint',
    pattern: /\btslint\b/i,
    fixHint:
      'Replace TSLint references with the repo ESLint command or TypeScript-aware lint setup.',
  },
  {
    label: 'Bower',
    pattern: /\bbower\b/i,
    fixHint: 'Replace Bower guidance with the package manager used by the repo.',
  },
  {
    label: 'Yarn 1',
    pattern: /\byarn\s*(?:v|version\s*)?1(?:\.\d+)?\b/i,
    fixHint:
      'Clarify whether the repo intentionally uses Yarn Classic or update the package manager guidance.',
  },
  {
    label: 'text-davinci-003',
    pattern: /\btext-davinci-003\b/i,
    fixHint:
      'Replace obsolete completions model references with the current approved model family for the team.',
  },
  {
    label: 'legacy GPT-3.5 snapshot',
    pattern: /\bgpt-3\.5-turbo-(?:0301|0613|1106)\b/i,
    fixHint: 'Remove the pinned legacy snapshot or update it to the team-approved current model.',
  },
  {
    label: 'Claude 2',
    pattern: /\bclaude\s*2(?:\.\d+)?\b/i,
    fixHint:
      'Replace Claude 2 guidance with the current Claude Code or model guidance used by the team.',
  },
] as const;

export const outdatedToolReferencesRule: AuditRule = {
  id: OUTDATED_TOOL_REFERENCES_RULE_ID,
  severity: 'warning',
  title: 'Rules do not reference outdated tools',
  description:
    'Flags deterministic references to deprecated runtimes, package tools, and AI model versions.',
  check(context) {
    return OUTDATED_REFERENCES.flatMap((reference) => {
      const firstMatchByFile = new Map<string, ReturnType<typeof findTextMatches>[number]>();

      for (const match of findTextMatches(context.ruleSet.files, reference.pattern)) {
        const key = match.file.path;

        if (!firstMatchByFile.has(key)) {
          firstMatchByFile.set(key, match);
        }
      }

      return Array.from(firstMatchByFile.values()).map((match) => ({
        message: `${formatFilePath(match.file.path)} references ${reference.label} ("${match.value}"), which is an outdated or deprecated tool reference.`,
        category: 'outdated-reference' as const,
        location: match.location,
        fixHint: reference.fixHint,
      }));
    });
  },
};
