import type { AuditCategory, Violation } from '@sherpa-labs/shared-types';
import type { AuditReportFixHintSource } from './types.js';

export interface AuditIssueCopy {
  readonly title: string;
  readonly recommendation: string;
  readonly quickWinTitle: string;
  readonly quickWinMessage: string;
  readonly fallbackFixHint: string;
  readonly quickWin: boolean;
}

export interface ResolvedViolationFixHint {
  readonly hint: string;
  readonly source: AuditReportFixHintSource;
}

export const AUDIT_CATEGORY_COPY: Readonly<Record<AuditCategory, AuditIssueCopy>> = {
  'token-budget': {
    title: 'Reduce token budget pressure',
    recommendation: 'Shorten oversized rule files or split background material away from rules.',
    quickWinTitle: 'Trim prompt overhead',
    quickWinMessage: 'Remove repeated background text before expanding the rule set further.',
    fallbackFixHint:
      'Move non-essential background into a shorter note or split long files so agents receive the highest-value rules first.',
    quickWin: false,
  },
  conflict: {
    title: 'Resolve conflicting directives',
    recommendation: 'Choose one policy where instructions disagree.',
    quickWinTitle: 'Resolve direct contradictions',
    quickWinMessage:
      'Remove one side of a direct contradiction when the intended policy is obvious.',
    fallbackFixHint:
      'Rewrite the conflicting directives into one clear policy so agents do not have to guess which instruction wins.',
    quickWin: false,
  },
  'vague-directive': {
    title: 'Replace vague directives',
    recommendation: 'Turn broad quality language into measurable rules.',
    quickWinTitle: 'Make vague rules measurable',
    quickWinMessage:
      'Swap broad wording for a concrete command, file pattern, or review criterion.',
    fallbackFixHint:
      'Replace vague language with a specific action and acceptance criterion so agents can apply the rule consistently.',
    quickWin: true,
  },
  'missing-context': {
    title: 'Add stack context',
    recommendation: 'Name the detected language, framework, and package manager in the rules.',
    quickWinTitle: 'Name the active stack',
    quickWinMessage: 'Add a short stack-context bullet near the top of the file.',
    fallbackFixHint:
      'Mention the relevant language, framework, and package manager so generated changes match this repository.',
    quickWin: false,
  },
  duplication: {
    title: 'Merge duplicate sections',
    recommendation: 'Remove or consolidate repeated guidance across rule files.',
    quickWinTitle: 'Delete obvious duplicate guidance',
    quickWinMessage:
      'Keep one copy of repeated sections and point companion files at the same policy.',
    fallbackFixHint:
      'Consolidate duplicated instructions into one source of truth so future edits do not drift apart.',
    quickWin: true,
  },
  'outdated-reference': {
    title: 'Refresh outdated references',
    recommendation: 'Replace deprecated tool and version references with current project guidance.',
    quickWinTitle: 'Update stale tool references',
    quickWinMessage: 'Replace clearly deprecated versions or tools with the current repo standard.',
    fallbackFixHint:
      'Update or remove stale tool references so agents do not run obsolete commands or target unsupported versions.',
    quickWin: true,
  },
  'priority-signal': {
    title: 'Add priority signals',
    recommendation: 'Mark required, recommended, and optional rules distinctly.',
    quickWinTitle: 'Add MUST/SHOULD/MAY wording',
    quickWinMessage: 'Mark the most important bullets with explicit priority language.',
    fallbackFixHint:
      'Use MUST for required rules, SHOULD for recommendations, and MAY for optional guidance so agents know what is enforceable.',
    quickWin: true,
  },
  structure: {
    title: 'Tighten rule structure',
    recommendation: 'Move actionable guidance earlier and balance oversized sections.',
    quickWinTitle: 'Move actionable rules up',
    quickWinMessage: 'Put the first concrete rule before long background text.',
    fallbackFixHint:
      'Reorder or split oversized sections so agents can find the actionable rule before context crowds it out.',
    quickWin: false,
  },
  examples: {
    title: 'Add concrete examples',
    recommendation: 'Include a short example that shows how to apply the rules.',
    quickWinTitle: 'Add one concrete example',
    quickWinMessage: 'Add a short code block, command, or before/after example.',
    fallbackFixHint:
      'Add a compact example showing the desired pattern so agents can copy the intended behavior instead of inferring it.',
    quickWin: true,
  },
  ambiguity: {
    title: 'Remove ambiguous wording',
    recommendation: 'Replace fuzzy qualifiers with explicit conditions.',
    quickWinTitle: 'Replace ambiguous qualifiers',
    quickWinMessage: 'Change words like "usually" or "maybe" into a condition and expected action.',
    fallbackFixHint:
      'Replace ambiguous qualifiers with a clear condition and outcome so agents know exactly when the rule applies.',
    quickWin: true,
  },
  custom: {
    title: 'Review custom rule finding',
    recommendation: 'Apply the custom rule guidance to keep the rule set consistent.',
    quickWinTitle: 'Address custom finding',
    quickWinMessage: 'Apply the custom rule fix if it is a small text-only edit.',
    fallbackFixHint:
      'Review the custom rule message and adjust the rule text so the underlying policy is explicit and testable.',
    quickWin: false,
  },
};

