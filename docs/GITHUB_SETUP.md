# GitHub setup checklist

Repository: **`sherpa-labs-io/SherpaLabs`** (public)

This document tracks the GitHub-side configuration that has to be applied
against the remote — work that does not happen as part of normal local
edits. Sections are marked **✅ Done** for steps that have been applied,
and **🔜 Planned** for steps that will be applied in a later phase.

All commands assume the [GitHub CLI](https://cli.github.com) is installed
and authenticated (`gh auth status`).

## 1. Repository creation — ✅ Done

The repo lives at https://github.com/sherpa-labs-io/SherpaLabs and is
public. It was originally created at `rudrasatani13/SherpaLabs` and
transferred into the `sherpa-labs-io` GitHub organisation on
2026-05-23. GitHub preserves auto-redirects from the old path, so any
remaining external links continue to resolve. (`sherpa-labs` itself was
already taken on GitHub by an inactive 2016 org with zero repos; the
`-io` suffix keeps brand continuity with the npm `@sherpa-labs/` scope.)

## 2. Initial history push — ✅ Done

`main` is pushed and up to date with `origin/main`.

## 3. `develop` branch — ✅ Done

Branched from `main` and pushed to `origin/develop`:

```sh
git branch develop main
git push -u origin develop
```

`main` remains the default branch on GitHub. `develop` is the integration
target for feature work (see [`CONTRIBUTING.md`](./CONTRIBUTING.md)). The
default branch will be re-evaluated when CI lands in Phase 6.

## 4. Branch protection on `main` — ✅ Done

Applied (and re-applied after Phase 6 to add the required `ci` status check) with:

```sh
gh api -X PUT repos/sherpa-labs-io/SherpaLabs/branches/main/protection \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["ci"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
JSON
```

> **History note.** Until the Phase 6 `ci` workflow had run at least once on
> `main`, GitHub would not accept `"contexts": ["ci"]` (it refuses to require a
> context it has never observed), so the original Phase 3 PUT used
> `"required_status_checks": null`. After PR #6 merged and the post-merge `ci`
> run on `main` succeeded (`sha=542743f`), the same PUT was re-applied with the
> block above. There is no separate "pending" state anymore.

### Verification — sanitised `gh api` output

`gh api repos/sherpa-labs-io/SherpaLabs/branches/main/protection`, with
`url` / `contexts_url` / `checks` fields stripped:

```json
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["ci"]
  },
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "require_last_push_approval": false,
    "required_approving_review_count": 1
  },
  "required_signatures": {
    "enabled": false
  },
  "enforce_admins": {
    "enabled": true
  },
  "required_linear_history": {
    "enabled": true
  },
  "allow_force_pushes": {
    "enabled": false
  },
  "allow_deletions": {
    "enabled": false
  },
  "block_creations": {
    "enabled": false
  },
  "required_conversation_resolution": {
    "enabled": true
  },
  "lock_branch": {
    "enabled": false
  },
  "allow_fork_syncing": {
    "enabled": false
  }
}
```

Mapping back to the Phase 3 + Phase 6 deliverable list:

| Requirement                         | Setting                                                  | State |
| ----------------------------------- | -------------------------------------------------------- | ----- |
| PR required                         | `required_pull_request_reviews` present                  | ✅    |
| ≥ 1 approving review                | `required_approving_review_count: 1`                     | ✅    |
| Dismiss stale reviews               | `dismiss_stale_reviews: true`                            | ✅    |
| Disallow force pushes               | `allow_force_pushes.enabled: false`                      | ✅    |
| Disallow deletions                  | `allow_deletions.enabled: false`                         | ✅    |
| Enforce on admins                   | `enforce_admins.enabled: true`                           | ✅    |
| Required CI status checks           | `required_status_checks.contexts: ["ci"]`, `strict: true`| ✅    |

> **Solo-owner note.** With `enforce_admins: true` and
> `required_approving_review_count: 1`, the repo owner cannot self-approve
> their own PRs into `main`. This is resolved by the auto-approve workflow
> at `.github/workflows/auto-approve.yml`, which uses a fine-grained PAT
> from the `Rudra1543` bot-identity account (an organisation member with
> write access) to approve PRs opened by `rudrasatani13`. See
> [section 10](#10-auto-approve-bot-reviewer----done).

## 5. Branch protection on `develop` — 🔜 Optional

Lighter rules than `main` — useful once there is a second collaborator. Apply
when ready:

```sh
gh api -X PUT repos/sherpa-labs-io/SherpaLabs/branches/develop/protection \
  --input - <<'JSON'
{
  "required_status_checks": null,
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
```

## 6. Repository settings to flip in the UI — 🔜 Recommended

`Settings → General`:

- **Pull Requests** → tick *Allow squash merging*, untick *Allow merge commits*
  and *Allow rebase merging*. Set squash commit message to *Pull request title
  and description* so the Conventional Commit lands on `main`/`develop`.
- **Pull Requests** → tick *Always suggest updating pull request branches* and
  *Automatically delete head branches*.
- **Features** → enable *Issues* and *Discussions*.

`Settings → Code security`:

- Enable *Dependabot alerts*, *Dependabot security updates*, and *Secret
  scanning*. Free on public repos.

## 7. Secrets — owner-managed (cannot be added via code)

Add via `Settings → Secrets and variables → Actions → New repository secret`.
These cannot be committed to the repo or set by an Action — only a repo
admin can configure them through the GitHub UI (or `gh secret set`).

| Secret                  | Used by                                          | Required for                              | Phase introduced | State          |
| ----------------------- | ------------------------------------------------ | ----------------------------------------- | ---------------- | -------------- |
| `NPM_TOKEN`             | `.github/workflows/release.yml` (Changesets)     | Publishing public packages to npm         | 6                | ✅ Set         |
| `CLOUDFLARE_API_TOKEN`  | Wrangler deploys for `apps/api` (later phase)    | Cloudflare Workers deployment             | reserved         | 🔜 Not yet set |
| `VERCEL_TOKEN`          | Vercel deploys for `apps/web` (later phase)      | Dashboard deployment                      | reserved         | 🔜 Not yet set |

`NPM_TOKEN` is present in the repo's Actions secrets (verified via
`gh secret list`; values cannot be read back). `CLOUDFLARE_API_TOKEN` and
`VERCEL_TOKEN` are reserved names — add them when the corresponding deploy
workflows land. Phase 6 only requires `NPM_TOKEN`.

### Generating `NPM_TOKEN`

1. Log in to <https://www.npmjs.com> as the publisher account (eventually the
   `@sherpa-labs` org owner).
