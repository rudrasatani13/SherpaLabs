/* eslint-disable no-control-regex */
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { runWatchLoop, type WatcherFactory } from '../src/commands/watch.js';
import { CONFIG_FILE_NAME } from '../src/config.js';
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
    expect(result.stdout).toContain('Score:');
    expect(result.stdout).toContain('Category Subscores');
    expect(result.stdout).toContain('Summary');
  });

  it('selects JSON and Markdown output formats without spinner noise', async () => {
    const json = await runCli(['--format', 'json', '--', ...serverArgs('healthy.mjs')]);
    const markdown = await runCli(['--format', 'markdown', '--', ...serverArgs('healthy.mjs')]);
    const parsed = JSON.parse(json.stdout) as {
      readonly schema_version: string;
      readonly score: number;
    };

    expect(json.code).toBe(0);
    expect(json.stderr).toBe('');
    expect(parsed.schema_version).toBe('1.0.0');
    expect(typeof parsed.score).toBe('number');
    expect(markdown.code).toBe(0);
    expect(markdown.stderr).toBe('');
    expect(markdown.stdout).toContain('## MCP Lint Report');
    expect(markdown.stdout).not.toContain('- Connecting to MCP server');
  });

  it('returns exit code 1 when the score is below --fail-under', async () => {
    const result = await runCli(['--fail-under', '101', '--', ...serverArgs('healthy.mjs')]);

    expect(result.code).toBe(1);
    expect(result.stdout).toContain('Score:');
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
    const baseReport = JSON.parse(base.stdout) as SnakeJsonReport;
    const ignoredReport = JSON.parse(ignored.stdout) as SnakeJsonReport;
    const onlyReport = JSON.parse(only.stdout) as SnakeJsonReport;

    expect(baseReport.violations.some((violation) => violation.rule_id === 'X004')).toBe(true);
    expect(ignoredReport.violations.some((violation) => violation.rule_id === 'X004')).toBe(false);
    expect(onlyReport.metadata.rules_run).toEqual(['X004']);
    expect(new Set(onlyReport.violations.map((violation) => violation.rule_id))).toEqual(
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
    const report = JSON.parse(result.stdout) as SnakeJsonReport;

    expect(result.code).toBe(0);
    expect(report.metadata.rules_run).toEqual(['X004']);
    expect(report.violations.some((violation) => violation.rule_id === 'X004')).toBe(true);
  });

  it('prints a useful config error for malformed JSON', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-bad-config-'));
    await writeFile(join(cwd, CONFIG_FILE_NAME), '{not-json', 'utf8');

    const result = await runCli(['--', ...serverArgs('healthy.mjs')], cwd);

    expect(result.code).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain(`Malformed`);
    expect(result.stderr).toContain(CONFIG_FILE_NAME);
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

interface SnakeJsonReport {
  readonly violations: readonly { readonly rule_id: string }[];
  readonly metadata: { readonly rules_run: readonly string[] };
}

interface RulesReport {
  readonly count: number;
  readonly rules: readonly { readonly id: string; readonly description: string }[];
}

// Phase 22: Output Formatter Tests

describe('aimcp-lint terminal formatter', () => {
  it('shows score banner at top with box-drawing characters', async () => {
    const result = await runCli(serverArgs('healthy.mjs'));

    expect(result.stdout).toContain('┌──');
    expect(result.stdout).toContain('Score:');
    expect(result.stdout).toContain('└──');
    expect(result.stdout).toContain('PASS');
  });

  it('groups violations by category with header and severity markers', async () => {
    const result = await runCli(['--fail-under', '19', '--', ...serverArgs('violating.mjs')]);

    expect(result.code).toBe(1);
    expect(result.stdout).toContain('Violations');
    expect(result.stdout).toContain('Security');
    expect(result.stdout).toContain('ERROR');
  });

  it('shows readable summary table at bottom', async () => {
    const result = await runCli(['--fail-under', '19', '--', ...serverArgs('violating.mjs')]);

    expect(result.stdout).toContain('Summary');
    expect(result.stdout).toContain('Total Errors');
    expect(result.stdout).toContain('Total Warnings');
    expect(result.stdout).toContain('Total Info');
    expect(result.stdout).toContain('Total Violations');
    expect(result.stdout).toContain('Result');
    expect(result.stdout).toContain('FAIL');
  });

  it('shows colors when stdout is TTY and NO_COLOR is not set', async () => {
    const result = await runCliTty(serverArgs('healthy.mjs'), true);

    expect(result.stdout).toMatch(/\u001B\[/u);
  });

  it('shows no colors when NO_COLOR is set', async () => {
    const result = await runCliWithEnv(serverArgs('healthy.mjs'), { NO_COLOR: '1' });

    expect(result.stdout).not.toMatch(/\u001B\[/u);
  });

  it('shows fix hints in detailed mode', async () => {
    const result = await runCliTty(['--detailed', '--', ...serverArgs('violating.mjs')], true);

    expect(result.stdout).toContain('Fix:');
  });

  it('does not show fix hints by default', async () => {
    const result = await runCliTty(serverArgs('violating.mjs'), true);

    expect(result.stdout).not.toContain('Fix:');
  });
});

describe('aimcp-lint JSON formatter', () => {
  it('uses snake_case keys with schema_version, score, max_score, violations, summary', async () => {
    const result = await runCli(['--format', 'json', '--', ...serverArgs('healthy.mjs')]);
    const report = JSON.parse(result.stdout) as Record<string, unknown>;

    expect(report.schema_version).toBe('1.0.0');
    expect(typeof report.score).toBe('number');
    expect(typeof report.max_score).toBe('number');
    expect(typeof report.passed).toBe('boolean');
    expect(Array.isArray(report.violations)).toBe(true);
    expect(report.summary).toBeTypeOf('object');
    expect(report.category_subscores).toBeTypeOf('object');
    expect(report.failing_rules).toBeTypeOf('object');
    expect(report.server_info).toBeTypeOf('object');
    expect(report.metadata).toBeTypeOf('object');
  });

  it('includes all category subscores', async () => {
    const result = await runCli(['--format', 'json', '--', ...serverArgs('healthy.mjs')]);
    const report = JSON.parse(result.stdout) as {
      readonly category_subscores: Record<string, unknown>;
    };

    expect(report.category_subscores).toHaveProperty('protocol');
    expect(report.category_subscores).toHaveProperty('schema');
    expect(report.category_subscores).toHaveProperty('security');
    expect(report.category_subscores).toHaveProperty('performance');
  });

  it('is deterministic across runs', async () => {
    const first = await runCli(['--format', 'json', '--', ...serverArgs('healthy.mjs')]);
    const second = await runCli(['--format', 'json', '--', ...serverArgs('healthy.mjs')]);

    const firstReport = JSON.parse(first.stdout) as Record<string, unknown>;
    const secondReport = JSON.parse(second.stdout) as Record<string, unknown>;

    expect(firstReport.score).toBe(secondReport.score);
    expect(firstReport.summary).toEqual(secondReport.summary);
  });

  it('has no ANSI color codes', async () => {
    const result = await runCli(['--format', 'json', '--', ...serverArgs('violating.mjs')]);

    expect(result.stdout).not.toMatch(/\u001B\[/u);
  });
});

describe('aimcp-lint Markdown formatter', () => {
  it('uses GitHub-flavored Markdown with headings and tables', async () => {
    const result = await runCli(['--format', 'markdown', '--', ...serverArgs('violating.mjs')]);

    expect(result.stdout).toContain('## MCP Lint Report');
    expect(result.stdout).toContain('###');
    expect(result.stdout).toContain('|');
  });

  it('has tables for violation lists', async () => {
    const result = await runCli(['--format', 'markdown', '--', ...serverArgs('violating.mjs')]);

    expect(result.stdout).toContain('| Rule | Severity | Message | Location |');
  });

  it('has collapsible sections for categories with violations', async () => {
    const result = await runCli(['--format', 'markdown', '--', ...serverArgs('violating.mjs')]);

    expect(result.stdout).toContain('<details');
    expect(result.stdout).toContain('<summary>');
    expect(result.stdout).toContain('</details>');
  });

  it('renders score, summary, and violations consistently with JSON', async () => {
    const json = await runCli(['--format', 'json', '--', ...serverArgs('violating.mjs')]);
    const markdown = await runCli(['--format', 'markdown', '--', ...serverArgs('violating.mjs')]);
    const jsonReport = JSON.parse(json.stdout) as {
      readonly score: number;
      readonly max_score: number;
      readonly passed: boolean;
      readonly summary: { readonly violation_count: number };
    };

    expect(markdown.stdout).toContain(String(jsonReport.score));
    expect(markdown.stdout).toContain(jsonReport.passed ? 'PASS' : 'FAIL');
    expect(markdown.stdout).toContain(String(jsonReport.summary.violation_count));
  });

  it('has no ANSI color codes', async () => {
    const result = await runCli(['--format', 'markdown', '--', ...serverArgs('violating.mjs')]);

    expect(result.stdout).not.toMatch(/\u001B\[/u);
  });
});

describe('aimcp-lint --quiet mode', () => {
  it('terminal quiet shows only PASS/FAIL and score', async () => {
    const result = await runCli(['--quiet', '--', ...serverArgs('healthy.mjs')]);

    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toMatch(/^(PASS|FAIL) \d+\/100$/u);
    expect(result.stdout).not.toContain('Category Subscores');
    expect(result.stdout).not.toContain('Violations');
    expect(result.stdout).not.toContain('Summary');
  });

  it('JSON quiet shows minimal score/passed/failed object', async () => {
    const result = await runCli([
      '--format',
      'json',
      '--quiet',
      '--',
      ...serverArgs('healthy.mjs'),
    ]);
    const report = JSON.parse(result.stdout) as Record<string, unknown>;

    expect(report.score).toBeTypeOf('number');
    expect(report.max_score).toBeTypeOf('number');
    expect(report.passed).toBeTypeOf('boolean');
    expect(Object.keys(report).length).toBe(3);
  });

  it('Markdown quiet shows minimal score line', async () => {
    const result = await runCli([
      '--format',
      'markdown',
      '--quiet',
      '--',
      ...serverArgs('healthy.mjs'),
    ]);

    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\*\*Score:\*\*\s*`\d+\/100`\s*-/u);
    expect(result.stdout).not.toContain('## MCP Lint Report');
    expect(result.stdout).not.toContain('<details');
  });
});

describe('aimcp-lint --verbose mode', () => {
  it('writes internal steps to stderr', async () => {
    const result = await runCli(['--verbose', '--', ...serverArgs('healthy.mjs')]);

    expect(result.stderr).toContain('[aimcp-lint] Config:');
    expect(result.stderr).toContain('[aimcp-lint] Format:');
    expect(result.stderr).toContain('[aimcp-lint] Resolved server command:');
    expect(result.stderr).toContain('[aimcp-lint] Connecting to MCP server');
    expect(result.stderr).toContain('[aimcp-lint] Collected');
    expect(result.stderr).toContain('[aimcp-lint] Running lint rules');
    expect(result.stderr).toContain('[aimcp-lint] Score:');
    expect(result.stderr).toContain('[aimcp-lint] Violations:');
    expect(result.stderr).toContain('[aimcp-lint] Rules run:');
    expect(result.stderr).toContain('[aimcp-lint] Rendering output');
  });

  it('produces valid stdout for JSON format with verbose on stderr', async () => {
    const result = await runCli([
      '--format',
      'json',
      '--verbose',
      '--',
      ...serverArgs('healthy.mjs'),
    ]);
    const report = JSON.parse(result.stdout) as Record<string, unknown>;

    expect(report.schema_version).toBe('1.0.0');
    expect(typeof report.score).toBe('number');
    expect(result.stderr).toContain('[aimcp-lint]');
  });

  it('does not write verbose when not enabled', async () => {
    const result = await runCli(serverArgs('healthy.mjs'));

    expect(result.stderr).toBe('');
  });
});

describe('aimcp-lint --detailed flag', () => {
  it('appears in help output', async () => {
    const result = await runCli(['--help']);

    expect(result.stdout).toContain('--detailed');
    expect(result.stdout).toContain('fix hints');
  });

  it('can be set via config file', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-detailed-'));
    await writeFile(join(cwd, CONFIG_FILE_NAME), JSON.stringify({ detailed: true }), 'utf8');

    const result = await runCliTty(serverArgs('violating.mjs'), true, cwd);
    expect(result.stdout).toContain('Fix:');
  });

  it('invalid detailed config produces an error', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-detailed-bad-'));
    await writeFile(join(cwd, CONFIG_FILE_NAME), JSON.stringify({ detailed: 'yes' }), 'utf8');

    const result = await runCli(['--', ...serverArgs('healthy.mjs')], cwd);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('detailed must be a boolean');
  });
});

describe('aimcp-lint NO_COLOR behavior', () => {
  it('disables ANSI codes in terminal output when NO_COLOR is set to any value', async () => {
    const result = await runCliWithEnv(serverArgs('healthy.mjs'), { NO_COLOR: '1' });

    expect(result.stdout).not.toMatch(/\u001B\[[0-9;]*m/u);
  });

  it('disables ANSI codes in terminal output when NO_COLOR is empty', async () => {
    const result = await runCliWithEnv(serverArgs('healthy.mjs'), { NO_COLOR: '' });

    expect(result.stdout).not.toMatch(/\u001B\[[0-9;]*m/u);
  });

  it('JSON output is never colored regardless of NO_COLOR', async () => {
    const result = await runCli(['--format', 'json', '--', ...serverArgs('healthy.mjs')]);

    expect(result.stdout).not.toMatch(/\u001B\[/u);
  });

  it('Markdown output is never colored regardless of NO_COLOR', async () => {
    const result = await runCli(['--format', 'markdown', '--', ...serverArgs('healthy.mjs')]);

    expect(result.stdout).not.toMatch(/\u001B\[/u);
  });
});

// Phase 23: Configuration System Tests

describe('aimcp-lint config discovery', () => {
  it('walks up directory tree from nested cwd', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-discover-'));
    const nested = join(cwd, 'deep', 'nested');
    await mkdirP(nested);
    await writeFile(join(cwd, CONFIG_FILE_NAME), JSON.stringify({ format: 'markdown' }), 'utf8');

    const result = await runCli(['--', ...serverArgs('healthy.mjs')], nested);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('## MCP Lint Report');
    expect(result.stderr).toBe('');
  });

  it('stops at filesystem root when no config exists', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-noconfig-'));
    const deep = await mkdtemp(join(cwd, 'deep-'));
    const nested = join(deep, 'more');
    await mkdirP(nested);

    const result = await runCli(
      ['--format', 'json', '--quiet', '--', ...serverArgs('healthy.mjs')],
      nested,
    );

    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    const report = JSON.parse(result.stdout) as { score: number };
    expect(typeof report.score).toBe('number');
  });

  it('uses explicit --config path', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-explicit-'));
    const configDir = join(cwd, 'config-dir');
    await mkdirP(configDir);
    await writeFile(
      join(configDir, CONFIG_FILE_NAME),
      JSON.stringify({ format: 'json', quiet: true }),
      'utf8',
    );

    const result = await runCli(
      ['--config', join(configDir, CONFIG_FILE_NAME), '--', ...serverArgs('healthy.mjs')],
      cwd,
    );

    expect(result.code).toBe(0);
    const report = JSON.parse(result.stdout) as { score: number };
    expect(typeof report.score).toBe('number');
  });

  it('errors clearly on explicit --config path that does not exist', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-missing-'));
    const missing = join(cwd, 'no-such-config.json');

    const result = await runCli(['--config', missing, '--', ...serverArgs('healthy.mjs')], cwd);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('Config file not found');
    expect(result.stderr).toContain(missing);
  });
});

describe('aimcp-lint config validation', () => {
  it('rejects invalid format values', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-bad-format-'));
    await writeFile(join(cwd, CONFIG_FILE_NAME), JSON.stringify({ format: 'xml' }), 'utf8');

    const result = await runCli(['--', ...serverArgs('healthy.mjs')], cwd);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('format must be terminal, json, or markdown');
  });

  it('rejects non-number failUnder', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-bad-fail-'));
    await writeFile(join(cwd, CONFIG_FILE_NAME), JSON.stringify({ failUnder: '50' }), 'utf8');

    const result = await runCli(['--', ...serverArgs('healthy.mjs')], cwd);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('failUnder must be a non-negative finite number');
  });

  it('rejects negative failUnder', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-neg-fail-'));
    await writeFile(join(cwd, CONFIG_FILE_NAME), JSON.stringify({ failUnder: -1 }), 'utf8');

    const result = await runCli(['--', ...serverArgs('healthy.mjs')], cwd);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('failUnder must be a non-negative finite number');
  });

  it('rejects non-array ignore', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-bad-ignore-'));
    await writeFile(join(cwd, CONFIG_FILE_NAME), JSON.stringify({ ignore: 'X004' }), 'utf8');

    const result = await runCli(['--', ...serverArgs('healthy.mjs')], cwd);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('must be an array of strings');
  });

  it('rejects invalid severityOverrides value', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-bad-sev-'));
    await writeFile(
      join(cwd, CONFIG_FILE_NAME),
      JSON.stringify({ severityOverrides: { P001: 'critical' } }),
      'utf8',
    );

    const result = await runCli(['--', ...serverArgs('healthy.mjs')], cwd);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('severityOverrides.P001 must be error, warning, or info');
  });

  it('rejects non-object severityOverrides', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-bad-sev-obj-'));
    await writeFile(
      join(cwd, CONFIG_FILE_NAME),
      JSON.stringify({ severityOverrides: ['P001'] }),
      'utf8',
    );

    const result = await runCli(['--', ...serverArgs('healthy.mjs')], cwd);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('severityOverrides must be an object mapping rule IDs');
  });

  it('rejects invalid command shape', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-bad-cmd-'));
    await writeFile(join(cwd, CONFIG_FILE_NAME), JSON.stringify({ command: 123 }), 'utf8');

    const result = await runCli(['--', ...serverArgs('healthy.mjs')], cwd);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain(
      'command must be a non-empty string or a non-empty array of strings',
    );
  });

  it('rejects empty string command', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-empty-cmd-'));
    await writeFile(join(cwd, CONFIG_FILE_NAME), JSON.stringify({ command: '   ' }), 'utf8');

    const result = await runCli(['--', ...serverArgs('healthy.mjs')], cwd);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain(
      'command must be a non-empty string or a non-empty array of strings',
    );
  });

  it('rejects non-object thresholds', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-bad-thresh-'));
    await writeFile(join(cwd, CONFIG_FILE_NAME), JSON.stringify({ thresholds: 'high' }), 'utf8');

    const result = await runCli(['--', ...serverArgs('healthy.mjs')], cwd);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('thresholds must be an object of numbers');
  });

  it('rejects invalid threshold value', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-bad-thresh-val-'));
    await writeFile(
      join(cwd, CONFIG_FILE_NAME),
      JSON.stringify({ thresholds: { maxTools: -5 } }),
      'utf8',
    );

    const result = await runCli(['--', ...serverArgs('healthy.mjs')], cwd);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('thresholds.maxTools must be a non-negative finite number');
  });

  it('rejects malformed ruleOverrides', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-bad-rule-'));
    await writeFile(
      join(cwd, CONFIG_FILE_NAME),
      JSON.stringify({ ruleOverrides: { P001: 'disabled' } }),
      'utf8',
    );

    const result = await runCli(['--', ...serverArgs('healthy.mjs')], cwd);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('ruleOverrides.P001 must be an object');
  });

  it('rejects invalid severityWeights keys', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-bad-weight-'));
    await writeFile(
      join(cwd, CONFIG_FILE_NAME),
      JSON.stringify({ severityWeights: { critical: -99 } }),
      'utf8',
    );

    const result = await runCli(['--', ...serverArgs('healthy.mjs')], cwd);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('severityWeights.critical is not a valid key');
  });

  it('rejects non-object config file', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-bad-type-'));
    await writeFile(join(cwd, CONFIG_FILE_NAME), JSON.stringify(['not', 'an', 'object']), 'utf8');

    const result = await runCli(['--', ...serverArgs('healthy.mjs')], cwd);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('must contain a JSON object');
  });
});

