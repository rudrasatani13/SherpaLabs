import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import process from 'node:process';
import type { Readable } from 'node:stream';
import { setTimeout as sleepFor } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  HttpNon2xxResponseError,
  InvalidSseEventError,
  JsonRpcResponseError,
  SseClient,
  SseConnectionFailureError,
  SseMalformedJsonRpcError,
  SseParser,
  StdioClient,
  type McpClient,
  type ProtocolLogEntry,
} from '../src/index.js';

const testDirectory = dirname(fileURLToPath(import.meta.url));
const sseFixtureDirectory = join(testDirectory, 'fixtures', 'sse-servers');
const stdioFixtureDirectory = join(testDirectory, 'fixtures', 'stdio-servers');

interface RunningFixtureServer {
  readonly url: string;
  readonly stderr: () => string;
  stop(): Promise<void>;
}

function sseFixturePath(name: string): string {
  return join(sseFixtureDirectory, name);
}

function stdioFixturePath(name: string): string {
  return join(stdioFixtureDirectory, name);
}

describe('SseParser', () => {
  it('parses event names, comments, and multi-line data', () => {
    const parser = new SseParser();

    expect(parser.push(': heartbeat\n')).toEqual([]);
    expect(parser.push('event: mes')).toEqual([]);
    expect(parser.push('sage\r\nid: 1\ndata: {"value":\ndata: 1}\n\n')).toEqual([
      {
        event: 'message',
        id: '1',
        data: '{"value":\n1}',
      },
    ]);
  });

  it('returns a typed error for invalid retry fields', () => {
    const parser = new SseParser();

    expect(() => {
      parser.push('retry: nope\ndata: ignored\n\n');
    }).toThrow(InvalidSseEventError);
  });
});

