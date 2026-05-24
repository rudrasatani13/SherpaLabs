import { execFile } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

import packageJson from '../package.json' with { type: 'json' };

const execFileAsync = promisify(execFile);
const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const binaryPath = join(packageRoot, 'dist/index.js');
const maxBundleBytes = 200 * 1024;

async function runCli(args: readonly string[]): Promise<{ stdout: string; stderr: string }> {
  const { stdout, stderr } = await execFileAsync(process.execPath, [binaryPath, ...args], {
    cwd: packageRoot,
    timeout: 5_000,
  });

  return { stdout, stderr };
}

describe('aimcp-lint CLI scaffold', () => {
  it('builds a single executable JavaScript bundle below the size budget', () => {
    expect(existsSync(binaryPath)).toBe(true);

    const artifact = readFileSync(binaryPath, 'utf8');
    const builtJavaScriptFiles = readdirSync(join(packageRoot, 'dist')).filter((file) =>
      file.endsWith('.js'),
    );

    expect(artifact.startsWith('#!/usr/bin/env node\n')).toBe(true);
    expect(statSync(binaryPath).size).toBeLessThan(maxBundleBytes);
    expect(builtJavaScriptFiles).toEqual(['index.js']);
  });

  it('prints clean help for the scaffolded command shell', async () => {
    const result = await runCli(['--help']);

    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Usage: aimcp-lint [options]');
    expect(result.stdout).toContain('MCP lint CLI for validating Model Context Protocol servers.');
    expect(result.stdout).toContain('--version');
    expect(result.stdout).toContain('--help');
    expect(result.stdout).toContain('This Phase 20 scaffold provides the command shell only.');
  });

  it('prints the package version from package metadata', async () => {
    const result = await runCli(['--version']);

    expect(result.stderr).toBe('');
    expect(result.stdout.trim()).toBe(packageJson.version);
  });

  it('shows help by default without exposing Phase 21 subcommands', async () => {
    const result = await runCli([]);

    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Usage: aimcp-lint [options]');
    expect(result.stdout).not.toContain('Commands:');
    expect(result.stdout).not.toContain(' init');
    expect(result.stdout).not.toContain(' watch');
    expect(result.stdout).not.toContain(' rules');
  });
});