describe('aimcp-lint config init expanded', () => {
  it('generates a config with all Phase 23 fields', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-init-full-'));
    await runCli(['init'], cwd);
    const configContent = await readFile(join(cwd, CONFIG_FILE_NAME), 'utf8');
    const config = JSON.parse(configContent) as Record<string, unknown>;

    expect(config.command).toBe('node ./server.mjs');
    expect(config.format).toBe('terminal');
    expect(config.failUnder).toBe(80);
    expect(config.ignore).toEqual([]);
    expect(config.only).toEqual([]);
    expect(config.detailed).toBe(false);
    expect(config.quiet).toBe(false);
    expect(config.verbose).toBe(false);
    expect(config.severityOverrides).toEqual({});
    expect(config.ruleOverrides).toEqual({});
    expect(config.thresholds).toEqual({});
    expect(config.severityWeights).toEqual({});
    expect(config.watch).toEqual({ paths: ['.'] });
  });

  it('custom config respected on subsequent runs', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-custom-respected-'));
    await writeFile(
      join(cwd, CONFIG_FILE_NAME),
      JSON.stringify({
        format: 'json',
        ignore: ['X003', 'X004'],
      }),
      'utf8',
    );

    const result = await runCli(['--', ...serverArgs('violating.mjs')], cwd);
    const report = JSON.parse(result.stdout) as {
      violations: readonly { rule_id: string }[];
      metadata: { rules_run: readonly string[] };
    };

    expect(result.code).toBe(0);
    expect(report.violations.some((v) => v.rule_id === 'X004')).toBe(false);
    expect(report.metadata.rules_run).not.toContain('X004');
  });
});

