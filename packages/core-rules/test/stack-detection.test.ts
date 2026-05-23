import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { detectStack } from '../src/stack/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURES_ROOT = join(here, 'fixtures', 'stacks');

function fixturePath(name: string): string {
  return join(FIXTURES_ROOT, name);
}

describe('detectStack — Next.js + TypeScript + Claude + Cursor', () => {
  it('detects Next.js, React, TypeScript, pnpm, CLAUDE.md, .cursorrules, .cursor/rules', async () => {
    const context = await detectStack({ rootPath: fixturePath('nextjs-ts-claude-cursor') });

    expect(context.languages).toContain('typescript');
    expect(context.languages).not.toContain('javascript');
    expect(context.frameworks).toContain('nextjs');
    expect(context.frameworks).toContain('react');
    expect(context.packageManagers).toContain('pnpm');
    expect(context.hasTypeScript).toBe(true);

    const manifestKinds = context.manifests.map((m) => m.kind);
    expect(manifestKinds).toContain('package.json');
    expect(manifestKinds).toContain('pnpm-lock.yaml');
    expect(manifestKinds).toContain('tsconfig.json');

    const aiToolKinds = context.aiTools.map((tool) => tool.kind);
    expect(aiToolKinds).toContain('claude-code');
    expect(aiToolKinds).toContain('cursor-rules-file');
    expect(aiToolKinds).toContain('cursor-rules-dir');

    expect(context.warnings).toEqual([]);
  });
});

describe('detectStack — React + Vite', () => {
  it('detects React, Vite, npm lockfile, TypeScript via dependency', async () => {
    const context = await detectStack({ rootPath: fixturePath('react-vite') });

    expect(context.frameworks).toContain('react');
    expect(context.frameworks).toContain('vite');
    expect(context.packageManagers).toContain('npm');
    expect(context.hasTypeScript).toBe(true);
    expect(context.aiTools).toEqual([]);
  });
});

describe('detectStack — Vue', () => {
  it('detects Vue, yarn lockfile, AGENTS.md', async () => {
    const context = await detectStack({ rootPath: fixturePath('vue-app') });

    expect(context.frameworks).toContain('vue');
    expect(context.frameworks).toContain('vite');
    expect(context.packageManagers).toContain('yarn');
    expect(context.hasTypeScript).toBe(false);
    expect(context.aiTools.map((tool) => tool.kind)).toContain('agents-md');
  });
});

describe('detectStack — SvelteKit', () => {
  it('detects Svelte, SvelteKit, bun, .windsurfrules', async () => {
    const context = await detectStack({ rootPath: fixturePath('sveltekit-app') });

    expect(context.frameworks).toContain('svelte');
    expect(context.frameworks).toContain('sveltekit');
    expect(context.packageManagers).toContain('bun');
    expect(context.aiTools.map((tool) => tool.kind)).toContain('windsurf-rules');
    expect(context.hasTypeScript).toBe(true);
  });
});

describe('detectStack — Express + Hono API', () => {
  it('detects Express and Hono, npm fallback when no lockfile', async () => {
    const context = await detectStack({ rootPath: fixturePath('express-api') });

    expect(context.frameworks).toContain('express');
    expect(context.frameworks).toContain('hono');
    expect(context.packageManagers).toContain('npm');
    expect(context.languages).toContain('javascript');
    expect(context.hasTypeScript).toBe(false);
  });
});

describe('detectStack — FastAPI Python project', () => {
  it('detects Python, FastAPI, pip from pyproject + continue config', async () => {
    const context = await detectStack({ rootPath: fixturePath('fastapi-app') });

    expect(context.languages).toContain('python');
    expect(context.frameworks).toContain('fastapi');
    expect(context.packageManagers.length).toBeGreaterThan(0);

    const aiToolKinds = context.aiTools.map((tool) => tool.kind);
    expect(aiToolKinds).toContain('continue-config');
  });
});

describe('detectStack — Django + Flask Python project (poetry + requirements.txt)', () => {
  it('detects Django from poetry, Flask from requirements.txt, poetry + pip managers', async () => {
    const context = await detectStack({ rootPath: fixturePath('django-app') });

    expect(context.languages).toContain('python');
    expect(context.frameworks).toContain('django');
    expect(context.frameworks).toContain('flask');
    expect(context.packageManagers).toContain('poetry');
    expect(context.packageManagers).toContain('pip');
  });
});

describe('detectStack — Rust + actix-web', () => {
  it('detects Rust, actix-web framework, cargo', async () => {
    const context = await detectStack({ rootPath: fixturePath('rust-actix') });

    expect(context.languages).toContain('rust');
    expect(context.frameworks).toContain('actix-web');
    expect(context.packageManagers).toContain('cargo');

    const manifestKinds = context.manifests.map((m) => m.kind);
    expect(manifestKinds).toContain('Cargo.toml');
    expect(manifestKinds).toContain('Cargo.lock');
  });
});

