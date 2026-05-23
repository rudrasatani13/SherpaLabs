import type { StackAiTool } from '@sherpa-labs/shared-types';
import { buildAiTool, isExistingDirectory, isExistingFile } from './fs.js';

export interface AiToolsDetectionResult {
  readonly aiTools: readonly StackAiTool[];
}

export async function detectAiTools(rootPath: string): Promise<AiToolsDetectionResult> {
  const tools: StackAiTool[] = [];

  if (await isExistingFile(rootPath, 'CLAUDE.md')) {
    tools.push(buildAiTool(rootPath, 'claude-code', 'CLAUDE.md'));
  }

  if (await isExistingFile(rootPath, '.cursorrules')) {
    tools.push(buildAiTool(rootPath, 'cursor-rules-file', '.cursorrules'));
  }

  if (await isExistingDirectory(rootPath, '.cursor/rules')) {
    tools.push(buildAiTool(rootPath, 'cursor-rules-dir', '.cursor/rules'));
  }

  if (await isExistingFile(rootPath, 'AGENTS.md')) {
    tools.push(buildAiTool(rootPath, 'agents-md', 'AGENTS.md'));
  }

  if (await isExistingFile(rootPath, '.windsurfrules')) {
    tools.push(buildAiTool(rootPath, 'windsurf-rules', '.windsurfrules'));
  }

  if (await isExistingFile(rootPath, '.continue/config.yaml')) {
    tools.push(buildAiTool(rootPath, 'continue-config', '.continue/config.yaml'));
  }

  return { aiTools: tools };
}