describe('aimcp-lint config command handling', () => {
  it('uses config command when no CLI command is provided', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-config-cmd-'));
    await writeFile(
      join(cwd, CONFIG_FILE_NAME),
      JSON.stringify({
        command: ['node', fixturePath('healthy.mjs')],
        format: 'json',
        quiet: true,
      }),
      'utf8',
    );

    const result = await runCli([], cwd);
    const report = JSON.parse(result.stdout) as { score: number };

    expect(result.code).toBe(0);
    expect(typeof report.score).toBe('number');
  });

  it('uses config command string form', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-config-cmd-str-'));
    await writeFile(
      join(cwd, CONFIG_FILE_NAME),
      JSON.stringify({
        command: `node ${fixturePath('healthy.mjs')}`,
        format: 'json',
        quiet: true,
      }),
      'utf8',
    );

    const result = await runCli([], cwd);
    const report = JSON.parse(result.stdout) as { score: number };

    expect(result.code).toBe(0);
    expect(typeof report.score).toBe('number');
  });

  it('CLI command overrides config command', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-cli-overrides-cmd-'));
    await writeFile(
      join(cwd, CONFIG_FILE_NAME),
      JSON.stringify({
        command: 'echo wrong-server',
        format: 'json',
        quiet: true,
      }),
      'utf8',
    );

    const result = await runCli(['--', ...serverArgs('healthy.mjs')], cwd);
    const report = JSON.parse(result.stdout) as { score: number };

    expect(result.code).toBe(0);
    expect(typeof report.score).toBe('number');
  });

  it('shows help when neither CLI nor config command exists', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-no-cmd-'));
    const result = await runCli([], cwd);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Usage:');
  });
});

