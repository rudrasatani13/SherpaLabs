import process from 'node:process';

import { sendResult, startLineServer } from './shared.mjs';

process.stdout.write('starting fixture server\n');

startLineServer((message) => {
  if (message.method === 'initialize') {
    sendResult(message.id, {
      protocolVersion: '2025-11-25',
      capabilities: {},
      serverInfo: { name: 'banner-fixture', version: '1.0.0' },
    });
  }
});
