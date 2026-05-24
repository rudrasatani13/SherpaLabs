import type {
  EntityId,
  JsonObject,
  JsonValue,
  McpLintCategory,
  McpTransport,
  ViolationSeverity,
} from '@sherpa-labs/shared-types';

export type LintRuleCategory = McpLintCategory;
export type LintRuleSeverity = ViolationSeverity;
export type LintMessageDirection = 'client-to-server' | 'server-to-client';
export type LintMessagePhase = 'pre-initialize' | 'initialize' | 'post-initialize' | 'shutdown';
export type LintTransportChannel = 'stdin' | 'stdout' | 'stderr' | 'http' | 'sse';
export type LintFilesystemAccessOutcome = 'allowed' | 'rejected' | 'unknown';

export interface LintProtocolMessage {
  readonly direction: LintMessageDirection;
  readonly phase?: LintMessagePhase;
  readonly channel?: LintTransportChannel;
  readonly raw?: string;
  readonly message?: JsonValue;
  readonly malformed?: boolean;
  readonly error?: string;
}

export interface LintErrorObservation {
  readonly method?: string;
  readonly code?: number;
  readonly message: string;
  readonly data?: JsonValue;
  readonly location?: string;
}

export interface LintInitializeObservation {
  readonly request?: JsonValue;
  readonly response?: JsonValue;
  readonly result?: JsonValue;
  readonly error?: LintErrorObservation;
  readonly completed?: boolean;
  readonly initializedNotificationSent?: boolean;
}

export interface LintToolCallObservation {
  readonly name?: string;
  readonly arguments?: JsonValue;
  readonly result?: JsonValue;
  readonly structuredContent?: JsonValue;
  readonly content?: JsonValue;
  readonly isError?: boolean;
  readonly responseBytes?: number;
  readonly safe?: boolean;
  readonly error?: LintErrorObservation;
}

export interface LintToolObservation {
  readonly name?: string;
  readonly description?: string;
  readonly inputSchema?: JsonValue;
  readonly outputSchema?: JsonValue;
  readonly annotations?: JsonObject;
  readonly calls?: readonly LintToolCallObservation[];
}

export interface LintResourceReadObservation {
  readonly uri?: string;
  readonly result?: JsonValue;
  readonly responseBytes?: number;
  readonly error?: LintErrorObservation;
}

export interface LintResourceObservation {
  readonly uri?: string;
  readonly name?: string;
  readonly description?: string;
  readonly mimeType?: string;
  readonly size?: number;
  readonly reads?: readonly LintResourceReadObservation[];
}

export interface LintPromptArgumentObservation {
  readonly name?: string;
  readonly description?: string;
  readonly required?: boolean;
}

export interface LintPromptObservation {
  readonly name?: string;
  readonly description?: string;
  readonly arguments?: readonly LintPromptArgumentObservation[];
  readonly getResult?: JsonValue;
}

export interface LintMethodObservation {
  readonly method: string;
  readonly ok: boolean;
  readonly errorCode?: number;
  readonly result?: JsonValue;
  readonly status?: number;
  readonly requestHeaders?: Readonly<Record<string, string>>;
  readonly responseHeaders?: Readonly<Record<string, string>>;
  readonly requestBytes?: number;
  readonly responseBytes?: number;
}

export interface LintTimings {
  readonly initializeMs?: number;
  readonly toolsListMs?: number;
  readonly resourcesListMs?: number;
  readonly promptsListMs?: number;
  readonly methods?: Readonly<Record<string, number>>;
}

export interface LintStdioMetadata {
  readonly stdoutLines?: readonly string[];
  readonly stdoutHadPartialLine?: boolean;
}

export interface LintHttpMetadata {
  readonly postAcceptHeader?: string;
  readonly postContentType?: string;
  readonly postResponseContentTypes?: readonly string[];
  readonly notificationStatus?: number;
  readonly notificationBodyBytes?: number;
  readonly protocolVersionHeader?: string;
  readonly invalidProtocolVersionStatus?: number;
  readonly missingSessionStatus?: number;
  readonly sessionId?: string;
  readonly originRejected?: boolean;
  readonly bindAddress?: string;
  readonly authenticated?: boolean;
}

export interface LintFilesystemAccessObservation {
  readonly operation?: string;
  readonly path: string;
  readonly resolvedPath?: string;
  readonly allowedRoot?: string;
  readonly outcome: LintFilesystemAccessOutcome;
  readonly reason?: string;
}