describe('aimcp-lint ignore/only from config', () => {
  it('ignore from config affects rule execution', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-config-ignore-'));
    await writeFile(
      join(cwd, CONFIG_FILE_NAME),
      JSON.stringify({ ignore: ['X004'], format: 'json' }),
      'utf8',
    );

    const result = await runCli(['--', ...serverArgs('violating.mjs')], cwd);
    const report = JSON.parse(result.stdout) as {
      violations: readonly { rule_id: string }[];
    };

    expect(report.violations.some((v) => v.rule_id === 'X004')).toBe(false);
  });

  it('--ignore CLi flag replaces config ignore', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-cli-ignore-replaces-'));
    await writeFile(
      join(cwd, CONFIG_FILE_NAME),
      JSON.stringify({ ignore: ['X004'], format: 'json' }),
      'utf8',
    );

    const result = await runCli(['--ignore', 'X003', '--', ...serverArgs('violating.mjs')], cwd);
    const report = JSON.parse(result.stdout) as {
      violations: readonly { rule_id: string }[];
      metadata: { rules_run: readonly string[] };
    };

    expect(report.violations.some((v) => v.rule_id === 'X003')).toBe(false);
    expect(report.violations.some((v) => v.rule_id === 'X004')).toBe(true);
  });

  it('--only CLi flag overrides config and clears ignores', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-cli-only-overrides-'));
    await writeFile(
      join(cwd, CONFIG_FILE_NAME),
      JSON.stringify({ ignore: ['X001', 'X002'], only: ['X004'], format: 'json' }),
      'utf8',
    );

    const result = await runCli(['--only', 'X003', '--', ...serverArgs('violating.mjs')], cwd);
    const report = JSON.parse(result.stdout) as {
      metadata: { rules_run: readonly string[] };
    };

    expect(report.metadata.rules_run).toEqual(['X003']);
  });
});

