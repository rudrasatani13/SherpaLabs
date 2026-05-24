import { sendResult, startLineServer } from './shared.mjs';

startLineServer((message) => {
  if (message.method === 'initialize') {
    sendResult(message.id, {
      protocolVersion: '2025-11-25',
      capabilities: { tools: {} },
      serverInfo: { name: 'hang-fixture', version: '1.0.0' },
    });
  }
});