describe('SseClient', () => {
  it('connects, initializes, sends notifications/initialized, and lists tools', async () => {
    const server = await startFixtureServer('healthy.mjs');
    const client = new SseClient({ url: server.url });

    try {
      await client.connect();
      const initializeResult = await client.initialize();
      const toolsResult = await client.listTools({ timeoutMs: 500 });

      expect(client.isConnected).toBe(true);
      expect(initializeResult.protocolVersion).toBe('2025-11-25');
      expect(client.protocolVersion).toBe('2025-11-25');
      expect(client.serverInfo?.name).toBe('healthy-sse-fixture');
      expect(toolsResult.tools[0]?.name).toBe('initialized-tool');
    } finally {
      await client.disconnect();
      await server.stop();
    }
  });

  it('sends JSON-RPC requests over HTTP POST and correlates SSE responses by ID', async () => {
    const server = await startFixtureServer('healthy.mjs');
    const client = new SseClient({ url: server.url });

    try {
      await client.connect();
      await client.initialize();

      const slow = client.request<{ readonly echo: { readonly label: string } }>('fixture/echo', {
        label: 'slow',
        delayMs: 80,
      });
      const fast = client.request<{
        readonly echo: { readonly label: string };
        readonly transport: string;
      }>('fixture/echo', {
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
      expect(fastResult.transport).toBe('http-post');
      expect(mediumResult.echo.label).toBe('medium');
    } finally {
      await client.disconnect();
      await server.stop();
    }
  });

  it('wraps JSON-RPC error responses in the shared response error type', async () => {
    const server = await startFixtureServer('healthy.mjs');
    const client = new SseClient({ url: server.url });

    try {
      await client.connect();
      await client.initialize();

      await expect(
        client.request('fixture/error', undefined, { timeoutMs: 500 }),
      ).rejects.toBeInstanceOf(JsonRpcResponseError);
    } finally {
      await client.disconnect();
      await server.stop();
    }
  });

  it('returns a typed malformed JSON-RPC error for invalid SSE message data', async () => {
    const server = await startFixtureServer('malformed-json.mjs');
    const client = new SseClient({ url: server.url });

    try {
      await client.connect();

      await expect(client.initialize(undefined, { timeoutMs: 500 })).rejects.toBeInstanceOf(
        SseMalformedJsonRpcError,
      );
    } finally {
      await client.disconnect();
      await server.stop();
    }
  });

  it('returns a typed invalid SSE event error for malformed event fields', async () => {
    const server = await startFixtureServer('invalid-event.mjs');
    const client = new SseClient({ url: server.url });

    try {
      await client.connect();

      await expect(client.initialize(undefined, { timeoutMs: 500 })).rejects.toBeInstanceOf(
        InvalidSseEventError,
      );
    } finally {
      await client.disconnect();
      await server.stop();
    }
  });

  it('returns a typed HTTP error for non-2xx POST responses', async () => {
    const server = await startFixtureServer('post-failure.mjs');
    const client = new SseClient({ url: server.url });

    try {
      await client.connect();

      await expect(client.initialize(undefined, { timeoutMs: 500 })).rejects.toBeInstanceOf(
        HttpNon2xxResponseError,
      );
    } finally {
      await client.disconnect();
      await server.stop();
    }
  });

  it('rejects pending requests when the SSE stream closes mid-conversation', async () => {
    const server = await startFixtureServer('close-mid-conversation.mjs');
    const client = new SseClient({ url: server.url });

    try {
      await client.connect();
      await client.initialize();

      await expect(
        client.request('fixture/close', undefined, { timeoutMs: 1_000 }),
      ).rejects.toBeInstanceOf(SseConnectionFailureError);
      expect(client.isConnected).toBe(false);
    } finally {
      await client.disconnect();
      await server.stop();
    }
  });

  it('does not reconnect when automatic reconnection is disabled', async () => {
    const server = await startFixtureServer('close-mid-conversation.mjs');
    const client = new SseClient({ url: server.url, reconnect: false });

    try {
      await client.connect();
      await client.initialize();

      await expect(
        client.request('fixture/close', undefined, { timeoutMs: 1_000 }),
      ).rejects.toBeInstanceOf(SseConnectionFailureError);
      await sleepFor(100);

      expect(client.isConnected).toBe(false);
    } finally {
      await client.disconnect();
      await server.stop();
    }
  });

  it('reconnects automatically when configured without replaying pending requests', async () => {
    const server = await startFixtureServer('reconnectable.mjs');
    const client = new SseClient({
      url: server.url,
      reconnect: true,
      reconnectMaxAttempts: 5,
      reconnectInitialDelayMs: 10,
    });

    try {
      await client.connect();
      await client.initialize();

      await expect(
        client.request('fixture/drop', undefined, { timeoutMs: 1_000 }),
      ).rejects.toBeInstanceOf(SseConnectionFailureError);
      await waitForCondition(() => client.isConnected);

      await expect(client.listTools({ timeoutMs: 500 })).resolves.toMatchObject({
        tools: [{ name: 'reconnected-tool' }],
      });
    } finally {
      await client.disconnect();
      await server.stop();
    }
  });

  it('redacts secrets in verbose protocol logs and transport metadata', async () => {
    const server = await startFixtureServer('healthy.mjs');
    const entries: ProtocolLogEntry[] = [];
    const client = new SseClient({
      url: server.url,
      headers: {
        Authorization: 'Bearer header-secret',
        Cookie: 'session=secret-cookie',
        'X-Api-Key': 'api-key-secret',
      },
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
        authorization: 'Bearer request-secret',
        apiKey: 'api-key-value',
        password: 'password-value',
        nested: { secret: 'nested-secret' },
      });

      const serializedEntries = JSON.stringify(entries);

      expect(serializedEntries).toContain('[REDACTED]');
      expect(serializedEntries).not.toContain('header-secret');
      expect(serializedEntries).not.toContain('secret-cookie');
      expect(serializedEntries).not.toContain('api-key-secret');
      expect(serializedEntries).not.toContain('fixture-session-secret');
      expect(serializedEntries).not.toContain('initialize-token');
      expect(serializedEntries).not.toContain('request-token');
      expect(serializedEntries).not.toContain('Bearer request-secret');
      expect(serializedEntries).not.toContain('api-key-value');
      expect(serializedEntries).not.toContain('password-value');
      expect(serializedEntries).not.toContain('nested-secret');
    } finally {
      await client.disconnect();
      await server.stop();
    }
  });

  it('accepts both stdio and SSE clients through the shared McpClient interface', () => {
    const sseClient = new SseClient({ url: 'http://127.0.0.1:1/sse' });
    const stdioClient = new StdioClient({
      command: process.execPath,
      args: [stdioFixturePath('healthy.mjs')],
    });

    expect(acceptsMcpClient(sseClient)).toBe(true);
    expect(acceptsMcpClient(stdioClient)).toBe(true);
  });
});

function acceptsMcpClient(_client: McpClient): boolean {
  return true;
}

async function startFixtureServer(name: string): Promise<RunningFixtureServer> {
  const child = spawn(process.execPath, [sseFixturePath(name)], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stdout = child.stdout;
  const stderrStream = child.stderr;
  stdout.setEncoding('utf8');
  stderrStream.setEncoding('utf8');
  let stderr = '';

  stderrStream.on('data', (chunk: string) => {
    stderr += chunk;
  });

  const url = await readStartupUrl(child, stdout, () => stderr);

  return {
    url,
    stderr: () => stderr,
    stop: async () => {
      await stopFixtureServer(child);
    },
  };
}

async function readStartupUrl(
  child: ReturnType<typeof spawn>,
  stdout: Readable,
  readStderr: () => string,
): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    let stdoutBuffer = '';
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`SSE fixture did not start in time: ${readStderr()}`));
    }, 2_000);

    const onData = (chunk: string): void => {
      stdoutBuffer += chunk;
      const newlineIndex = stdoutBuffer.indexOf('\n');

      if (newlineIndex === -1) {
        return;
      }

      cleanup();
      resolve(parseStartupUrl(stdoutBuffer.slice(0, newlineIndex)));
    };

    const onExit = (exitCode: number | null, signal: NodeJS.Signals | null): void => {
      cleanup();
      reject(
        new Error(
          `SSE fixture exited before startup: ${exitCode ?? signal ?? 'unknown'} ${readStderr()}`,
        ),
      );
    };

    const cleanup = (): void => {
      clearTimeout(timeout);
      stdout.off('data', onData);
      child.off('exit', onExit);
    };

    stdout.on('data', onData);
    child.once('exit', onExit);
  });
}