describe('aimcp-lint severity overrides from config', () => {
  it('severity overrides affect violation severity in output', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-sev-override-'));
    await writeFile(
      join(cwd, CONFIG_FILE_NAME),
      JSON.stringify({
        severityOverrides: { X004: 'info' },
        format: 'json',
        only: ['X004'],
      }),
      'utf8',
    );

    const result = await runCli(['--', ...serverArgs('violating.mjs')], cwd);
    const report = JSON.parse(result.stdout) as {
      violations: readonly { rule_id: string; severity: string }[];
    };

    for (const violation of report.violations) {
      expect(violation.rule_id).toBe('X004');
      expect(violation.severity).toBe('info');
    }
  });
});

describe('aimcp-lint thresholds from config', () => {
  it('thresholds from config are passed through', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-thresh-cfg-'));
    await writeFile(
      join(cwd, CONFIG_FILE_NAME),
      JSON.stringify({
        thresholds: { maxTools: 5, maxResources: 5 },
        format: 'json',
        quiet: true,
      }),
      'utf8',
    );

    const result = await runCli(['--', ...serverArgs('healthy.mjs')], cwd);
    const report = JSON.parse(result.stdout) as { score: number };

    expect(result.code).toBe(0);
    expect(typeof report.score).toBe('number');
  });
});

