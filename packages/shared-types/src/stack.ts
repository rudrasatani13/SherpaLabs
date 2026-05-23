export type StackLanguage = 'typescript' | 'javascript' | 'python' | 'rust' | 'go' | 'php' | 'ruby';

export type StackFramework =
  | 'nextjs'
  | 'nuxt'
  | 'remix'
  | 'react'
  | 'vue'
  | 'svelte'
  | 'sveltekit'
  | 'astro'
  | 'vite'
  | 'express'
  | 'hono'
  | 'fastify'
  | 'nestjs'
  | 'fastapi'
  | 'starlette'
  | 'django'
  | 'flask'
  | 'actix-web'
  | 'rocket'
  | 'axum'
  | 'gin'
  | 'echo'
  | 'fiber'
  | 'laravel'
  | 'symfony'
  | 'rails'
  | 'sinatra';

export type StackPackageManager =
  | 'npm'
  | 'pnpm'
  | 'yarn'
  | 'bun'
  | 'pip'
  | 'poetry'
  | 'uv'
  | 'cargo'
  | 'go-modules'
  | 'composer'
  | 'bundler';

export type StackManifestKind =
  | 'package.json'
  | 'pnpm-lock.yaml'
  | 'package-lock.json'
  | 'yarn.lock'
  | 'bun.lock'
  | 'bun.lockb'
  | 'pyproject.toml'
  | 'requirements.txt'
  | 'Cargo.toml'
  | 'Cargo.lock'
  | 'go.mod'
  | 'go.sum'
  | 'composer.json'
  | 'composer.lock'
  | 'Gemfile'
  | 'Gemfile.lock'
  | 'tsconfig.json';

export type StackAiToolKind =
  | 'claude-code'
  | 'cursor-rules-file'
  | 'cursor-rules-dir'
  | 'agents-md'
  | 'windsurf-rules'
  | 'continue-config';

export type StackDetectionWarningCode = 'malformed_manifest' | 'unreadable_manifest';

export interface StackManifest {
  readonly kind: StackManifestKind;
  readonly path: string;
  readonly relativePath: string;
}

export interface StackAiTool {
  readonly kind: StackAiToolKind;
  readonly path: string;
  readonly relativePath: string;
}

export interface StackDetectionWarning {
  readonly code: StackDetectionWarningCode;
  readonly manifest: StackManifestKind;
  readonly path: string;
  readonly message: string;
}

export interface StackContext {
  readonly rootPath: string;
  readonly languages: readonly StackLanguage[];
  readonly frameworks: readonly StackFramework[];
  readonly packageManagers: readonly StackPackageManager[];
  readonly manifests: readonly StackManifest[];
  readonly aiTools: readonly StackAiTool[];
  readonly hasTypeScript: boolean;
  readonly warnings: readonly StackDetectionWarning[];
}
