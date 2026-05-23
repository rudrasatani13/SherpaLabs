import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  safeReadFile,
  type SafeFileReadFailure,
  type SafeFileReadResult,
  type SafeFileReadSuccess,
} from '../src/file-read.js';

let tempDirectory: string | undefined;

function expectReadSuccess(result: SafeFileReadResult): asserts result is SafeFileReadSuccess {
  expect(result.ok).toBe(true);

  if (!result.ok) {
    throw new Error(result.error.message);
  }
}

function expectReadFailure(result: SafeFileReadResult): asserts result is SafeFileReadFailure {
  expect(result.ok).toBe(false);

  if (result.ok) {
    throw new Error('Expected file read to fail.');
  }
}

describe('safeReadFile', () => {
  beforeEach(async () => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'sherpa-core-utils-'));
  });

  afterEach(async () => {
    if (tempDirectory != null) {
      await rm(tempDirectory, { force: true, recursive: true });
      tempDirectory = undefined;
    }
  });

  it('reads a small UTF-8 file', async () => {
    const filePath = join(requiredTempDirectory(), 'rules.md');
    await writeFile(filePath, 'Use strict TypeScript.\n', 'utf8');

    const result = await safeReadFile(filePath);

    expectReadSuccess(result);
    expect(result).toMatchObject({
      path: filePath,
      content: 'Use strict TypeScript.\n',
      encoding: 'utf8',
      sizeBytes: 23,
    });
  });

  it('returns a typed not_found error for missing files', async () => {
    const filePath = join(requiredTempDirectory(), 'missing.md');

    const result = await safeReadFile(filePath);

    expectReadFailure(result);
    expect(result.error).toMatchObject({
      code: 'not_found',
      path: filePath,
    });
  });

  it('rejects files above the max byte limit', async () => {
    const filePath = join(requiredTempDirectory(), 'large.md');
    await writeFile(filePath, '12345', 'utf8');

    const result = await safeReadFile(filePath, { maxBytes: 4 });

    expectReadFailure(result);
    expect(result.error.code).toBe('too_large');
  });

  it('rejects likely binary files', async () => {
    const filePath = join(requiredTempDirectory(), 'binary.bin');
    await writeFile(filePath, Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff]));

    const result = await safeReadFile(filePath);

    expectReadFailure(result);
    expect(result.error.code).toBe('binary_file');
  });

  it('detects UTF-16LE files with a byte order mark', async () => {
    const filePath = join(requiredTempDirectory(), 'utf16.md');
    const content = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('Hello', 'utf16le')]);
    await writeFile(filePath, content);

    const result = await safeReadFile(filePath);

    expectReadSuccess(result);
    expect(result.content).toBe('Hello');
    expect(result.encoding).toBe('utf16le');
  });
});

function requiredTempDirectory(): string {
  if (tempDirectory == null) {
    throw new Error('Test temp directory was not created.');
  }

  return tempDirectory;
}
