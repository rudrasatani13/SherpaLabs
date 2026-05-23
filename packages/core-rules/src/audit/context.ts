import { countApproximateTokens } from '@sherpa-labs/core-utils';
import type { RuleFile, RuleSet, StackContext } from '@sherpa-labs/shared-types';
import { DEFAULT_AUDIT_CONFIG, resolveAuditConfig } from './config.js';
import type { AuditContext, AuditFileMetadata, ResolvedAuditConfig } from './types.js';

export interface CreateAuditContextOptions {
  readonly ruleSet: RuleSet;
  readonly stack: StackContext;
  readonly config?: ResolvedAuditConfig;
  readonly fileMetadata?: readonly AuditFileMetadata[];
}

export function createAuditContext(options: CreateAuditContextOptions): AuditContext {
  const config = options.config ?? resolveAuditConfig(DEFAULT_AUDIT_CONFIG);
  const fileMetadata = options.fileMetadata ?? options.ruleSet.files.map(buildFileMetadata);
  const totalTokenCount = fileMetadata.reduce((total, file) => total + file.tokenCount, 0);

  return {
    ruleSet: options.ruleSet,
    stack: options.stack,
    fileMetadata,
    totalTokenCount,
    config,
    thresholds: config.thresholds,
  };
}

export function buildFileMetadata(file: RuleFile): AuditFileMetadata {
  return {
    id: file.id,
    path: file.path,
    kind: file.kind,
    sizeBytes: file.sizeBytes,
    tokenCount: countApproximateTokens(file.content),
    ...(file.modifiedAt !== undefined ? { modifiedAt: file.modifiedAt } : {}),
    ...(file.encoding !== undefined ? { encoding: file.encoding } : {}),
  };
}
