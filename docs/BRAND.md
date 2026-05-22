# Sherpa Labs — Brand Guide

This document is the source of truth for the Sherpa Labs name, visual
identity, and naming conventions used across the marketing site,
dashboard, CLI surfaces, and social/OG previews. Keep it short.

If you're updating brand assets, also update this file in the same
change.

## Name and identifiers

| Surface | Canonical value |
| ------- | --------------- |
| Display name | **Sherpa Labs** |
| Wordmark | `sherpa labs` (lowercase) |
| Tagline | **Better rules. Smarter agents.** |
| Primary domain | `sherpalabs.cloud` |
| npm scope | `@sherpa-labs/` |
| GitHub org slug | `sherpa-labs` |
| GitHub repo (current) | `rudrasatani13/SherpaLabs` (moves under `sherpa-labs/` org once that exists — see `PHASE4_EXTERNAL_SETUP.md`) |
| Primary email | `hello@sherpalabs.cloud` (TODO(owner) — set up via Cloudflare Email Routing) |
| Transactional sender | `noreply@sherpalabs.cloud` (TODO(owner) — set up via Cloudflare Email Routing) |

The display name capitalises both words; the wordmark in the logo is
intentionally lowercase to match the developer-tooling minimal
aesthetic.

## Colour palette

The palette is intentionally tiny — one accent, two neutrals. Anything
beyond this is a per-product accent and should be approved before being
added.

| Token | Hex | Use |
| ----- | --- | --- |
| `brand.indigo` | `#4F46E5` | Primary accent. Logo background, CTAs, accent type, focus rings. (Tailwind: `indigo-600`.) |
| `brand.zinc-900` | `#18181B` | Primary text. Headlines, body in light mode. (Tailwind: `zinc-900`.) |
| `brand.zinc-100` | `#FAFAFA` | Light surface. Page background, knock-out on indigo. (Tailwind: `zinc-50`.) |

Supporting neutrals for dividers, muted text, and disabled states are
the standard Tailwind `zinc` scale (`200`, `400`, `500`, `700`). They
are not brand tokens — use them as utility shades.

### Contrast

- `zinc-900` on `zinc-100` → WCAG AAA for body text.
- `indigo-600` (`#4F46E5`) on `zinc-100` → WCAG AA for large text and
  UI components. **Not AA for body text**: use indigo for headings,
  buttons, and accent runs, not paragraph copy.
- White on `indigo-600` → WCAG AAA.

## Typography

| Role | Family | Weight | Tracking |
| ---- | ------ | ------ | -------- |
| Display | Inter | 700 | `-0.04em` |
| Headings | Inter | 600 | `-0.02em` |
| Body | Inter | 400–500 | `0` |
| Wordmark | Inter | 600, lowercase | `-0.02em` |
| Code/mono | `ui-monospace`, `JetBrains Mono`, `SF Mono`, `Menlo` | 400–500 | `0` |

Inter is self-hosted (or loaded from Google Fonts) on each consuming
surface. `ui-monospace` is the preferred mono — it picks up the host
OS's native mono font with no extra weight on the page.

A full Tailwind preset wiring these fonts/colours will land in Phase 5
when `@sherpa-labs/shared-config` exposes its tailwind preset. Until
then, hand-roll the values from this guide.

## Logo and mark

Asset masters live in
[`packages/shared-config/assets/`](../packages/shared-config/assets/).

### Files

| Asset | Path | Notes |
| ----- | ---- | ----- |
| Wordmark (colour) | `logo/wordmark.svg` | Mark + `sherpa labs` text. Use on light backgrounds. |
| Wordmark (mono) | `logo/wordmark-mono.svg` | Single-colour variant for monochrome contexts. |
| Mark only | `logo/mark.svg` | Use anywhere the wordmark won't fit (avatars, social handles). |
| Favicon source | `favicon/icon.svg` | 64-unit viewBox. Rasterises to the favicon PNG set. |
| Maskable source | `favicon/icon-maskable.svg` | 512-unit viewBox with full-bleed indigo; mark inside the safe zone. |
| OG template | `og/og-template.svg` | 1200×630 social-card template. Edit headline copy per page. |

### Mark design

