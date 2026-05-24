import process from 'node:process';

import { sendResult, startLineServer } from './shared.mjs';

startLineServer((message) => {
  if (message.method === 'initialize') {
    sendResult(message.id, {
      protocolVersion: '2025-11-25',
      capabilities: { tools: {} },
      serverInfo: { name: 'crash-fixture', version: '1.0.0' },
    });
    return;
  }

  if (message.method === 'notifications/initialized') {
    return;
  }

  process.stderr.write('fixture crash before response\n');
  process.exit(42);
});
