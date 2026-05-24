import process from 'node:process';

import type { WritableStreamLike } from './output.js';

const NO_COLOR_ENV = 'NO_COLOR';
const FORCE_COLOR_ENV = 'FORCE_COLOR';

export function shouldEnableColor(stream: WritableStreamLike): boolean {
  if (process.env[NO_COLOR_ENV] !== undefined) {
    return false;
  }

  if (process.env[FORCE_COLOR_ENV] !== undefined) {
    return process.env[FORCE_COLOR_ENV] !== '0';
  }

  return stream.isTTY === true;
}
