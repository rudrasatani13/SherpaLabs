import type {
  StackContext,
  StackDetectionWarning,
  StackFramework,
  StackLanguage,
  StackManifest,
  StackPackageManager,
} from '@sherpa-labs/shared-types';
import { normalizePath } from '@sherpa-labs/core-utils';
import { detectAiTools } from './ai-tools.js';
import { resolveRoot } from './fs.js';
import { detectGo } from './go.js';
import { detectNode } from './node.js';
import { detectPhp } from './php.js';
import { detectPython } from './python.js';
import { detectRuby } from './ruby.js';
import { detectRust } from './rust.js';
import { detectTypeScript } from './typescript.js';

export interface DetectStackOptions {
  readonly rootPath: string;
}

export async function detectStack(options: DetectStackOptions): Promise<StackContext> {
  const absoluteRoot = resolveRoot(options.rootPath);
  const normalizedRoot = normalizePath(absoluteRoot);

  const [node, python, rust, go, php, ruby, aiTools] = await Promise.all([
    detectNode(absoluteRoot),
    detectPython(absoluteRoot),
    detectRust(absoluteRoot),
    detectGo(absoluteRoot),
    detectPhp(absoluteRoot),
    detectRuby(absoluteRoot),
    detectAiTools(absoluteRoot),
  ]);

  const typescript = await detectTypeScript(absoluteRoot, {
    hasDependency: node.hasTypeScriptInDeps,
  });

  const languages = new Set<StackLanguage>();

  if (node.detected) {
    if (typescript.hasTypeScript) {
      languages.add('typescript');
    } else {
      languages.add('javascript');
    }
  } else if (typescript.hasTypeScript) {
    languages.add('typescript');
  }

  if (python.detected) {
    languages.add('python');
  }

  if (rust.detected) {
    languages.add('rust');
  }

  if (go.detected) {
    languages.add('go');
  }

  if (php.detected) {
    languages.add('php');
  }

  if (ruby.detected) {
    languages.add('ruby');
  }

  const frameworks: StackFramework[] = [];
  const seenFrameworks = new Set<StackFramework>();
  for (const list of [
    node.frameworks,
    python.frameworks,
    rust.frameworks,
    go.frameworks,
    php.frameworks,
    ruby.frameworks,
  ]) {
    for (const framework of list) {
      if (!seenFrameworks.has(framework)) {
        seenFrameworks.add(framework);
        frameworks.push(framework);
      }
    }
  }

  const packageManagers: StackPackageManager[] = [];
  const seenPackageManagers = new Set<StackPackageManager>();
  for (const list of [
    node.packageManagers,
    python.packageManagers,
    rust.packageManagers,
    go.packageManagers,
    php.packageManagers,
    ruby.packageManagers,
  ]) {
    for (const manager of list) {
      if (!seenPackageManagers.has(manager)) {
        seenPackageManagers.add(manager);
        packageManagers.push(manager);
      }
    }
  }

  const manifests: StackManifest[] = [];
  const seenManifestKeys = new Set<string>();
  for (const list of [
    node.manifests,
    python.manifests,
    rust.manifests,
    go.manifests,
    php.manifests,
    ruby.manifests,
    typescript.manifests,
  ]) {
    for (const manifest of list) {
      const key = `${manifest.kind}::${manifest.relativePath}`;
      if (!seenManifestKeys.has(key)) {
        seenManifestKeys.add(key);
        manifests.push(manifest);
      }
    }
  }

  const warnings: StackDetectionWarning[] = [];
  for (const list of [
    node.warnings,
    python.warnings,
    rust.warnings,
    go.warnings,
    php.warnings,
    ruby.warnings,
    typescript.warnings,
  ]) {
    for (const warning of list) {
      warnings.push(warning);
    }
  }

  return {
    rootPath: normalizedRoot,
    languages: Array.from(languages),
    frameworks,
    packageManagers,
    manifests,
    aiTools: aiTools.aiTools,
    hasTypeScript: typescript.hasTypeScript,
    warnings,
  };
}