A solid `#4F46E5` rounded square (`rx=14` at 64 units) with a single
white path tracing the S of "sherpa" — two stacked curves, 6-unit
stroke, rounded caps. Pure geometry, no illustration, reads at 16 px.

### Usage rules

- Don't recolour the indigo. Don't add a gradient. Don't outline it.
- Minimum clear space around the mark = the height of the mark's stroke
  (~6 units of the 64-unit viewBox).
- Minimum render size: 16 px for the mark, 96 px wide for the
  wordmark.
- On dark backgrounds, use `logo/wordmark-mono.svg` and invert via CSS
  if needed.

## Favicon set

Generated from `favicon/icon.svg` and `favicon/icon-maskable.svg` by
the asset build script (`pnpm -F @sherpa-labs/asset-build build`).

| File | Size | Purpose |
| ---- | ---- | ------- |
| `favicon/favicon-16.png` | 16×16 | Browser tab fallback. |
| `favicon/favicon-32.png` | 32×32 | Browser tab (Retina). |
| `favicon/favicon-192.png` | 192×192 | Android home-screen, manifest icon. |
| `favicon/favicon-512.png` | 512×512 | Manifest large icon, share targets. |
| `favicon/favicon-maskable-512.png` | 512×512 | Maskable manifest icon (PWA install). |
| `favicon/icon.svg` | vector | Modern browsers prefer the SVG. |

### Manifest snippet

When the dashboard / marketing site land, wire the icons up like this
(adjust paths to wherever the assets get served):

```json
{
  "icons": [
    { "src": "/favicon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/favicon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/favicon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" sizes="32x32" href="/favicon-32.png">
<link rel="icon" sizes="16x16" href="/favicon-16.png">
<link rel="apple-touch-icon" sizes="192x192" href="/favicon-192.png">
```

## Open Graph image

`og/og-template.svg` is the master. `og/og-default.png` is the rendered
1200×630 PNG used as the site-wide default OG image until per-page
generation lands in Phase H.

To produce a page-specific OG image, copy the template SVG, swap the
two headline lines, and re-render via the asset build script. Long
term we will move OG rendering to runtime (Satori or `@vercel/og`) so
content teams don't run a build step.

### Template anatomy

- 1200×630 `#FAFAFA` background.
- Two hairline `#E4E4E7` rules at `y=120` and `y=510` framing a wide
  centre band.
- Mark (96×96 rounded indigo) at top-left in the 96-px gutter.
- Two-line headline in `#18181B` and `#4F46E5`, Inter 700 / 84 px /
  `-0.04em` tracking.
- `sherpa labs` wordmark bottom-left, `sherpalabs.cloud` bottom-right
  in mono.

### Text rendering caveat

The default raster is produced by `sharp` (librsvg + fontconfig). If
Inter is not installed locally, librsvg will fall back to the host
sans-serif. Anyone regenerating the PNG should have Inter available
system-wide. Once the marketing site exists, OG images should be
rendered with Satori, which bundles the font and produces deterministic
output regardless of the host.

## Decisions captured

These are the founder-level brand calls made in Phase 4. They are not
all reversible cheaply — change with intent.

- **Lowercase wordmark.** Reads as developer-tooling minimal (Linear,
  Vercel, Resend). Avoids the "corporate startup" SaaS feel.
- **One accent colour.** Indigo, no gradients. Keeps the palette
  legible and the UI work straightforward in Phase 5+.
- **No illustrated mark.** The S motif is the only glyph. Cheaper to
  apply consistently, easier to redraw at any size.
- **Domain on `.cloud`.** Lands as developer-platform-ish without being
  trendy.dev-trendy. Recorded here so future copy and OG images don't
  drift to `.com`/`.dev` aliases.
- **Tagline.** "Better rules. Smarter agents." — short, parallel,
  earns the indigo accent on the second clause without overexplaining.

## When this guide needs to change

- A new colour, font, or asset is introduced anywhere in
  `apps/*`/`packages/*`. Add it here first, then ship it.
- The wordmark, mark, or favicon master is edited. Re-render the PNG
  set in the same commit so `assets/` stays self-consistent.
- The domain, npm scope, or GitHub org changes. Update every row in
  the table at the top of this file in the same change as the rename.
