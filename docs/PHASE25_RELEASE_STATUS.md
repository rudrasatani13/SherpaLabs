# Phase 25 Release Status

Checked on 2026-05-25 (Asia/Kolkata).

## Local Verification Added

Phase 25 now has two local verification commands:

```sh
pnpm test:pack:aimcp-lint
pnpm validate:action-template
```

Run both together with:

```sh
pnpm validate:phase25
```

`pnpm test:pack:aimcp-lint` builds the CLI and its workspace dependencies, packs
`@sherpa-labs/aimcp-lint`, extracts the tarball in a temp directory, runs the
packed `aimcp-lint --help` and `aimcp-lint --version` binary, and verifies the
tarball contains only `package.json`, `LICENSE`, and `dist/` output.

`pnpm validate:action-template` parses
`templates/aimcp-lint-action/action.yml` and validates required inputs, outputs,
step summary rendering, PR comment rendering, and the internal JSON quiet CLI
execution contract.

## npm Publish Status

Published:

- Package URL: <https://www.npmjs.com/package/@sherpa-labs/aimcp-lint>
- Final version: `0.0.1`

```sh
npm view @sherpa-labs/aimcp-lint version dist-tags.latest time.modified --json
```

Current result:

```json
{
  "version": "0.0.1",
  "dist-tags.latest": "0.0.1",
  "time.modified": "2026-05-24T20:07:12.688Z"
}
```

The release PR `#32` was merged, and the `release` workflow for commit
`38ed514804c201f037a46416df1b96a8cdebebe2` completed successfully.

Future npm releases should continue through Changesets:

```sh
pnpm changeset
git add .changeset
git commit -m "chore(release): add changeset"
git push origin main
gh pr list --head changeset-release/main
gh pr merge <release-pr-number> --merge --delete-branch
gh run list --workflow release --limit 1
gh run watch <run-id> --exit-status
npm view @sherpa-labs/aimcp-lint version dist-tags.latest --json
```

## GitHub Action Repository Status

Blocked by GitHub organization permissions.

Action repo URL: blocked, <https://github.com/sherpa-labs/aimcp-lint-action>
does not exist yet.

Checked commands:

```sh
gh repo view sherpa-labs/aimcp-lint-action
gh repo view sherpa-labs-io/aimcp-lint-action
gh api orgs/sherpa-labs/repos \
  --method POST \
  -f name=aimcp-lint-action \
  -f private=false \
  -f description="Run @sherpa-labs/aimcp-lint in GitHub Actions"
```

Both repository lookups returned "repository not found" for the current
authenticated account. The explicit external-publish approval was given on
2026-05-25, but creating `sherpa-labs/aimcp-lint-action` failed with:

```text
You need admin access to the organization before adding a repository to it. (HTTP 403)
```

The active GitHub account is `rudrasatani13`, which has access to
`sherpa-labs-io` but not repository-create admin access in `sherpa-labs`.

Manual commands after an admin grants repo-create access in `sherpa-labs`, or
after switching to a token/account with that access:

```sh
SHERPA_LABS=/Users/rudrasatani/Desktop/SherpaLabs
tmpdir=$(mktemp -d)
gh repo create sherpa-labs/aimcp-lint-action \
  --public \
  --description "Run @sherpa-labs/aimcp-lint in GitHub Actions" \
  --clone=false
git clone git@github.com:sherpa-labs/aimcp-lint-action.git "$tmpdir/aimcp-lint-action"
cp "$SHERPA_LABS/templates/aimcp-lint-action/action.yml" "$tmpdir/aimcp-lint-action/action.yml"
cp "$SHERPA_LABS/templates/aimcp-lint-action/README.md" "$tmpdir/aimcp-lint-action/README.md"
cp "$SHERPA_LABS/templates/aimcp-lint-action/MARKETPLACE.md" "$tmpdir/aimcp-lint-action/MARKETPLACE.md"
cp "$SHERPA_LABS/LICENSE" "$tmpdir/aimcp-lint-action/LICENSE"
cd "$tmpdir/aimcp-lint-action"
git add action.yml README.md MARKETPLACE.md LICENSE
git commit -m "feat: publish aimcp-lint action"
git tag v1.0.0
git tag v1
git push origin main --tags
```

## Sample Action Run Status

Blocked until the standalone repository and `v1` tag exist.

Sample action run URL: blocked, not available yet.

Manual smoke-test commands after the action repository is published:

```sh
SHERPA_LABS=/Users/rudrasatani/Desktop/SherpaLabs
tmpdir=$(mktemp -d)
cd "$tmpdir"
gh repo create sherpa-labs/aimcp-lint-action-smoke \
  --public \
  --description "Smoke test for sherpa-labs/aimcp-lint-action" \
  --clone
cd aimcp-lint-action-smoke
mkdir -p .github/workflows
cp "$SHERPA_LABS/packages/cli-aimcp/test/fixtures/stdio-servers/healthy.mjs" server.mjs
cat > package.json <<'JSON'
{
  "type": "module",
  "scripts": {
    "test:mcp": "node server.mjs"
  }
}
JSON
cat > .github/workflows/aimcp-lint.yml <<'YAML'
name: aimcp-lint smoke

on:
  workflow_dispatch:

permissions:
  contents: read
  pull-requests: write

jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - uses: sherpa-labs/aimcp-lint-action@v1
        with:
          server-command: "node ./server.mjs"
          min-score: "80"
          format: "markdown"
          post-comment: "false"
YAML
git add package.json server.mjs .github/workflows/aimcp-lint.yml
git commit -m "test: add aimcp-lint action smoke workflow"
git push origin main
gh workflow run aimcp-lint.yml --ref main
gh run list --workflow aimcp-lint.yml --limit 1
gh run watch <run-id> --exit-status
```

## Marketplace Status

Blocked until `sherpa-labs/aimcp-lint-action` exists and has a public release
containing `action.yml`.

Marketplace listing URL: blocked, not available yet.

Marketplace publishing requires a public standalone action repository and a
release created from a tag that contains `action.yml`. After the repository is
created and tagged, publish through the GitHub release UI:

```sh
gh release create v1.0.0 \
  --repo sherpa-labs/aimcp-lint-action \
  --title "aimcp-lint Action v1.0.0" \
  --notes "Initial Marketplace release for aimcp-lint."
open "https://github.com/sherpa-labs/aimcp-lint-action/releases/tag/v1.0.0"
```

In the release page, check "Publish this Action to the GitHub Marketplace",
copy the metadata from `templates/aimcp-lint-action/MARKETPLACE.md`, and publish
the release.

## Remaining Blockers

- GitHub org admin access is required before creating
  `sherpa-labs/aimcp-lint-action`.
- The sample action workflow cannot be run against `sherpa-labs/aimcp-lint-action@v1`
  until the standalone repository and `v1` tag exist.
- Marketplace publishing cannot be completed until the standalone repository has
  a public release with `action.yml`.

## Latest Verification

After the external create attempt was blocked, local verification was rerun on
2026-05-25:

```sh
pnpm validate:phase25
pnpm --filter @sherpa-labs/aimcp-lint test
```

Results:

- `pnpm validate:phase25`: passed.
- `pnpm --filter @sherpa-labs/aimcp-lint test`: passed on isolated rerun
  (`122` tests passed).
