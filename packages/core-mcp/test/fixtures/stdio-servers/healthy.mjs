import { setTimeout } from 'node:timers';

import { sendError, sendResult, startLineServer } from './shared.mjs';

let initialized = false;

startLineServer((message) => {
  if (message.method === 'initialize') {
    sendResult(message.id, {
      protocolVersion: message.params?.protocolVersion ?? '2025-11-25',
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'healthy-fixture', version: '1.0.0' },
    });
    return;
  }

  if (message.method === 'notifications/initialized') {
    initialized = true;
    return;
  }

  if (message.method === 'tools/list') {
    sendResult(message.id, {
      tools: [
        {
          name: initialized ? 'initialized-tool' : 'not-initialized',
          description: 'Minimal fixture tool',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string' },
            },
            required: ['path'],
          },
        },
      ],
    });
    return;
  }

  if (message.method === 'fixture/echo') {
    const delayMs = Number(message.params?.delayMs ?? 0);
    setTimeout(() => {
      sendResult(message.id, { echo: message.params ?? null, responseId: message.id });
    }, delayMs);
    return;
  }

  if (message.method === 'fixture/error') {
    sendError(message.id, -32_003, 'fixture error');
    return;
  }

  sendError(message.id, -32_601, `unknown method: ${message.method}`);
});