describe('detectStack — Go + Gin', () => {
  it('detects Go, Gin framework, go-modules', async () => {
    const context = await detectStack({ rootPath: fixturePath('go-gin') });

    expect(context.languages).toContain('go');
    expect(context.frameworks).toContain('gin');
    expect(context.packageManagers).toContain('go-modules');
  });
});

describe('detectStack — PHP + Laravel', () => {
  it('detects PHP, Laravel framework, composer', async () => {
    const context = await detectStack({ rootPath: fixturePath('php-laravel') });

    expect(context.languages).toContain('php');
    expect(context.frameworks).toContain('laravel');
    expect(context.packageManagers).toContain('composer');
  });
});

describe('detectStack — Ruby + Rails', () => {
  it('detects Ruby, Rails framework, bundler; ignores commented gems', async () => {
    const context = await detectStack({ rootPath: fixturePath('ruby-rails') });

    expect(context.languages).toContain('ruby');
    expect(context.frameworks).toContain('rails');
    expect(context.frameworks).not.toContain('sinatra');
    expect(context.packageManagers).toContain('bundler');
  });
});

describe('detectStack — polyglot repo', () => {
  it('detects multiple languages and frameworks simultaneously', async () => {
    const context = await detectStack({ rootPath: fixturePath('polyglot') });

    expect(context.languages).toEqual(expect.arrayContaining(['typescript', 'python', 'go']));
    expect(context.frameworks).toEqual(
      expect.arrayContaining(['nestjs', 'fastify', 'fastapi', 'starlette', 'echo']),
    );
    expect(context.packageManagers).toEqual(expect.arrayContaining(['npm', 'uv', 'go-modules']));
    expect(context.aiTools.map((tool) => tool.kind)).toContain('claude-code');
  });
});

describe('detectStack — empty repo', () => {
  it('returns an empty StackContext without crashing', async () => {
    const context = await detectStack({ rootPath: fixturePath('empty-repo') });

    expect(context.languages).toEqual([]);
    expect(context.frameworks).toEqual([]);
    expect(context.packageManagers).toEqual([]);
    expect(context.manifests).toEqual([]);
    expect(context.aiTools).toEqual([]);
    expect(context.hasTypeScript).toBe(false);
    expect(context.warnings).toEqual([]);
  });
});

describe('detectStack — malformed package.json', () => {
  it('emits malformed_manifest warning and still produces a StackContext', async () => {
    const context = await detectStack({ rootPath: fixturePath('malformed-package-json') });

    expect(context.warnings.length).toBeGreaterThan(0);
    const warning = context.warnings[0];
    expect(warning?.code).toBe('malformed_manifest');
    expect(warning?.manifest).toBe('package.json');
    expect(context.manifests.some((m) => m.kind === 'package.json')).toBe(true);
    expect(context.frameworks).toEqual([]);
  });
});

describe('detectStack — malformed pyproject.toml', () => {
  it('emits malformed_manifest warning rather than crashing', async () => {
    const context = await detectStack({ rootPath: fixturePath('malformed-pyproject') });

    expect(context.warnings.length).toBeGreaterThan(0);
    const warning = context.warnings[0];
    expect(warning?.code).toBe('malformed_manifest');
    expect(warning?.manifest).toBe('pyproject.toml');
    expect(context.languages).toContain('python');
    expect(context.frameworks).toEqual([]);
  });
});

describe('StackContext shape', () => {
  it('always returns the same top-level keys regardless of repo content', async () => {
    const contexts = await Promise.all([
      detectStack({ rootPath: fixturePath('empty-repo') }),
      detectStack({ rootPath: fixturePath('nextjs-ts-claude-cursor') }),
      detectStack({ rootPath: fixturePath('rust-actix') }),
    ]);

    for (const context of contexts) {
      expect(Object.keys(context).sort()).toEqual(
        [
          'aiTools',
          'frameworks',
          'hasTypeScript',
          'languages',
          'manifests',
          'packageManagers',
          'rootPath',
          'warnings',
        ].sort(),
      );

      expect(typeof context.rootPath).toBe('string');
      expect(Array.isArray(context.languages)).toBe(true);
      expect(Array.isArray(context.frameworks)).toBe(true);
      expect(Array.isArray(context.packageManagers)).toBe(true);
      expect(Array.isArray(context.manifests)).toBe(true);
      expect(Array.isArray(context.aiTools)).toBe(true);
      expect(typeof context.hasTypeScript).toBe('boolean');
      expect(Array.isArray(context.warnings)).toBe(true);
    }
  });
});

describe('detectStack — missing root path', () => {
  it('returns an empty context without crashing for a non-existent directory', async () => {
    const context = await detectStack({
      rootPath: fixturePath('does-not-exist-anywhere'),
    });

    expect(context.languages).toEqual([]);
    expect(context.frameworks).toEqual([]);
    expect(context.packageManagers).toEqual([]);
    expect(context.manifests).toEqual([]);
    expect(context.aiTools).toEqual([]);
    expect(context.warnings).toEqual([]);
  });
});
