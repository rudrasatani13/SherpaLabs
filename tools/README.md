# tools

Monorepo-wide automation that isn't a shippable package. Each
subdirectory is a workspace package (`tools/*` is wired into
`pnpm-workspace.yaml`) so it can declare its own dependencies and be
invoked with `pnpm --filter <name> <script>`.

| Package | Purpose | Entry |
| ------- | ------- | ----- |
| [`asset-build`](./asset-build) | Rasterises the brand SVG masters in `packages/shared-config/assets/` into the favicon set and default OG PNG. | `pnpm -F @sherpa-labs/asset-build build` |

To regenerate brand assets from anywhere in the repo:

```sh
pnpm assets   # alias for the line above, defined at the repo root
```
