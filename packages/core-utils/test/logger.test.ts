import { describe, expect, it } from 'vitest';

import { createLogger, type LogWriter } from '../src/logger.js';

function createMemoryWriter(): LogWriter & { stdoutLines: string[]; stderrLines: string[] } {
  const stdoutLines: string[] = [];
  const stderrLines: string[] = [];

  return {
    stdoutLines,
    stderrLines,
    stdout: (message) => {
      stdoutLines.push(message);
    },
    stderr: (message) => {
      stderrLines.push(message);
    },
  };
}

describe('createLogger', () => {
  it('writes human info logs to stdout by default', () => {
    const writer = createMemoryWriter();
    const logger = createLogger({ writer });

    logger.info('scan complete', { files: 3 });

    expect(writer.stdoutLines).toEqual(['INFO scan complete {"files":3}\n']);
    expect(writer.stderrLines).toEqual([]);
  });

  it('writes warnings and errors to stderr', () => {
    const writer = createMemoryWriter();
    const logger = createLogger({ writer });

    logger.warn('near token limit');
    logger.error('scan failed', { code: 'read_error' });

    expect(writer.stdoutLines).toEqual([]);
    expect(writer.stderrLines).toEqual([
      'WARN near token limit\n',
      'ERROR scan failed {"code":"read_error"}\n',
    ]);
  });

  it('filters logs below the configured level', () => {
    const writer = createMemoryWriter();
    const logger = createLogger({ level: 'warn', writer });

    logger.debug('debug details');
    logger.info('status');
    logger.warn('visible');

    expect(writer.stdoutLines).toEqual([]);
    expect(writer.stderrLines).toEqual(['WARN visible\n']);
  });

  it('allows changing the level at runtime', () => {
    const writer = createMemoryWriter();
    const logger = createLogger({ level: 'error', writer });

    expect(logger.getLevel()).toBe('error');

    logger.warn('hidden');
    logger.setLevel('debug');
    logger.debug('visible');

    expect(logger.getLevel()).toBe('debug');
    expect(writer.stdoutLines).toEqual(['DEBUG visible\n']);
    expect(writer.stderrLines).toEqual([]);
  });

  it('writes JSON logs when CI mode is enabled', () => {
    const writer = createMemoryWriter();
    const logger = createLogger({
      ci: true,
      writer,
      now: () => new Date('2026-05-23T00:00:00.000Z'),
    });

    logger.info('scan complete', { files: 3 });

    expect(writer.stdoutLines).toEqual([
      '{"timestamp":"2026-05-23T00:00:00.000Z","level":"info","message":"scan complete","fields":{"files":3}}\n',
    ]);
  });
});
