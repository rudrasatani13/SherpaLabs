import { setTimeout } from 'node:timers';

import { startSseFixtureServer } from './shared.mjs';

let initialized = false;
let postCount = 0;

startSseFixtureServer((message, context) => {
  postCount += 1;

  if (message.method === 'initialize') {
    context.sendResult(message.id, {
      protocolVersion: message.params?.protocolVersion ?? '2025-11-25',
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'healthy-sse-fixture', version: '1.0.0' },
    });
    return;
  }

  if (message.method === 'notifications/initialized') {
    initialized = true;
    return;
  }

  if (message.method === 'tools/list') {
    context.sendResult(message.id, {
      tools: [
        {
          name: initialized ? 'initialized-tool' : 'not-initialized',
          description: 'Minimal SSE fixture tool',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string' },
            },
            required: ['path'],
          },
        },
      ],
      postCount,
    });
    return;
  }

  if (message.method === 'fixture/echo') {
    const delayMs = Number(message.params?.delayMs ?? 0);
    setTimeout(() => {
      context.sendResult(message.id, {
        echo: message.params ?? null,
        responseId: message.id,
        postCount,
        transport: 'http-post',
      });
    }, delayMs);
    return;
  }

  if (message.method === 'fixture/error') {
    context.sendError(message.id, -32_003, 'fixture error');
    return;
  }

  context.sendError(message.id, -32_601, `unknown method: ${message.method}`);
});