export interface LintTextObservation {
  readonly path: string;
  readonly text: string;
}

export interface LintMetadata {
  readonly supportedProtocolVersions?: readonly string[];
  readonly stdio?: LintStdioMetadata;
  readonly http?: LintHttpMetadata;
  readonly unknownMethod?: LintMethodObservation;
  readonly methodObservations?: readonly LintMethodObservation[];
  readonly filesystemAccess?: readonly LintFilesystemAccessObservation[];
  readonly allowedRoots?: readonly string[];
  readonly listPayloadBytes?: Readonly<Partial<Record<'tools' | 'resources' | 'prompts', number>>>;
  readonly scanText?: readonly LintTextObservation[];
}

export type LintThresholds = Readonly<Record<string, number>>;

export interface LintRuleOverride {
  readonly enabled?: boolean;
  readonly severity?: LintRuleSeverity;
  readonly thresholds?: Readonly<Record<string, number>>;
}

export interface LintConfig {
  readonly failUnder?: number;
  readonly ignoredRules?: readonly string[];
  readonly includedRules?: readonly string[];
  readonly ruleOverrides?: Readonly<Record<string, LintRuleOverride>>;
  readonly severityOverrides?: Readonly<Record<string, LintRuleSeverity>>;
  readonly severityWeights?: Readonly<Partial<Record<LintRuleSeverity, number>>>;
  readonly thresholds?: LintThresholds;
}

export interface ResolvedLintConfig {
  readonly failUnder?: number;
  readonly ignoredRules: readonly string[];
  readonly includedRules: readonly string[];
  readonly ruleOverrides: Readonly<Record<string, LintRuleOverride>>;
  readonly severityWeights: Readonly<Record<LintRuleSeverity, number>>;
  readonly thresholds: LintThresholds;
}

export interface LintContext {
  readonly transport: McpTransport;
  readonly protocolVersion?: string;
  readonly initialize?: LintInitializeObservation;
  readonly capabilities: JsonObject;
  readonly serverInfo?: JsonObject;
  readonly tools: readonly LintToolObservation[];
  readonly resources: readonly LintResourceObservation[];
  readonly prompts: readonly LintPromptObservation[];
  readonly messages: readonly LintProtocolMessage[];
  readonly timings: LintTimings;
  readonly errors: readonly LintErrorObservation[];
  readonly metadata: LintMetadata;
  readonly config: ResolvedLintConfig;
  readonly thresholds: LintThresholds;
}

export interface LintRuleViolationInput {
  readonly message: string;
  readonly location?: string;
  readonly evidence?: string;
  readonly fixHint: string;
}

export interface LintViolation extends LintRuleViolationInput {
  readonly id: EntityId;
  readonly ruleId: string;
  readonly category: LintRuleCategory;
  readonly severity: LintRuleSeverity;
}

export interface LintRuleCheckResult {
  readonly violations?: readonly LintRuleViolationInput[];
}

export type LintRuleCheckReturn =
  | LintRuleCheckResult
  | readonly LintRuleViolationInput[]
  | Promise<LintRuleCheckResult | readonly LintRuleViolationInput[]>;

export interface LintRule {
  readonly id: string;
  readonly category: LintRuleCategory;
  readonly severity: LintRuleSeverity;
  readonly title: string;
  readonly description: string;
  check(context: LintContext): LintRuleCheckReturn;
}

export type LintRuleModule =
  | LintRule
  | readonly LintRule[]
  | {
      readonly default?: LintRule | readonly LintRule[];
      readonly rule?: LintRule;
      readonly rules?: readonly LintRule[];
    };

export interface LintSummary {
  readonly errorCount: number;
  readonly warningCount: number;
  readonly infoCount: number;
  readonly violationCount: number;
}

export interface LintServerSummary {
  readonly transport: McpTransport;
  readonly protocolVersion?: string;
  readonly name?: string;
  readonly version?: string;
  readonly capabilities: readonly string[];
  readonly toolCount: number;
  readonly resourceCount: number;
  readonly promptCount: number;
}

export interface LintResult {
  readonly id: EntityId;
  readonly server: LintServerSummary;
  readonly score: number;
  readonly maxScore: number;
  readonly passed: boolean;
  readonly violations: readonly LintViolation[];
  readonly summary: LintSummary;
  readonly rulesRun: readonly string[];
  readonly lintedAt: string;
}