const RULE_FIX_HINTS: Readonly<Record<string, string>> = {
  'core.parse-errors':
    'Fix the parse error in the rule file so the audit can evaluate the full instruction set correctly.',
  'core.parse-warnings':
    'Clean up the parse warning so the rule file has an unambiguous structure for both humans and agents.',
  'heuristic.token-budget-overrun': AUDIT_CATEGORY_COPY['token-budget'].fallbackFixHint,
  'heuristic.conflicting-directives': AUDIT_CATEGORY_COPY.conflict.fallbackFixHint,
  'heuristic.cross-file-contradictions': AUDIT_CATEGORY_COPY.conflict.fallbackFixHint,
  'heuristic.vague-directives': AUDIT_CATEGORY_COPY['vague-directive'].fallbackFixHint,
  'heuristic.missing-stack-context': AUDIT_CATEGORY_COPY['missing-context'].fallbackFixHint,
  'heuristic.duplicate-sections': AUDIT_CATEGORY_COPY.duplication.fallbackFixHint,
  'heuristic.outdated-tool-references': AUDIT_CATEGORY_COPY['outdated-reference'].fallbackFixHint,
  'heuristic.missing-priority-signals': AUDIT_CATEGORY_COPY['priority-signal'].fallbackFixHint,
  'heuristic.verbose-preamble': AUDIT_CATEGORY_COPY.structure.fallbackFixHint,
  'heuristic.unbalanced-sections': AUDIT_CATEGORY_COPY.structure.fallbackFixHint,
  'heuristic.missing-examples': AUDIT_CATEGORY_COPY.examples.fallbackFixHint,
  'heuristic.ambiguous-instructions': AUDIT_CATEGORY_COPY.ambiguity.fallbackFixHint,
};

export function resolveViolationFixHint(
  violation: Pick<Violation<AuditCategory>, 'category' | 'fixHint' | 'ruleId'>,
): ResolvedViolationFixHint {
  if (violation.fixHint !== undefined && violation.fixHint.trim() !== '') {
    return { hint: violation.fixHint, source: 'rule' };
  }

  return {
    hint:
      RULE_FIX_HINTS[violation.ruleId] ??
      categoryFallback(violation.category) ??
      AUDIT_CATEGORY_COPY.custom.fallbackFixHint,
    source: 'fallback',
  };
}

export function getViolationFixHint(
  violation: Pick<Violation<AuditCategory>, 'category' | 'fixHint' | 'ruleId'>,
): string {
  return resolveViolationFixHint(violation).hint;
}

export function getAuditIssueCopy(category: AuditCategory | undefined): AuditIssueCopy {
  return category === undefined ? AUDIT_CATEGORY_COPY.custom : AUDIT_CATEGORY_COPY[category];
}

function categoryFallback(category: AuditCategory | undefined): string | undefined {
  return category === undefined ? undefined : AUDIT_CATEGORY_COPY[category].fallbackFixHint;
}