2. Profile menu → **Access Tokens** → **Generate New Token** → **Granular**.
3. Scope it to **read and publish** for the `@sherpa-labs` scope only.
4. Set an expiry (1 year is reasonable; rotate before it expires).
5. Copy the token immediately — npm only shows it once.
6. In GitHub: `Settings → Secrets and variables → Actions → New repository secret`,
   name = `NPM_TOKEN`, value = the token. Or:
   ```sh
   gh secret set NPM_TOKEN --repo sherpa-labs-io/SherpaLabs
   ```

### Verifying the secret is set (without revealing the value)

```sh
gh secret list --repo sherpa-labs-io/SherpaLabs
```

You should see `NPM_TOKEN` with an `Updated` timestamp. Values cannot be
read back via the API.

## 8. CI / Release workflows — ✅ Done

Added in Phase 6:

- `.github/workflows/ci.yml` — runs on every PR to `main`/`develop` and on
  pushes to those branches. Pipeline: `pnpm install --frozen-lockfile` →
  `pnpm lint` → `pnpm format:check` → `pnpm typecheck` → `pnpm test` →
  `pnpm build`. Uses Corepack to pin pnpm to the version in `packageManager`
  and caches the pnpm store via `actions/setup-node@v4` plus the TypeScript
  project-references incremental build state.
- `.github/workflows/release.yml` — runs on push to `main`. Opens / updates a
  "Version Packages" PR while changesets are pending; when that PR is merged,
  publishes the bumped packages to npm via `pnpm release`. Apps
  (`@sherpa-labs/api`, `@sherpa-labs/web`) are excluded by
  `.changeset/config.json`.

The CI job name is `ci` — required as a status check on `main` (see
[section 4](#4-branch-protection-on-main----done)).

### Release readiness

`.github/workflows/release.yml` is wired to `changesets/action@v1` and consumes
the `NPM_TOKEN` Actions secret (set in §7). The workflow itself was exercised
on the first push to `main` post-merge and ran without errors — it found no
pending changesets, so nothing was published. **End-to-end npm publishing will
only be proven on the first real changeset release.** When that happens, the
public packages under `packages/*` will appear on npm under the `@sherpa-labs`
scope; `apps/api` and `apps/web` remain ignored by Changesets.

## 9. Re-verification commands

Re-run any time you want to confirm the state is unchanged:

```sh
gh repo view sherpa-labs-io/SherpaLabs --json defaultBranchRef,visibility
gh api repos/sherpa-labs-io/SherpaLabs/branches | jq '.[] | {name, protected}'
gh api repos/sherpa-labs-io/SherpaLabs/branches/main/protection \
  | jq 'del(.. | .url?)'
gh secret list --repo sherpa-labs-io/SherpaLabs
gh workflow list --repo sherpa-labs-io/SherpaLabs
```

## 10. Auto-approve bot reviewer — ✅ Done

Branch protection on `main` requires one approving review with
`enforce_admins: true`, which means the repo owner cannot self-approve
their own PRs. To satisfy this without a second human reviewer, the
`Rudra1543` GitHub account is enrolled as a bot identity:

- `Rudra1543` is a **member** of the `sherpa-labs-io` organisation
  (members can issue fine-grained PATs scoped to org repos; outside
  collaborators cannot).
- `Rudra1543` also has direct **write** access to this repo.
- A fine-grained PAT issued by `Rudra1543`, scoped to
  `sherpa-labs-io/SherpaLabs` only with `Pull requests: Read and write`,
  is stored as the repo secret `BOT_PAT`.
- `.github/workflows/auto-approve.yml` runs on every non-draft PR
  opened by `rudrasatani13` and uses `BOT_PAT` to leave an approving
  review via [`hmarr/auto-approve-action`](https://github.com/hmarr/auto-approve-action).

To rotate the PAT (recommended yearly):

1. Generate a new fine-grained PAT on the `Rudra1543` account with the
   same scope as above.
2. `gh secret set BOT_PAT --repo sherpa-labs-io/SherpaLabs` and paste
   the new value.
3. Revoke the old PAT in Rudra1543's settings.

To revoke the bot entirely (e.g. if `BOT_PAT` is compromised):

1. Delete the secret: `gh secret delete BOT_PAT --repo sherpa-labs-io/SherpaLabs`.
2. Revoke the PAT in Rudra1543's GitHub settings.
3. Remove or disable `.github/workflows/auto-approve.yml`. Until a
   replacement reviewer is in place, fall back to having Rudra1543
   approve manually via `gh pr review --approve` from that account.
