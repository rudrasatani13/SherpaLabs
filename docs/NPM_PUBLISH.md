# Publishing `@sherpa-labs/aimcp-lint` to npm

## Prerequisites

- npm account with access to the `@sherpa-labs` organization
- npm CLI authenticated (`npm login`)
- GitHub Personal Access Token with `repo` scope in `GITHUB_TOKEN` env var (for Changesets changelog fetching)

## Package Metadata

All publish metadata lives in `packages/cli-aimcp/package.json`:

- **name:** `@sherpa-labs/aimcp-lint`
- **bin:** `aimcp-lint`
- **description:** Lint your MCP server for protocol compliance, schema violations, security issues, and performance best practices.
- **keywords:** mcp, model-context-protocol, lint, linter, cli, mcp-server, sherpa-labs
- **license:** MIT
- **author:** Sherpa Labs `<hello@sherpalabs.dev>`
- **files:** `dist/` and `LICENSE` only (no source, tests, or fixtures)
- **engines:** `node >= 22.0.0`
- **prepublishOnly:** `pnpm build && pnpm test`

## Release Process

### 1. Create a changeset (one-time for the release)

```bash
cd packages/cli-aimcp
npx changeset
```

Pick the package, select the bump type, and write a summary.

### 2. Version the packages

```bash
pnpm version-packages
```

This bumps versions according to the changeset, updates `CHANGELOG.md`, and commits.

### 3. Build and verify

```bash
pnpm --filter @sherpa-labs/aimcp-lint build
pnpm --filter @sherpa-labs/aimcp-lint test
```

### 4. Pack and verify tarball

```bash
pnpm --filter @sherpa-labs/aimcp-lint pack --dry-run
```

Verify the tarball contains only:

- `dist/` (built JS + type declarations)
- `LICENSE`
- `package.json`

```bash
pnpm --filter @sherpa-labs/aimcp-lint pack
tar -tzf sherpa-labs-aimcp-lint-*.tgz
```

### 5. Smoke test the packed package

```bash
mkdir /tmp/aimcp-smoke-test
tar -xzf sherpa-labs-aimcp-lint-*.tgz -C /tmp/aimcp-smoke-test
node /tmp/aimcp-smoke-test/package/dist/index.js --version
```

### 6. Publish

```bash
pnpm release
```

Or manually:

```bash
cd packages/cli-aimcp
npm publish --access public
```

## Verification Commands

```bash
# Verify metadata
node -e "const p = require('./packages/cli-aimcp/package.json'); console.log(p.name, p.version, p.description)"

# Verify files array
node -e "const p = require('./packages/cli-aimcp/package.json'); console.log(p.files)"

# Verify engines
node -e "const p = require('./packages/cli-aimcp/package.json'); console.log(p.engines)"

# Verify prepublishOnly
node -e "const p = require('./packages/cli-aimcp/package.json'); console.log(p.scripts.prepublishOnly)"

# Verify bin
node -e "const p = require('./packages/cli-aimcp/package.json'); console.log(p.bin)"
```

## npm Provenance

To enable npm provenance (package signing):

```bash
npm publish --access public --provenance
```

This requires the publish to happen from a GitHub Actions workflow with `id-token: write` permission.

## Manual Publish (if Changesets not used)

```bash
cd packages/cli-aimcp
npm version patch  # or minor / major
pnpm build
pnpm test
npm publish --access public
git push --follow-tags
```
