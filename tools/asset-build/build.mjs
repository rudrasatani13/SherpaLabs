import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const assetsRoot = resolve(here, '../../packages/shared-config/assets');

const targets = [
  {
    source: 'favicon/icon.svg',
    out: 'favicon/favicon-16.png',
    size: 16,
  },
  {
    source: 'favicon/icon.svg',
    out: 'favicon/favicon-32.png',
    size: 32,
  },
  {
    source: 'favicon/icon.svg',
    out: 'favicon/favicon-192.png',
    size: 192,
  },
  {
    source: 'favicon/icon.svg',
    out: 'favicon/favicon-512.png',
    size: 512,
  },
  {
    source: 'favicon/icon-maskable.svg',
    out: 'favicon/favicon-maskable-512.png',
    size: 512,
  },
  {
    source: 'og/og-template.svg',
    out: 'og/og-default.png',
    width: 1200,
    height: 630,
  },
];

async function rasterise({ source, out, size, width, height }) {
  const svgPath = join(assetsRoot, source);
  const outPath = join(assetsRoot, out);

  const svg = await readFile(svgPath);
  await mkdir(dirname(outPath), { recursive: true });

  const resize = size != null ? { width: size, height: size } : { width, height };

  const buf = await sharp(svg, { density: 384 })
    .resize({ ...resize, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();

  await writeFile(outPath, buf);
  console.log(`  ${source.padEnd(36)} -> ${out}  (${buf.length} bytes)`);
}

console.log('Rasterising brand assets...');
for (const target of targets) {
  await rasterise(target);
}
console.log('Done.');
