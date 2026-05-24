import { setTimeout } from 'node:timers';

import { startSseFixtureServer } from './shared.mjs';

let initialized = false;

startSseFixtureServer((message, context) => {
  if (message.method === 'initialize') {
    context.sendResult(message.id, {
      protocolVersion: message.params?.protocolVersion ?? '2025-11-25',
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'close-sse-fixture', version: '1.0.0' },
    });
    return;
  }

  if (message.method === 'notifications/initialized') {
    initialized = true;
    return;
  }

  if (message.method === 'tools/list') {
    context.sendResult(message.id, {
      tools: [{ name: initialized ? 'initialized-tool' : 'not-initialized' }],
    });
    return;
  }

  if (message.method === 'fixture/close') {
    setTimeout(() => {
      context.closeClients();
    }, 20);
    return;
  }

  context.sendError(message.id, -32_601, `unknown method: ${message.method}`);
});
