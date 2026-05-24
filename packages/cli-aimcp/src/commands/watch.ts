import { watch as watchFileSystem } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

import { Command } from 'commander/esm.mjs';

import { type CommonFlagInput, resolveCliConfig } from '../config.js';
import { describeError } from '../errors.js';
import { EXIT_RUNTIME_ERROR, EXIT_SUCCESS, type ExitCode } from '../exit-codes.js';
import type { WritableStreamLike } from '../output.js';
import { parseServerCommand } from '../server-command.js';
import { addCommonLintOptions, runLintCommand } from './lint.js';

export interface WatchCommandInput {
  readonly serverCommandTokens: readonly string[] | undefined;
  readonly options: CommonFlagInput;
  readonly cwd?: string;
  readonly stdout?: WritableStreamLike;
  readonly stderr?: WritableStreamLike;
  readonly signal?: AbortSignal;
  readonly createWatcher?: WatcherFactory;
}

export interface Watcher {
  close(): void;
}

export type WatcherFactory = (path: string, onChange: () => void) => Watcher;

export interface WatchLoopInput {
  readonly watchPaths: readonly string[];
  readonly runOnce: () => Promise<ExitCode>;
  readonly signal?: AbortSignal;
  readonly debounceMs?: number;
  readonly createWatcher?: WatcherFactory;
  readonly onWatching?: (paths: readonly string[]) => void;
  readonly onChange?: (path: string) => void;
}

export function createWatchCommand(): Command {
  const command = addCommonLintOptions(
    new Command('watch')
      .description('run aimcp-lint repeatedly when watched files change')
      .usage('[options] [--] <server-command> [args...]')
      .argument('[serverCommand...]', 'target MCP server command and arguments'),
  );

  command.action(async (serverCommandTokens: string[] | undefined, options: CommonFlagInput) => {
    process.exitCode = await runWatchCommand({ serverCommandTokens, options });
  });

  return command;
}

export async function runWatchCommand(input: WatchCommandInput): Promise<ExitCode> {
  parseServerCommand(input.serverCommandTokens);
  const cwd = input.cwd ?? process.cwd();
  const stdout = input.stdout ?? process.stdout;
  const stderr = input.stderr ?? process.stderr;
  const resolvedConfig = await resolveCliConfig({ cwd, options: input.options });
  const watchPaths = resolveWatchPaths({
    cwd,
    configPath: resolvedConfig.configPath,
    configExists: resolvedConfig.configExists,
    configuredPaths: resolvedConfig.watchPaths,
  });
  const signal = input.signal ?? createProcessAbortSignal();

  if (!resolvedConfig.quiet) {
    stderr.write(`Watching ${watchPaths.join(', ')}\n`);
  }

  await runWatchLoop({
    watchPaths,
    signal,
    ...(input.createWatcher !== undefined ? { createWatcher: input.createWatcher } : {}),
    runOnce: async () => {
      try {
        return await runLintCommand({
          serverCommandTokens: input.serverCommandTokens,
          options: input.options,
          cwd,
          stdout,
          stderr,
        });
      } catch (error) {
        stderr.write(`Error: ${describeError(error)}\n`);
        return EXIT_RUNTIME_ERROR;
      }
    },
  });

  return EXIT_SUCCESS;
}

export async function runWatchLoop(input: WatchLoopInput): Promise<void> {
  const createWatcher = input.createWatcher ?? createNodeWatcher;
  const watchers = input.watchPaths.map((path) =>
    createWatcher(path, () => {
      input.onChange?.(path);
      scheduleRun();
    }),
  );
  let timer: NodeJS.Timeout | undefined;
  let running = false;
  let pending = false;

  async function runQueued(): Promise<void> {
    if (running) {
      pending = true;
      return;
    }

    running = true;

    try {
      do {
        pending = false;
        await input.runOnce();
      } while (pending && input.signal?.aborted !== true);
    } finally {
      running = false;
    }
  }

  function scheduleRun(): void {
    if (timer !== undefined) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      timer = undefined;
      void runQueued();
    }, input.debounceMs ?? 100);
  }

  try {
    input.onWatching?.(input.watchPaths);
    await runQueued();
    await waitForAbort(input.signal);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }

    for (const watcher of watchers) {
      watcher.close();
    }
  }
}

export function resolveWatchPaths(input: {
  readonly cwd: string;
  readonly configPath: string;
  readonly configExists: boolean;
  readonly configuredPaths: readonly string[];
}): readonly string[] {
  const paths = [
    ...(input.configExists ? [input.configPath] : []),
    ...input.configuredPaths.map((path) => resolve(input.cwd, path)),
  ];
  const resolved = paths.length === 0 ? [input.cwd] : paths;

  return Array.from(new Set(resolved));
}

function createNodeWatcher(path: string, onChange: () => void): Watcher {
  const watcher = watchFileSystem(path, { persistent: true }, () => {
    onChange();
  });

  return {
    close: () => {
      watcher.close();
    },
  };
}

function waitForAbort(signal: AbortSignal | undefined): Promise<void> {
  if (signal === undefined) {
    return new Promise(() => undefined);
  }

  if (signal.aborted) {
    return Promise.resolve();
  }

  return new Promise((resolvePromise) => {
    signal.addEventListener('abort', () => resolvePromise(), { once: true });
  });
}

function createProcessAbortSignal(): AbortSignal {
  const controller = new AbortController();
  const abort = () => {
    controller.abort();
  };
  process.once('SIGINT', abort);
  process.once('SIGTERM', abort);
  return controller.signal;
}
