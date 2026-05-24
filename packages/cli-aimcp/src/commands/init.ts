import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

import { Command } from 'commander/esm.mjs';

import { CONFIG_FILE_NAME, createInitialConfigContent } from '../config.js';
import { configError } from '../errors.js';
import { EXIT_SUCCESS, type ExitCode } from '../exit-codes.js';
import type { WritableStreamLike } from '../output.js';

export interface InitCommandInput {
  readonly force?: boolean;
  readonly cwd?: string;
  readonly stdout?: WritableStreamLike;
}

export function createInitCommand(): Command {
  return new Command('init')
    .description(`create ${CONFIG_FILE_NAME} in the current directory`)
    .option('--force', 'overwrite an existing config file')
    .action(async (options: { readonly force?: boolean }) => {
      process.exitCode = await runInitCommand({ force: options.force === true });
    });
}

export async function runInitCommand(input: InitCommandInput = {}): Promise<ExitCode> {
  const cwd = input.cwd ?? process.cwd();
  const stdout = input.stdout ?? process.stdout;
  const targetPath = resolve(cwd, CONFIG_FILE_NAME);

  try {
    await writeFile(targetPath, createInitialConfigContent(), {
      encoding: 'utf8',
      flag: input.force === true ? 'w' : 'wx',
    });
  } catch (error) {
    if (isNodeErrorCode(error, 'EEXIST')) {
      throw configError(`${CONFIG_FILE_NAME} already exists. Re-run with --force to overwrite it.`);
    }

    throw error;
  }

  stdout.write(`Created ${CONFIG_FILE_NAME}\n`);
  return EXIT_SUCCESS;
}

function isNodeErrorCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}
