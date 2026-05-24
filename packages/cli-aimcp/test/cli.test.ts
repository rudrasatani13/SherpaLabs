import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { CONFIG_FILE_NAME } from '../src/config.js';
import { runWatchLoop, type WatcherFactory } from '../src/commands/watch.js';
import { EXIT_SUCCESS } from '../src/exit-codes.js';
import { shouldUseSpinner, Spinner } from '../src/spinner.js';
import packageJson from '../package.json' with { type: 'json' };

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const binaryPath = join(packageRoot, 'dist/index.js');
const fixtureRoot = join(packageRoot, 'test', 'fixtures', 'stdio-servers');
const maxBundleBytes = 200 * 1024;

interface CliResult {
  readonly code: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

async function runCli(args: readonly string[], cwd = packageRoot): Promise<CliResult> {
  return await new Promise<CliResult>((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [binaryPath, ...args], {
      cwd,
      env: { ...process.env, FORCE_COLOR: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      rejectPromise(new Error(`CLI timed out: ${args.join(' ')}`));
    }, 10_000);
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on('data', (chunk: Buffer) => {
      stdout.push(chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr.push(chunk);
    });
    child.on('error', (error) => {
      clearTimeout(timeout);
      rejectPromise(error);
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      resolvePromise({
        code,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
      });
    });
  });
}

function fixturePath(name: string): string {
  return join(fixtureRoot, name);
}

function serverArgs(name: string): readonly string[] {
  return [process.execPath, fixturePath(name)];
}

describe('aimcp-lint CLI bundle', () => {
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
});

describe('aimcp-lint help and metadata', () => {
  it('prints clear root help with Phase 21 subcommands and examples', async () => {
    const result = await runCli(['--help']);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Usage: aimcp-lint [options] [--] <server-command> [args...]');
    expect(result.stdout).toContain('watch');
    expect(result.stdout).toContain('init');
    expect(result.stdout).toContain('rules');
    expect(result.stdout).toContain('aimcp-lint -- node ./server.mjs --flag');
    expect(result.stdout).not.toContain('NO_COLOR');
  });

  it('prints clear help for each subcommand', async () => {
    const watch = await runCli(['watch', '--help']);
    const init = await runCli(['init', '--help']);
    const rules = await runCli(['rules', '--help']);

    expect(watch.stdout).toContain(
      'Usage: aimcp-lint watch [options] [--] <server-command> [args...]',
    );
    expect(watch.stdout).toContain('--fail-under');
    expect(init.stdout).toContain(`create ${CONFIG_FILE_NAME}`);
    expect(init.stdout).toContain('--force');
    expect(rules.stdout).toContain('list all built-in MCP lint rules');
    expect(rules.stdout).toContain('--format');
  });

  it('prints the package version from package metadata', async () => {
    const result = await runCli(['--version']);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout.trim()).toBe(packageJson.version);
  });

  it('shows help by default when no server command is provided', async () => {
    const result = await runCli([]);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Usage: aimcp-lint [options] [--] <server-command> [args...]');
  });
});

describe('aimcp-lint lint command', () => {
  it('runs the lint engine against a healthy stdio MCP server', async () => {
    const result = await runCli(serverArgs('healthy.mjs'));

    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('MCP Lint Report');
    expect(result.stdout).toContain('Score:');
    expect(result.stdout).toContain('Category Subscores');
  });

  it('selects JSON and Markdown output formats without spinner noise', async () => {
    const json = await runCli(['--format', 'json', '--', ...serverArgs('healthy.mjs')]);
    const markdown = await runCli(['--format', 'markdown', '--', ...serverArgs('healthy.mjs')]);
    const parsed = JSON.parse(json.stdout) as {
      readonly schemaVersion: string;
      readonly score: number;
    };

    expect(json.code).toBe(0);
    expect(json.stderr).toBe('');
    expect(parsed.schemaVersion).toBe('1.0.0');
    expect(typeof parsed.score).toBe('number');
    expect(markdown.code).toBe(0);
    expect(markdown.stderr).toBe('');
    expect(markdown.stdout).toContain('## MCP Lint Report');
    expect(markdown.stdout).not.toContain('- Connecting to MCP server');
  });

  it('returns exit code 1 when the score is below --fail-under', async () => {
    const result = await runCli(['--fail-under', '101', '--', ...serverArgs('healthy.mjs')]);

    expect(result.code).toBe(1);
    expect(result.stdout).toContain('MCP Lint Report');
  });

  it('applies --ignore and --only to the rule execution set', async () => {
    const base = await runCli(['--format', 'json', '--', ...serverArgs('violating.mjs')]);
    const ignored = await runCli([
      '--format',
      'json',
      '--ignore',
      'X004',
      '--',
      ...serverArgs('violating.mjs'),
    ]);
    const only = await runCli([
      '--format',
      'json',
      '--only',
      'X004',
      '--',
      ...serverArgs('violating.mjs'),
    ]);
    const baseReport = JSON.parse(base.stdout) as JsonReport;
    const ignoredReport = JSON.parse(ignored.stdout) as JsonReport;
    const onlyReport = JSON.parse(only.stdout) as JsonReport;

    expect(baseReport.violations.some((violation) => violation.ruleId === 'X004')).toBe(true);
    expect(ignoredReport.violations.some((violation) => violation.ruleId === 'X004')).toBe(false);
    expect(onlyReport.metadata.rulesRun).toEqual(['X004']);
    expect(new Set(onlyReport.violations.map((violation) => violation.ruleId))).toEqual(
      new Set(['X004']),
    );
  });

  it('lets CLI flags override config defaults', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-config-'));
    await writeFile(
      join(cwd, CONFIG_FILE_NAME),
      JSON.stringify({ format: 'markdown', failUnder: 101, ignore: ['X004'] }),
      'utf8',
    );

    const result = await runCli(
      [
        '--format',
        'json',
        '--fail-under',
        '0',
        '--only',
        'X004',
        '--',
        ...serverArgs('violating.mjs'),
      ],
      cwd,
    );
    const report = JSON.parse(result.stdout) as JsonReport;

    expect(result.code).toBe(0);
    expect(report.metadata.rulesRun).toEqual(['X004']);
    expect(report.violations.some((violation) => violation.ruleId === 'X004')).toBe(true);
  });

  it('prints a useful config error for malformed JSON', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-bad-config-'));
    await writeFile(join(cwd, CONFIG_FILE_NAME), '{not-json', 'utf8');

    const result = await runCli(['--', ...serverArgs('healthy.mjs')], cwd);

    expect(result.code).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain(`Malformed ${CONFIG_FILE_NAME}`);
  });