describe('aimcp-lint partial config', () => {
  it('applies defaults for missing fields', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-partial-'));
    await writeFile(join(cwd, CONFIG_FILE_NAME), JSON.stringify({ format: 'json' }), 'utf8');

    const result = await runCli(['--', ...serverArgs('healthy.mjs')], cwd);

    expect(result.code).toBe(0);
    const json = JSON.parse(result.stdout) as { schema_version: string };
    expect(json.schema_version).toBe('1.0.0');
    expect(result.stderr).toBe('');
  });
});

describe('aimcp-lint quiet/verbose from config', () => {
  it('quiet from config suppresses terminal detail', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-config-quiet-'));
    await writeFile(join(cwd, CONFIG_FILE_NAME), JSON.stringify({ quiet: true }), 'utf8');

    const result = await runCli(['--', ...serverArgs('healthy.mjs')], cwd);

    expect(result.code).toBe(0);
    expect(result.stdout).not.toContain('Category Subscores');
    expect(result.stdout).not.toContain('Violations');
  });

  it('verbose from config writes diagnostics', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-config-verbose-'));
    await writeFile(join(cwd, CONFIG_FILE_NAME), JSON.stringify({ verbose: true }), 'utf8');

    const result = await runCli(['--', ...serverArgs('healthy.mjs')], cwd);

    expect(result.stderr).toContain('[aimcp-lint]');
  });

  it('CLI --verbose flag overrides config verbose', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-verbose-override-'));
    await writeFile(join(cwd, CONFIG_FILE_NAME), JSON.stringify({ verbose: false }), 'utf8');

    const result = await runCli(['--verbose', '--', ...serverArgs('healthy.mjs')], cwd);

    expect(result.stderr).toContain('[aimcp-lint]');
  });
});

describe('aimcp-lint backwards compatibility', () => {
  it('old config without new fields still works', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-old-config-'));
    await writeFile(
      join(cwd, CONFIG_FILE_NAME),
      JSON.stringify({ format: 'json', ignore: ['X004'] }),
      'utf8',
    );

    const result = await runCli(['--', ...serverArgs('violating.mjs')], cwd);
    const report = JSON.parse(result.stdout) as {
      violations: readonly { rule_id: string }[];
    };

    expect(result.code).toBe(0);
    expect(report.violations.some((v) => v.rule_id === 'X004')).toBe(false);
  });

  it('ignoredRules legacy key still works', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-legacy-ignore-'));
    await writeFile(
      join(cwd, CONFIG_FILE_NAME),
      JSON.stringify({ ignoredRules: ['X004'], format: 'json' }),
      'utf8',
    );

    const result = await runCli(['--', ...serverArgs('violating.mjs')], cwd);
    const report = JSON.parse(result.stdout) as {
      violations: readonly { rule_id: string }[];
    };

    expect(report.violations.some((v) => v.rule_id === 'X004')).toBe(false);
  });

  it('includedRules legacy key still works', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-legacy-include-'));
    await writeFile(
      join(cwd, CONFIG_FILE_NAME),
      JSON.stringify({ includedRules: ['X004'], format: 'json' }),
      'utf8',
    );

    const result = await runCli(['--', ...serverArgs('violating.mjs')], cwd);
    const report = JSON.parse(result.stdout) as {
      metadata: { rules_run: readonly string[] };
    };

    expect(report.metadata.rules_run).toEqual(['X004']);
  });
});

// Phase 24: CI Integration Features

