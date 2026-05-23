import { defaultAuditRules } from './rules/index.js';
import { resolveAuditConfig, type SherpaJsonAuditConfig } from './config.js';
import type { AuditRule, AuditRuleModule, ResolvedAuditConfig } from './types.js';

export interface RegisteredAuditRule {
  readonly rule: AuditRule;
  readonly enabled: boolean;
}

export class AuditRuleRegistry {
  readonly #rules: readonly AuditRule[];

  constructor(ruleSources: readonly AuditRuleModule[] = defaultAuditRules) {
    this.#rules = normalizeAuditRules(ruleSources);
  }

  getRules(): readonly AuditRule[] {
    return this.#rules;
  }

  getEnabledRules(config: SherpaJsonAuditConfig | ResolvedAuditConfig = {}): readonly AuditRule[] {
    const resolvedConfig = resolveAuditConfig(config);

    return this.#rules
      .map((rule) => applyConfig(rule, resolvedConfig))
      .filter((registered) => registered.enabled)
      .map((registered) => registered.rule);
  }
}

export function createAuditRuleRegistry(
  ruleSources: readonly AuditRuleModule[] = defaultAuditRules,
): AuditRuleRegistry {
  return new AuditRuleRegistry(ruleSources);
}

export function normalizeAuditRules(ruleSources: readonly AuditRuleModule[]): readonly AuditRule[] {
  const rules = ruleSources.flatMap((source) => rulesFromSource(source));
  const seen = new Set<string>();

  for (const rule of rules) {
    if (seen.has(rule.id)) {
      throw new Error(`Duplicate audit rule id: ${rule.id}`);
    }

    seen.add(rule.id);
  }

  return rules;
}

function rulesFromSource(source: AuditRuleModule): readonly AuditRule[] {
  if (isAuditRuleArray(source)) {
    return source;
  }

  if (isAuditRule(source)) {
    return [source];
  }

  if (!isAuditRuleModuleObject(source)) {
    return [];
  }

  const rules: AuditRule[] = [];

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

function isAuditRuleArray(value: AuditRuleModule): value is readonly AuditRule[] {
  return Array.isArray(value);
}

function isAuditRuleModuleObject(value: AuditRuleModule): value is {
  readonly default?: AuditRule | readonly AuditRule[];
  readonly rule?: AuditRule;
  readonly rules?: readonly AuditRule[];
} {
  return (
    typeof value === 'object' && value !== null && !Array.isArray(value) && !isAuditRule(value)
  );
}

function applyConfig(rule: AuditRule, config: ResolvedAuditConfig): RegisteredAuditRule {
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

function isAuditRule(value: unknown): value is AuditRule {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<AuditRule>;

  return (
    typeof candidate.id === 'string' &&
    (candidate.severity === 'error' ||
      candidate.severity === 'warning' ||
      candidate.severity === 'info') &&
    typeof candidate.title === 'string' &&
    typeof candidate.description === 'string' &&
    typeof candidate.check === 'function'
  );
}
