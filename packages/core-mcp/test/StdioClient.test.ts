import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  JsonRpcResponseError,
  MalformedJsonRpcError,
  StdioClient,
  StdioProcessExitError,
  StdioProcessSpawnError,
  StdioRequestTimeoutError,
  type ProtocolLogEntry,
  type StdioClientOptions,
} from '../src/index.js';

const testDirectory = dirname(fileURLToPath(import.meta.url));
const fixtureDirectory = join(testDirectory, 'fixtures', 'stdio-servers');

function fixturePath(name: string): string {
  return join(fixtureDirectory, name);
}

function createFixtureClient(
  fixtureName: string,
  options: Omit<StdioClientOptions, 'command' | 'args'> = {},
): StdioClient {
  return new StdioClient({
    command: process.execPath,
    args: [fixturePath(fixtureName)],
    ...options,
  });
}

describe('StdioClient', () => {
  it('connects to a healthy stdio fixture in under 1 second', async () => {
    const client = createFixtureClient('healthy.mjs');
    const startedAt = Date.now();

    try {
      await client.connect();

      expect(Date.now() - startedAt).toBeLessThan(1_000);
      expect(client.isConnected).toBe(true);
    } finally {
      await client.disconnect();
    }
  });

  it('initializes and sends notifications/initialized', async () => {
    const client = createFixtureClient('healthy.mjs');

    try {
      await client.connect();
      const initializeResult = await client.initialize();
      const toolsResult = await client.listTools({ timeoutMs: 500 });

      expect(initializeResult.protocolVersion).toBe('2025-11-25');
      expect(client.protocolVersion).toBe('2025-11-25');
      expect(client.serverInfo?.name).toBe('healthy-fixture');
      expect(toolsResult.tools[0]?.name).toBe('initialized-tool');
    } finally {
      await client.disconnect();
    }
  });

  it('lists tools using the default request timeout', async () => {
    const client = createFixtureClient('healthy.mjs');

    try {
      await client.connect();
      await client.initialize();

      await expect(client.listTools()).resolves.toMatchObject({
        tools: [{ name: 'initialized-tool' }],
      });
    } finally {
      await client.disconnect();
    }
  });

  it('correlates multiple in-flight request IDs with their responses', async () => {
    const client = createFixtureClient('healthy.mjs');

    try {
      await client.connect();
      await client.initialize();

      const slow = client.request<{ readonly echo: { readonly label: string } }>('fixture/echo', {
        label: 'slow',
        delayMs: 80,
      });
      const fast = client.request<{ readonly echo: { readonly label: string } }>('fixture/echo', {
        label: 'fast',
        delayMs: 5,
      });
      const medium = client.request<{ readonly echo: { readonly label: string } }>('fixture/echo', {
        label: 'medium',
        delayMs: 30,
      });

      const [slowResult, fastResult, mediumResult] = await Promise.all([slow, fast, medium]);

      expect(slowResult.echo.label).toBe('slow');
      expect(fastResult.echo.label).toBe('fast');
      expect(mediumResult.echo.label).toBe('medium');
    } finally {
      await client.disconnect();
    }
  });

  it('rejects pending requests when the server crashes', async () => {
    const client = createFixtureClient('crash.mjs');

    try {
      await client.connect();
      await client.initialize();

      try {
        await client.request('fixture/crash', undefined, { timeoutMs: 1_000 });
        throw new Error('expected request to fail');
      } catch (error) {
        if (!(error instanceof StdioProcessExitError)) {
          throw error;
        }

        const stderrTail = error.context?.stderrTail;

        expect(error.code).toBe('MCP_STDIO_PROCESS_EXITED');
        expect(error.context?.exitCode).toBe(42);
        expect(typeof stderrTail).toBe('string');

        if (typeof stderrTail !== 'string') {
          throw new TypeError('expected stderrTail to be a string');
        }

        expect(stderrTail).toContain('fixture crash before response');
      }
    } finally {
      await client.disconnect();
    }
  });

  it('times out a hung request', async () => {
    const client = createFixtureClient('hang.mjs');

    try {
      await client.connect();
      await client.initialize();

      await expect(client.listTools({ timeoutMs: 50 })).rejects.toBeInstanceOf(
        StdioRequestTimeoutError,
      );
    } finally {
      await client.disconnect();
    }
  });

  it('returns a useful error for malformed stdout', async () => {
    const client = createFixtureClient('malformed.mjs');

    try {
      await client.connect();

      await expect(client.initialize(undefined, { timeoutMs: 500 })).rejects.toBeInstanceOf(
        MalformedJsonRpcError,
      );
    } finally {
      await client.disconnect();
    }
  });

  it('allows stderr logs while parsing valid stdout protocol messages', async () => {
    const client = createFixtureClient('stderr-logs.mjs');

    try {
      await client.connect();
      await client.initialize();

      await expect(client.listTools({ timeoutMs: 500 })).resolves.toEqual({ tools: [] });
    } finally {
      await client.disconnect();
    }
  });

  it('treats a startup banner on stdout as a framing error', async () => {
    const client = createFixtureClient('stdout-banner.mjs');

    try {
      await client.connect();

      await expect(client.initialize(undefined, { timeoutMs: 500 })).rejects.toBeInstanceOf(
        MalformedJsonRpcError,
      );
    } finally {
      await client.disconnect();
    }
  });

  it('redacts obvious secret fields in verbose protocol logs', async () => {
    const entries: ProtocolLogEntry[] = [];
    const client = createFixtureClient('healthy.mjs', {
      verbose: true,
      onProtocolMessage: (entry) => {
        entries.push(entry);
      },
    });

    try {
      await client.connect();
      await client.initialize({
        clientInfo: {
          name: 'redaction-test',
          version: '1.0.0',
          token: 'initialize-token',
        },
      });
      await client.request('fixture/echo', {
        token: 'request-token',
        authorization: 'Bearer abc',
        apiKey: 'api-key-value',
        password: 'password-value',
        nested: { secret: 'nested-secret' },
      });

      const serializedEntries = JSON.stringify(entries);

      expect(serializedEntries).toContain('[REDACTED]');
      expect(serializedEntries).not.toContain('initialize-token');
      expect(serializedEntries).not.toContain('request-token');
      expect(serializedEntries).not.toContain('Bearer abc');
      expect(serializedEntries).not.toContain('api-key-value');
      expect(serializedEntries).not.toContain('password-value');
      expect(serializedEntries).not.toContain('nested-secret');
    } finally {
      await client.disconnect();
    }
  });

  it('wraps JSON-RPC error responses in a typed error', async () => {
    const client = createFixtureClient('healthy.mjs');

    try {
      await client.connect();
      await client.initialize();

      await expect(
        client.request('fixture/error', undefined, { timeoutMs: 500 }),
      ).rejects.toBeInstanceOf(JsonRpcResponseError);
    } finally {
      await client.disconnect();
    }
  });

  it('returns a typed error when process spawning fails', async () => {
    const client = new StdioClient({
      command: fixturePath('missing-server-binary'),
    });

    await expect(client.connect()).rejects.toBeInstanceOf(StdioProcessSpawnError);
  });

  it('exports process exit errors for crash diagnostics', () => {
    expect(
      new StdioProcessExitError({
        command: 'node',
        args: [],
        cwd: undefined,
        exitCode: 1,
        signal: null,
        stderrTail: 'boom',
      }).message,
    ).toContain('exit code 1');
  });
});