describe('aimcp-lint stable exit codes', () => {
  it('returns exit code 1 when score is below --fail-under threshold', async () => {
    const result = await runCli(['--fail-under', '101', '--', ...serverArgs('healthy.mjs')]);

    expect(result.code).toBe(1);
    expect(result.stdout).toContain('Score:');
  });

  it('returns exit code 0 when score meets --fail-under threshold', async () => {
    const result = await runCli(['--fail-under', '0', '--', ...serverArgs('healthy.mjs')]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Score:');
  });

  it('returns exit code 0 when score equals --fail-under threshold', async () => {
    const result = await runCli([
      '--format',
      'json',
      '--quiet',
      '--',
      ...serverArgs('healthy.mjs'),
    ]);
    const report = JSON.parse(result.stdout) as { score: number };
    const thresholdResult = await runCli([
      '--fail-under',
      String(report.score),
      '--',
      ...serverArgs('healthy.mjs'),
    ]);

    expect(thresholdResult.code).toBe(0);
  });

  it('returns exit code 1 when score is one below threshold', async () => {
    const result = await runCli([
      '--format',
      'json',
      '--quiet',
      '--',
      ...serverArgs('healthy.mjs'),
    ]);
    const report = JSON.parse(result.stdout) as { score: number };
    const thresholdResult = await runCli([
      '--fail-under',
      String(report.score + 1),
      '--',
      ...serverArgs('healthy.mjs'),
    ]);

    expect(thresholdResult.code).toBe(1);
  });

  it('--fail-under flag overrides config file failUnder', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-fail-override-'));
    await writeFile(join(cwd, CONFIG_FILE_NAME), JSON.stringify({ failUnder: 101 }), 'utf8');

    const result = await runCli(['--fail-under', '0', '--', ...serverArgs('healthy.mjs')], cwd);

    expect(result.code).toBe(0);
  });

  it('returns exit code 2 for invalid config', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-exit2-'));
    await writeFile(join(cwd, CONFIG_FILE_NAME), '{not-json', 'utf8');

    const result = await runCli(['--', ...serverArgs('healthy.mjs')], cwd);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('Malformed');
  });

  it('returns exit code 3 for non-existent server command', async () => {
    const result = await runCli(['--', process.execPath, './does-not-exist.mjs']);

    expect(result.code).toBe(3);
    expect(result.stderr).toMatch(/process exited|Failed to spawn|ENOENT|connection/i);
  });

  it('returns exit code 3 for crashing server', async () => {
    const result = await runCli(serverArgs('crash.mjs'));

    expect(result.code).toBe(3);
    expect(result.stderr).toMatch(/process exited|connection/i);
  });

  it('returns exit code 3 for malformed server output', async () => {
    const result = await runCli(serverArgs('malformed.mjs'));

    expect(result.code).toBe(3);
    expect(result.stderr).toMatch(/Malformed|JSON|connection/i);
  });

  it('returns exit code 2 for usage error (empty command string in config)', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aimcp-lint-usage-err-'));
    await writeFile(join(cwd, CONFIG_FILE_NAME), JSON.stringify({ command: '   ' }), 'utf8');

    const result = await runCli([], cwd);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('command must be a non-empty string');
  });
});

