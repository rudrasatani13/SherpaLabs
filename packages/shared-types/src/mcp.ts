import type { EntityId, IsoDateString, JsonObject } from './common';
import type { Violation } from './audit';

export type McpTransport = 'stdio' | 'sse' | 'streamable-http' | 'unknown';

export type McpCapabilityName =
  | 'tools'
  | 'resources'
  | 'prompts'
  | 'logging'
  | 'sampling'
  | 'roots'
  | 'experimental';

export interface McpServerCapability {
  readonly name: McpCapabilityName;
  readonly enabled: boolean;
  readonly details?: JsonObject;
}

export interface McpToolInfo {
  readonly name: string;
  readonly description?: string;
  readonly inputSchema?: JsonObject;
  readonly outputSchema?: JsonObject;
}

export interface McpResourceInfo {
  readonly uri: string;
  readonly name?: string;
  readonly description?: string;
  readonly mimeType?: string;
}

export interface McpPromptInfo {
  readonly name: string;
  readonly description?: string;
  readonly arguments?: readonly McpPromptArgument[];
}

export interface McpPromptArgument {
  readonly name: string;
  readonly description?: string;
  readonly required: boolean;
}

export interface McpServerInfo {
  readonly id?: EntityId;
  readonly name: string;
  readonly version?: string;
  readonly protocolVersion?: string;
  readonly transport: McpTransport;
  readonly command?: readonly string[];
  readonly url?: string;
  readonly capabilities: readonly McpServerCapability[];
  readonly tools: readonly McpToolInfo[];
  readonly resources: readonly McpResourceInfo[];
  readonly prompts: readonly McpPromptInfo[];
  readonly discoveredAt?: IsoDateString;
}

export type McpLintCategory = 'protocol' | 'schema' | 'security' | 'performance';

export type McpViolation = Violation<McpLintCategory> & {
  readonly category: McpLintCategory;
  readonly evidence?: string;
};

export interface McpLintResult {
  readonly id: EntityId;
  readonly server: McpServerInfo;
  readonly score: number;
  readonly maxScore: number;
  readonly passed: boolean;
  readonly categoryScores: Readonly<Record<McpLintCategory, number>>;
  readonly violationsByCategory: Readonly<Record<McpLintCategory, readonly McpViolation[]>>;
  readonly recommendations: readonly string[];
  readonly lintedAt: IsoDateString;
}
