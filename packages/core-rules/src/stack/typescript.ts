import type { StackDetectionWarning, StackManifest } from '@sherpa-labs/shared-types';
import { buildManifest, isExistingFile, scanForTypeScriptSources } from './fs.js';

export interface TypeScriptDetectionResult {
  readonly hasTypeScript: boolean;
  readonly manifests: readonly StackManifest[];
  readonly warnings: readonly StackDetectionWarning[];
}

export async function detectTypeScript(
  rootPath: string,
  options: { readonly hasDependency: boolean },
): Promise<TypeScriptDetectionResult> {
  const manifests: StackManifest[] = [];

  const hasTsconfig = await isExistingFile(rootPath, 'tsconfig.json');
  if (hasTsconfig) {
    manifests.push(buildManifest(rootPath, 'tsconfig.json', 'tsconfig.json'));
  }

  if (hasTsconfig || options.hasDependency) {
    return {
      hasTypeScript: true,
      manifests,
      warnings: [],
    };
  }

  const scan = await scanForTypeScriptSources(rootPath);

  return {
    hasTypeScript: scan.found,
    manifests,
    warnings: [],
  };
}