  it('suppresses normal terminal report details with --quiet', async () => {
    const result = await runCli(['--quiet', '--', ...serverArgs('healthy.mjs')]);

    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toMatch(/^(PASS|FAIL) \d+\/100$/u);
    expect(result.stdout).not.toContain('Category Subscores');
    expect(result.stdout).not.toContain('Violations');
  });
});

describe('aimcp-lint init command', () => {
  it('creates a usable config file', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-init-'));
    const result = await runCli(['init'], cwd);
    const configContent = await readFile(join(cwd, CONFIG_FILE_NAME), 'utf8');
    const config = JSON.parse(configContent) as {
      readonly format: string;
      readonly failUnder: number;
      readonly ignore: readonly string[];
      readonly only: readonly string[];
      readonly watch: { readonly paths: readonly string[] };
    };

    expect(result.code).toBe(0);
    expect(result.stdout).toContain(`Created ${CONFIG_FILE_NAME}`);
    expect(config.format).toBe('terminal');
    expect(config.failUnder).toBe(80);
    expect(config.ignore).toEqual([]);
    expect(config.only).toEqual([]);
    expect(config.watch.paths).toEqual(['.']);
  });

  it('does not overwrite an existing config unless --force is used', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-init-existing-'));
    const configPath = join(cwd, CONFIG_FILE_NAME);
    await writeFile(configPath, '{"sentinel":true}\n', 'utf8');

    const blocked = await runCli(['init'], cwd);
    const afterBlocked = await readFile(configPath, 'utf8');
    const forced = await runCli(['init', '--force'], cwd);
    const afterForced = await readFile(configPath, 'utf8');

    expect(blocked.code).toBe(2);
    expect(blocked.stderr).toContain('already exists');
    expect(afterBlocked).toBe('{"sentinel":true}\n');
    expect(forced.code).toBe(0);
    expect(JSON.parse(afterForced)).toMatchObject({ format: 'terminal', failUnder: 80 });
  });
});

