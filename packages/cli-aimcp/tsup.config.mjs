import { readFileSync } from 'node:fs';

import { defineConfig } from 'tsup';

const packageMetadata = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
);

if (typeof packageMetadata.version !== 'string') {
  throw new TypeError('packages/cli-aimcp/package.json must contain a string version.');
}

export default defineConfig({
  entry: ['src/index.ts'],
  bundle: true,
  clean: true,
  dts: false,
  format: ['esm'],
  minify: true,
  noExternal: ['commander'],
  outDir: 'dist',
  platform: 'node',
  shims: false,
  sourcemap: false,
  splitting: false,
  target: 'node18',
  banner: {
    js: [
      "import { createRequire as __aimcpCreateRequire } from 'node:module';",
      'const require = __aimcpCreateRequire(import.meta.url);',
    ].join('\n'),
  },
  define: {
    AIMCP_LINT_PACKAGE_VERSION: JSON.stringify(packageMetadata.version),
  },
});