function parseStartupUrl(line: string): string {
  const parsed = JSON.parse(line) as unknown;

  if (
    typeof parsed === 'object' &&
    parsed != null &&
    'url' in parsed &&
    typeof parsed.url === 'string'
  ) {
    return parsed.url;
  }

  throw new Error(`Invalid SSE fixture startup payload: ${line}`);
}

async function stopFixtureServer(child: ReturnType<typeof spawn>): Promise<void> {
  if (child.exitCode != null || child.signalCode != null) {
    return;
  }

  child.kill('SIGTERM');

  if (!(await waitForChildExit(child, 500))) {
    child.kill('SIGKILL');
    await waitForChildExit(child, 500);
  }
}

async function waitForChildExit(
  child: ReturnType<typeof spawn>,
  timeoutMs: number,
): Promise<boolean> {
  if (child.exitCode != null || child.signalCode != null) {
    return true;
  }

  return await Promise.race([
    new Promise<boolean>((resolve) => {
      child.once('exit', () => {
        resolve(true);
      });
    }),
    sleepFor(timeoutMs).then(() => false),
  ]);
}

async function waitForCondition(condition: () => boolean, timeoutMs = 1_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() <= deadline) {
    if (condition()) {
      return;
    }

    await sleepFor(20);
  }

  throw new Error('condition was not met before timeout');
}
