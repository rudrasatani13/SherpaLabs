import { resolveLintConfig } from './context.js';
import { defaultLintRules } from './rules/index.js';
import type { LintConfig, LintRule, LintRuleModule, ResolvedLintConfig } from './types.js';

export interface RegisteredLintRule {
  readonly rule: LintRule;
  readonly enabled: boolean;
}

export class LintRuleRegistry {
  readonly #rules: readonly LintRule[];

  constructor(ruleSources: readonly LintRuleModule[] = defaultLintRules) {
    this.#rules = normalizeLintRules(ruleSources);
  }

  getRules(): readonly LintRule[] {
    return this.#rules;
  }

  getEnabledRules(config: LintConfig | ResolvedLintConfig = {}): readonly LintRule[] {
    const resolvedConfig = resolveLintConfig(config);

    return this.#rules
      .map((rule) => applyConfig(rule, resolvedConfig))
      .filter((registered) => registered.enabled)
      .map((registered) => registered.rule);
  }
}

export function createLintRuleRegistry(
  ruleSources: readonly LintRuleModule[] = defaultLintRules,
): LintRuleRegistry {
  return new LintRuleRegistry(ruleSources);
}

export function normalizeLintRules(ruleSources: readonly LintRuleModule[]): readonly LintRule[] {
  const rules = ruleSources.flatMap((source) => rulesFromSource(source));
  const seen = new Set<string>();

  for (const rule of rules) {
    if (seen.has(rule.id)) {
      throw new Error(`Duplicate MCP lint rule id: ${rule.id}`);
    }

    seen.add(rule.id);
  }

  return rules;
}

function rulesFromSource(source: LintRuleModule): readonly LintRule[] {
  if (isLintRuleArray(source)) {
    return source;
  }

  if (isLintRule(source)) {
    return [source];
  }

  if (!isLintRuleModuleObject(source)) {
    return [];
  }

  const rules: LintRule[] = [];

  if (source.default !== undefined) {
    rules.push(...rulesFromSource(source.default));
  }

  if (source.rule !== undefined) {
    rules.push(source.rule);
  }

  if (source.rules !== undefined) {
    rules.push(...source.rules);
  }

  return rules;
}

function isLintRuleArray(value: LintRuleModule): value is readonly LintRule[] {
  return Array.isArray(value);
}

function isLintRuleModuleObject(value: LintRuleModule): value is {
  readonly default?: LintRule | readonly LintRule[];
  readonly rule?: LintRule;
  readonly rules?: readonly LintRule[];
} {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !isLintRule(value);
}

function applyConfig(rule: LintRule, config: ResolvedLintConfig): RegisteredLintRule {
  const includedRules = new Set(config.includedRules);
  const ignoredRules = new Set(config.ignoredRules);
  const override = config.ruleOverrides[rule.id];
  const enabled =
    (includedRules.size === 0 || includedRules.has(rule.id)) &&
    !ignoredRules.has(rule.id) &&
    override?.enabled !== false;
  const severity = override?.severity ?? rule.severity;
  const effectiveRule = severity === rule.severity ? rule : { ...rule, severity };

  return { rule: effectiveRule, enabled };
}

function isLintRule(value: unknown): value is LintRule {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<LintRule>;

  return (
    typeof candidate.id === 'string' &&
    (candidate.category === 'protocol' ||
      candidate.category === 'schema' ||
      candidate.category === 'security' ||
      candidate.category === 'performance') &&
    (candidate.severity === 'error' ||
      candidate.severity === 'warning' ||
      candidate.severity === 'info') &&
    typeof candidate.title === 'string' &&
    typeof candidate.description === 'string' &&
    typeof candidate.check === 'function'
  );
}
