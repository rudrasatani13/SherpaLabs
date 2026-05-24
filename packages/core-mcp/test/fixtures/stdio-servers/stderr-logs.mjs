import process from 'node:process';

import { sendResult, startLineServer } from './shared.mjs';

process.stderr.write('fixture startup log\n');

startLineServer((message) => {
  process.stderr.write(`fixture saw ${message.method}\n`);

  if (message.method === 'initialize') {
    sendResult(message.id, {
      protocolVersion: '2025-11-25',
      capabilities: { tools: {} },
      serverInfo: { name: 'stderr-fixture', version: '1.0.0' },
    });
    return;
  }

  if (message.method === 'notifications/initialized') {
    return;
  }

  if (message.method === 'tools/list') {
    sendResult(message.id, { tools: [] });
  }
});
