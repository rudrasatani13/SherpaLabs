import { startSseFixtureServer } from './shared.mjs';

startSseFixtureServer((message, context) => {
  if (message.method === 'initialize') {
    context.broadcastRaw('event: message\ndata: not-json\n\n');
    return;
  }

  context.sendError(message.id, -32_601, `unknown method: ${message.method}`);
});
