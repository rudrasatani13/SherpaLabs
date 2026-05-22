# `@sherpa-labs/shared-config/assets`

Brand assets used across the Sherpa Labs marketing site, dashboard, CLI
docs, and OG/social previews.

Authoring rules and palette/typography decisions live in
[`docs/BRAND.md`](../../../docs/BRAND.md). When in doubt, the brand guide
is the source of truth and these files are its build output.

## Layout

```
assets/
├── logo/         # Wordmark + mark SVG masters
├── favicon/      # SVG mark + generated PNGs (16/32/192/512/maskable)
└── og/           # Open Graph template SVG + rendered 1200×630 PNG
```

## Regenerating raster outputs

PNG outputs are regenerated from the SVG masters by the asset build
script. From the repository root:

```sh
pnpm -F @sherpa-labs/asset-build build
```

The script uses [`sharp`](https://sharp.pixelplumbing.com/) and is
intentionally hermetic — no network, no system fonts. Anything that
needs the Inter typeface is rasterised via `<text>`-free SVG (paths or
preinlined glyphs), so the output is byte-stable across machines.

## Versioning

Asset files are version-controlled. If you change a master SVG, commit
the regenerated PNGs in the same change so consumers do not have to run
the build to get matching outputs.
