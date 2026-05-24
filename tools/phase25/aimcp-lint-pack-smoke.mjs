#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const packageRoot = join(repoRoot, 'packages', 'cli-aimcp');
const packageJson = await import(join(packageRoot, 'package.json'), { with: { type: 'json' } });

let tempRoot;
let passed = false;

try {
  tempRoot = await mkdtemp(join(tmpdir(), 'aimcp-lint-pack-smoke-'));
  const packDir = join(tempRoot, 'pack');
  const extractDir = join(tempRoot, 'extract');
  const binDir = join(tempRoot, 'bin');

  await run('pnpm', [
    'exec',
    'tsc',
    '--build',
    '--force',
    'packages/shared-types/tsconfig.json',
    'packages/core-utils/tsconfig.json',
    'packages/core-mcp/tsconfig.json',
  ]);
  await run('pnpm', ['--filter', '@sherpa-labs/aimcp-lint', 'build']);
  await mkdir(packDir, { recursive: true });
  await mkdir(extractDir, { recursive: true });
  await mkdir(binDir, { recursive: true });
  await run('pnpm', ['pack', '--pack-destination', packDir], { cwd: packageRoot });

  const tarballs = (await readdir(packDir)).filter((file) => file.endsWith('.tgz'));
  assert(tarballs.length === 1, `Expected one packed tarball, found ${tarballs.length}.`);

  const tarballPath = join(packDir, tarballs[0]);
  const tarballEntries = (await runCapture('tar', ['-tf', tarballPath])).stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .sort();

  validateTarballEntries(tarballEntries);

  await run('tar', ['-xzf', tarballPath, '-C', extractDir]);

  const extractedBinary = join(extractDir, 'package', 'dist', 'index.js');
  const shimPath = join(binDir, 'aimcp-lint');
  await chmod(extractedBinary, 0o755);
  await symlink(extractedBinary, shimPath);

  const help = await runCapture(shimPath, ['--help']);
  assert(help.stdout.includes('Usage: aimcp-lint'), 'Packed binary did not print CLI help.');

  const version = await runCapture(shimPath, ['--version']);
  assert(
    version.stdout.trim() === packageJson.default.version,
    `Packed binary version was ${version.stdout.trim()}, expected ${packageJson.default.version}.`,
  );

  passed = true;
  console.log('Phase 25 aimcp-lint pack smoke passed.');
  console.log(`tarball: ${basename(tarballPath)}`);
  console.log(`version: ${version.stdout.trim()}`);
  console.log(`files: ${tarballEntries.join(', ')}`);
} finally {
  if (tempRoot !== undefined) {
    if (passed && process.env.KEEP_PHASE25_PACK_SMOKE !== '1') {
      await rm(tempRoot, { force: true, recursive: true });
    } else {
      console.log(`temp: ${tempRoot}`);
    }
  }
}

function validateTarballEntries(entries) {
  const allowed = entries.filter(
    (entry) =>
      entry === 'package/package.json' ||
      entry === 'package/LICENSE' ||
      entry.startsWith('package/dist/'),
  );

  assert(
    allowed.length === entries.length,
    `Tarball includes unexpected files: ${entries
      .filter((entry) => !allowed.includes(entry))
      .join(', ')}`,
  );
  assert(entries.includes('package/package.json'), 'Tarball is missing package.json.');
  assert(entries.includes('package/LICENSE'), 'Tarball is missing LICENSE.');
  assert(entries.includes('package/dist/index.js'), 'Tarball is missing dist/index.js.');
  assert(entries.includes('package/dist/index.d.ts'), 'Tarball is missing dist/index.d.ts.');
}

async function run(command, args, options = {}) {
  const result = await runCapture(command, args, { ...options, stdio: 'inherit' });

  return result;
}

async function runCapture(command, args, options = {}) {
  const cwd = options.cwd ?? repoRoot;
  const stdio = options.stdio ?? 'pipe';

  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, FORCE_COLOR: '0' },
      stdio,
    });
    const stdout = [];
    const stderr = [];

    if (child.stdout !== null) {
      child.stdout.on('data', (chunk) => {
        stdout.push(chunk);
      });
    }

    if (child.stderr !== null) {
      child.stderr.on('data', (chunk) => {
        stderr.push(chunk);
      });
    }

    child.on('error', reject);
    child.on('close', (code) => {
      const result = {
        code,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
      };

      if (code === 0) {
        resolve(result);
        return;
      }

      reject(
        new Error(
          [
            `Command failed (${code}): ${[command, ...args].join(' ')}`,
            result.stdout,
            result.stderr,
          ]
            .filter(Boolean)
            .join('\n'),
        ),
      );
    });
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
