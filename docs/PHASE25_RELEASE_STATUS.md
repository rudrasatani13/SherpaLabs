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
- Final version: `0.0.2`

```sh
npm view @sherpa-labs/aimcp-lint version dist-tags.latest dependencies repository --json
```

Current result:

```json
{
  "version": "0.0.2",
  "dist-tags.latest": "0.0.2",
  "dependencies": {
    "commander": "^13.1.0",
    "picocolors": "^1.1.1"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/rudrasatani13/SherpaLabs.git",
    "directory": "packages/cli-aimcp"
  }
}
```

The release PR `#33` was merged, and the `release` workflow for merge commit
`9eb2ea429a71fe5420e8343f767f4fb6dbe622b8` completed successfully:
<https://github.com/rudrasatani13/SherpaLabs/actions/runs/26395851822>

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

Published under the personal GitHub account, not an organization.

Action repo URL: <https://github.com/rudrasatani13/aimcp-lint-action>

Release URL: <https://github.com/rudrasatani13/aimcp-lint-action/releases/tag/v1.0.0>

Tags:

- `v1`
- `v1.0.0`

Verification commands:

```sh
gh repo view rudrasatani13/aimcp-lint-action
gh release view v1.0.0 --repo rudrasatani13/aimcp-lint-action
```

Current release result:

```json
{
  "isDraft": false,
  "isPrerelease": false,
  "publishedAt": "2026-05-25T10:31:56Z",
  "tagName": "v1.0.0",
  "targetCommitish": "main",
  "url": "https://github.com/rudrasatani13/aimcp-lint-action/releases/tag/v1.0.0"
}
```

## Sample Action Run Status

Passed.

Sample action run URL:
<https://github.com/rudrasatani13/aimcp-lint-action-smoke/actions/runs/26395595917>

The sample repository uses `rudrasatani13/aimcp-lint-action@v1` and runs a
healthy MCP stdio server fixture.

Verification command:

```sh
gh run view 26395595917 \
  --repo rudrasatani13/aimcp-lint-action-smoke \
  --json status,conclusion,url,jobs
```

Current result:

```json
{
  "status": "completed",
  "conclusion": "success",
  "url": "https://github.com/rudrasatani13/aimcp-lint-action-smoke/actions/runs/26395595917",
  "job": "smoke",
  "jobConclusion": "success"
}
```

## Marketplace Status

Blocked by GitHub's release UI publishing step.

Expected Marketplace listing URL:
<https://github.com/marketplace/actions/aimcp-lint>

Current result:

```sh
curl -L -s -o /tmp/aimcp-marketplace.html -w '%{http_code} %{url_effective}\n' \
  https://github.com/marketplace/actions/aimcp-lint
```

```text
404 https://github.com/marketplace/actions/aimcp-lint
```

GitHub documents Marketplace publishing as a release-page UI flow: under
"Release Action", select "Publish this Action to the GitHub Marketplace". The
release and tags exist, but no public API or GitHub CLI flag is available for
this checkbox in the authenticated tooling used for Phase 25.

Reference:
<https://docs.github.com/en/actions/how-tos/create-and-publish-actions/publish-in-github-marketplace>

Manual completion command:

```sh
open "https://github.com/rudrasatani13/aimcp-lint-action/releases/tag/v1.0.0"
```

Then edit the release, check "Publish this Action to the GitHub Marketplace",
choose the category from `templates/aimcp-lint-action/MARKETPLACE.md`, and save.
If GitHub disables the checkbox, accept the GitHub Marketplace Developer
Agreement from the link shown on that release page, then retry the same edit.

## Remaining Blockers

- Marketplace listing is not published yet because the final GitHub release UI
  checkbox must be completed manually. Everything else required for Phase 25 has
  been completed under `rudrasatani13`.

## Latest Verification

Local verification was rerun on 2026-05-25:

```sh
pnpm validate:phase25
pnpm --filter @sherpa-labs/aimcp-lint test
```

Results:

- `pnpm validate:phase25`: passed.
- `pnpm --filter @sherpa-labs/aimcp-lint test`: passed (`123` tests passed).
