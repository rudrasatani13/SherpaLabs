import process from 'node:process';

import { startLineServer } from './shared.mjs';

startLineServer(() => {
  process.stdout.write('this is not json-rpc\n');
});
