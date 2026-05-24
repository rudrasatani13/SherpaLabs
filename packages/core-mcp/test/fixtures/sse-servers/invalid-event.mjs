import { startSseFixtureServer } from './shared.mjs';

startSseFixtureServer((_message, context) => {
  context.broadcastRaw('retry: nope\ndata: ignored\n\n');
});
