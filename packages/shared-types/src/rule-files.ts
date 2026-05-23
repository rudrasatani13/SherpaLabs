import type { EntityId, IsoDateString } from './common';

export type RuleFileKind =
  | 'claude-md'
  | 'cursor-rules'
  | 'cursor-rule'
  | 'agents-md'
  | 'windsurf-rules'
  | 'continue-config'
  | 'unknown';

export type RuleSetFormat = RuleFileKind | 'mixed';

export interface RuleFile {
  readonly id: EntityId;
  readonly path: string;
  readonly kind: RuleFileKind;
  readonly content: string;
  readonly sizeBytes: number;
  readonly modifiedAt?: IsoDateString;
  readonly encoding?: string;
}

export interface RuleLocation {
  readonly filePath?: string;
  readonly startLine?: number;
  readonly startColumn?: number;
  readonly endLine?: number;
  readonly endColumn?: number;
}

export interface RuleHeading {
  readonly depth: number;
  readonly text: string;
  readonly location?: RuleLocation;
}

export type RuleDirectivePriority = 'must' | 'should' | 'may' | 'unknown';

export interface RuleDirective {
  readonly id: EntityId;
  readonly text: string;
  readonly priority?: RuleDirectivePriority;
  readonly location?: RuleLocation;
}

export interface RuleCodeBlock {
  readonly id: EntityId;
  readonly code: string;
  readonly language?: string;
  readonly location?: RuleLocation;
}

export interface RuleSection {
  readonly id: EntityId;
  readonly text: string;
  readonly heading?: RuleHeading;
  readonly directives: readonly RuleDirective[];
  readonly codeBlocks: readonly RuleCodeBlock[];
  readonly location?: RuleLocation;
}

export interface RuleParseError {
  readonly message: string;
  readonly severity: 'warning' | 'error';
  readonly location?: RuleLocation;
}

export interface RuleSet {
  readonly id: EntityId;
  readonly format: RuleSetFormat;
  readonly files: readonly RuleFile[];
  readonly sections: readonly RuleSection[];
  readonly directives: readonly RuleDirective[];
  readonly codeBlocks: readonly RuleCodeBlock[];
  readonly parseErrors: readonly RuleParseError[];
}