describe('aimcp-lint --format=json --quiet CI output', () => {
  it('outputs minimal parseable JSON on stdout', async () => {
    const result = await runCli([
      '--format',
      'json',
      '--quiet',
      '--',
      ...serverArgs('healthy.mjs'),
    ]);

    expect(result.code).toBe(0);
    const report = JSON.parse(result.stdout) as Record<string, unknown>;

    expect(report).toHaveProperty('score');
    expect(report).toHaveProperty('max_score');
    expect(report).toHaveProperty('passed');
    expect(typeof report.score).toBe('number');
    expect(typeof report.max_score).toBe('number');
    expect(typeof report.passed).toBe('boolean');
    expect(Object.keys(report).length).toBe(3);
  });

  it('contains no ANSI codes in JSON quiet stdout', async () => {
    const result = await runCli([
      '--format',
      'json',
      '--quiet',
      '--',
      ...serverArgs('healthy.mjs'),
    ]);

    expect(result.stdout).not.toMatch(/\u001B\[/u);
    // Verify no spinner noise leaked
    expect(result.stdout).not.toContain('Connecting');
    expect(result.stdout).not.toContain('OK');
  });

  it('works with jq-style parsing on the command line', async () => {
    const result = await runCli([
      '--format',
      'json',
      '--quiet',
      '--',
      ...serverArgs('healthy.mjs'),
    ]);
    const report = JSON.parse(result.stdout) as {
      score: number;
      max_score: number;
      passed: boolean;
    };

    expect(report.score).toBeLessThanOrEqual(report.max_score);
    expect([true, false]).toContain(report.passed);
  });

  it('JSON with --verbose sends diagnostics to stderr and stdout remains parseable', async () => {
    const result = await runCli([
      '--format',
      'json',
      '--verbose',
      '--',
      ...serverArgs('healthy.mjs'),
    ]);

    const report = JSON.parse(result.stdout) as { score: number };

    expect(typeof report.score).toBe('number');
    expect(result.stderr).toContain('[aimcp-lint]');
    expect(result.stdout).not.toMatch(/\u001B\[/u);
  });

  it('JSON quiet with --verbose has no ANSI in stdout', async () => {
    const result = await runCli([
      '--format',
      'json',
      '--quiet',
      '--verbose',
      '--',
      ...serverArgs('healthy.mjs'),
    ]);

    expect(result.stdout).not.toMatch(/\u001B\[/u);
  });
});

describe('aimcp-lint grep-friendly terminal output', () => {
  it('prints PASS or FAIL line grep-able', async () => {
    const result = await runCli(serverArgs('healthy.mjs'));

    expect(result.stdout).toMatch(/PASS|FAIL/);
    expect(result.stdout).toContain('Score:');
  });

  it('contains score line with digit pattern', async () => {
    const result = await runCli(serverArgs('healthy.mjs'));

    expect(result.stdout).toMatch(/Score:\s*\d+\/\d+/u);
  });

  it('contains category subscores table', async () => {
    const result = await runCli(serverArgs('healthy.mjs'));

    expect(result.stdout).toContain('Category Subscores');
    expect(result.stdout).toContain('Protocol');
    expect(result.stdout).toContain('Schema');
    expect(result.stdout).toContain('Security');
    expect(result.stdout).toContain('Performance');
  });

  it('contains summary table with metric names', async () => {
    const result = await runCli(serverArgs('healthy.mjs'));

    expect(result.stdout).toContain('Summary');
    expect(result.stdout).toContain('Total Errors');
    expect(result.stdout).toContain('Total Violations');
    expect(result.stdout).toContain('Result');
    expect(result.stdout).toContain('Rules Run');
  });

  it('quiet terminal output is grep-able for PASS/FAIL', async () => {
    const result = await runCli(['--quiet', '--', ...serverArgs('healthy.mjs')]);

    expect(result.stdout.trim()).toMatch(/^(PASS|FAIL) \d+\/100$/u);
  });
});

describe('aimcp-lint Markdown CI determinism', () => {
  it('produces consistent output across runs', async () => {
    const first = await runCli(['--format', 'markdown', '--', ...serverArgs('healthy.mjs')]);
    const second = await runCli(['--format', 'markdown', '--', ...serverArgs('healthy.mjs')]);

    expect(first.stdout).toBe(second.stdout);
  });

  it('includes report heading and server info table', async () => {
    const result = await runCli(['--format', 'markdown', '--', ...serverArgs('healthy.mjs')]);

    expect(result.stdout).toContain('## MCP Lint Report');
    expect(result.stdout).toContain('### Server Info');
    expect(result.stdout).toContain('| Property | Value |');
  });

  it('markdown quiet output is deterministic', async () => {
    const first = await runCli([
      '--format',
      'markdown',
      '--quiet',
      '--',
      ...serverArgs('healthy.mjs'),
    ]);
    const second = await runCli([
      '--format',
      'markdown',
      '--quiet',
      '--',
      ...serverArgs('healthy.mjs'),
    ]);

    expect(first.stdout.trim()).toBe(second.stdout.trim());
  });

  it('has no ANSI color codes in markdown output', async () => {
    const result = await runCli(['--format', 'markdown', '--', ...serverArgs('violating.mjs')]);

    expect(result.stdout).not.toMatch(/\u001B\[/u);
  });
});

describe('aimcp-lint CI sample-server timing', () => {
  it('completes a CI-style run against the local sample server in under 60 seconds', async () => {
    const started = Date.now();
    const result = await runCliLongTimeout(
      ['--format', 'json', '--quiet', '--', ...serverArgs('healthy.mjs')],
      120_000,
    );
    const durationMs = Date.now() - started;

    expect(result.code).toBe(0);
    expect(durationMs).toBeLessThan(60_000);
    const report = JSON.parse(result.stdout) as { score: number; passed: boolean };
    expect(typeof report.score).toBe('number');
  }, 120_000);

  it('completes CI-style run against violating server in under 60 seconds', async () => {
    const started = Date.now();
    const result = await runCliLongTimeout(
      ['--format', 'json', '--quiet', '--', ...serverArgs('violating.mjs')],
      120_000,
    );
    const durationMs = Date.now() - started;

    expect(durationMs).toBeLessThan(60_000);
    const report = JSON.parse(result.stdout) as { score: number; passed: boolean };
    expect(typeof report.score).toBe('number');
  }, 120_000);
});

// Helper: mkdir -p equivalent
import { mkdir } from 'node:fs/promises';

async function mkdirP(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}
async function runCliTty(
  args: readonly string[],
  forceEnv = true,
  cwd?: string,
): Promise<CliResult> {
  return await new Promise<CliResult>((resolvePromise, rejectPromise) => {
    const env = forceEnv ? { ...process.env, FORCE_COLOR: '1' } : { ...process.env };
    const child = spawn(process.execPath, [binaryPath, ...args], {
      cwd: cwd ?? packageRoot,
      env,
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

// Helper: run CLI with specific env overrides (no FORCE_COLOR, no TTY override)
async function runCliWithEnv(
  args: readonly string[],
  envOverrides: Record<string, string>,
): Promise<CliResult> {
  return await new Promise<CliResult>((resolvePromise, rejectPromise) => {
    const { FORCE_COLOR: _FORCE_COLOR, ...cleanEnv } = process.env;
    const child = spawn(process.execPath, [binaryPath, ...args], {
      cwd: packageRoot,
      env: { ...cleanEnv, ...envOverrides },
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

async function runCliLongTimeout(
  args: readonly string[],
  timeoutMs: number,
  cwd?: string,
): Promise<CliResult> {
  return await new Promise<CliResult>((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [binaryPath, ...args], {
      cwd: cwd ?? packageRoot,
      env: { ...process.env, FORCE_COLOR: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      rejectPromise(new Error(`CLI timed out: ${args.join(' ')}`));
    }, timeoutMs);
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
