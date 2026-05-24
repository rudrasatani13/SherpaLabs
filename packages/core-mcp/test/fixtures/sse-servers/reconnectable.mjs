import { setTimeout } from 'node:timers';

import { startSseFixtureServer } from './shared.mjs';

let initialized = false;
let dropCount = 0;

startSseFixtureServer((message, context) => {
  if (message.method === 'initialize') {
    context.sendResult(message.id, {
      protocolVersion: message.params?.protocolVersion ?? '2025-11-25',
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'reconnectable-sse-fixture', version: '1.0.0' },
    });
    return;
  }

  if (message.method === 'notifications/initialized') {
    initialized = true;
    return;
  }

  if (message.method === 'fixture/drop') {
    dropCount += 1;
    setTimeout(() => {
      context.closeClients();
    }, 20);
    return;
  }

  if (message.method === 'tools/list') {
    context.sendResult(message.id, {
      tools: [
        {
          name: initialized ? 'reconnected-tool' : 'not-initialized',
          description: `drop count ${dropCount}`,
        },
      ],
    });
    return;
  }

  context.sendError(message.id, -32_601, `unknown method: ${message.method}`);
});