describe('aimcp-lint rules command', () => {
  it('lists rule IDs, categories, severities, titles, and descriptions', async () => {
    const terminal = await runCli(['rules']);
    const json = await runCli(['rules', '--format', 'json']);
    const report = JSON.parse(json.stdout) as RulesReport;

    expect(terminal.code).toBe(0);
    expect(terminal.stdout).toContain('Available MCP lint rules');
    expect(terminal.stdout).toContain('P001');
    expect(terminal.stdout).toContain('X001');
    expect(terminal.stdout).toContain('Filesystem access');
    expect(report.count).toBeGreaterThanOrEqual(20);
    expect(report.rules.some((rule) => rule.id === 'P001' && rule.description.length > 0)).toBe(
      true,
    );
  });
});

describe('aimcp-lint watch internals', () => {
  it('reruns on a controlled watcher trigger without hanging', async () => {
    const controller = new AbortController();
    let triggerChange: (() => void) | undefined;
    let closeCount = 0;
    let runCount = 0;
    let firstRunComplete: () => void = () => undefined;
    const firstRun = new Promise<void>((resolvePromise) => {
      firstRunComplete = resolvePromise;
    });
    let watchingReady: () => void = () => undefined;
    const watching = new Promise<void>((resolvePromise) => {
      watchingReady = resolvePromise;
    });
    const createWatcher: WatcherFactory = (_path, onChange) => {
      triggerChange = onChange;
      return {
        close: () => {
          closeCount += 1;
        },
      };
    };
    const loop = runWatchLoop({
      watchPaths: [join(tmpdir(), 'aimcp-lint-watch-target')],
      debounceMs: 0,
      signal: controller.signal,
      createWatcher,
      onWatching: () => {
        watchingReady();
      },
      runOnce: () => {
        runCount += 1;

        if (runCount === 1) {
          firstRunComplete();
        }

        if (runCount === 2) {
          controller.abort();
        }

        return Promise.resolve(EXIT_SUCCESS);
      },
    });

    await watching;
    await firstRun;
    triggerChange?.();
    await loop;

    expect(runCount).toBe(2);
    expect(closeCount).toBe(1);
  });
});

describe('aimcp-lint spinner behavior', () => {
  it('enables progress only for terminal, non-quiet, TTY-safe output', () => {
    expect(shouldUseSpinner({ format: 'terminal', quiet: false, streamIsTTY: true })).toBe(true);
    expect(shouldUseSpinner({ format: 'json', quiet: false, streamIsTTY: true })).toBe(false);
    expect(shouldUseSpinner({ format: 'markdown', quiet: false, streamIsTTY: true })).toBe(false);
    expect(shouldUseSpinner({ format: 'terminal', quiet: true, streamIsTTY: true })).toBe(false);
    expect(shouldUseSpinner({ format: 'terminal', quiet: false, streamIsTTY: false })).toBe(false);
  });

  it('writes spinner frames only when enabled', () => {
    const visibleChunks: string[] = [];
    const hiddenChunks: string[] = [];
    const visible = new Spinner({
      enabled: true,
      intervalMs: 10_000,
      stream: { isTTY: true, write: (chunk) => visibleChunks.push(chunk) },
    });
    const hidden = new Spinner({
      enabled: false,
      intervalMs: 10_000,
      stream: { isTTY: true, write: (chunk) => hiddenChunks.push(chunk) },
    });

    visible.start('Connecting to MCP server');
    visible.succeed('Connecting to MCP server');
    hidden.start('Connecting to MCP server');
    hidden.succeed('Connecting to MCP server');

    expect(visibleChunks.join('')).toContain('- Connecting to MCP server');
    expect(visibleChunks.join('')).toContain('OK Connecting to MCP server');
    expect(hiddenChunks).toEqual([]);
  });
});

interface JsonReport {
  readonly violations: readonly { readonly ruleId: string }[];
  readonly metadata: { readonly rulesRun: readonly string[] };
}

interface RulesReport {
  readonly count: number;
  readonly rules: readonly { readonly id: string; readonly description: string }[];
}
