#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { runCli } from './cli.js';

export { createCli, runCli } from './cli.js';
export { packageVersion } from './version.js';

function isDirectEntrypoint(): boolean {
  const entryPath = process.argv[1];

  if (entryPath == null) {
    return false;
  }

  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(entryPath);
  } catch {
    return false;
  }
}

if (isDirectEntrypoint()) {
  await runCli(process.argv);
}
