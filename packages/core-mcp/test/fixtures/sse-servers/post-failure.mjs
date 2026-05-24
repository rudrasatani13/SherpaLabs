import { startSseFixtureServer } from './shared.mjs';

startSseFixtureServer((_message, context) => {
  context.response.writeHead(500).end('fixture post failure');
});
