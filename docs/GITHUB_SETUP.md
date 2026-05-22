# GitHub setup checklist

Repository: **`rudrasatani13/SherpaLabs`** (public)

This document tracks the GitHub-side configuration that has to be applied
against the remote — work that does not happen as part of normal local
edits. Sections are marked **✅ Done** for steps that have been applied,
and **🔜 Planned** for steps that will be applied in a later phase.

All commands assume the [GitHub CLI](https://cli.github.com) is installed
and authenticated (`gh auth status`).

## 1. Repository creation — ✅ Done

The repo already exists at https://github.com/rudrasatani13/SherpaLabs and is
public. (The Phase 4 brand work may later move this under a `sherpa-labs/`
organisation; if so, redirect the remote and re-apply branch protection at the
new path.)

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

Applied with:

```sh
gh api -X PUT repos/rudrasatani13/SherpaLabs/branches/main/protection \
  --input - <<'JSON'
{
  "required_status_checks": null,
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

> **Note on required status checks.** `required_status_checks` is intentionally
> `null` for now. CI does not exist yet — it is introduced in Phase 6. When the
> `ci` workflow lands, re-apply the same PUT with the block below to require it
> on every PR into `main`:
>
> ```json
> "required_status_checks": {
>   "strict": true,
>   "contexts": ["ci"]
> }
> ```

### Verification — sanitised `gh api` output

`gh api repos/rudrasatani13/SherpaLabs/branches/main/protection`, with
`url` fields stripped:

```json
{
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

Mapping back to the Phase 3 deliverable list:

| Requirement                         | Setting                                        | State |
| ----------------------------------- | ---------------------------------------------- | ----- |
| PR required                         | `required_pull_request_reviews` present        | ✅    |
| ≥ 1 approving review                | `required_approving_review_count: 1`           | ✅    |
| Dismiss stale reviews               | `dismiss_stale_reviews: true`                  | ✅    |
| Disallow force pushes               | `allow_force_pushes.enabled: false`            | ✅    |
| Disallow deletions                  | `allow_deletions.enabled: false`               | ✅    |
| Enforce on admins                   | `enforce_admins.enabled: true`                 | ✅    |
| Required CI status checks           | `required_status_checks: null`                 | 🔜 Phase 6 |

> **Solo-owner caveat.** With `enforce_admins: true` and
> `required_approving_review_count: 1`, the repo owner cannot merge their own
> PRs into `main` without a second reviewer. Until there is a second
> collaborator, the practical way to release is either to (a) temporarily
> disable `enforce_admins` for the release merge, or (b) get a one-off review
> from another GitHub account. This matches the Phase 3 spec, which calls for
> these rules explicitly.

## 5. Branch protection on `develop` — 🔜 Optional

Lighter rules than `main` — useful once there is a second collaborator. Apply
when ready:

```sh
gh api -X PUT repos/rudrasatani13/SherpaLabs/branches/develop/protection \
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

## 7. Secrets — 🔜 Added in later phases

Add via `Settings → Secrets and variables → Actions`:

| Secret                  | Used by                          | Phase |
| ----------------------- | -------------------------------- | ----- |
| `NPM_TOKEN`             | Changesets release workflow      | 6     |
| `CLOUDFLARE_API_TOKEN`  | Wrangler deploys for `apps/api`  | later |
| `VERCEL_TOKEN`          | Vercel deploys for `apps/web`    | later |

## 8. Re-verification commands

Re-run any time you want to confirm the state is unchanged:

```sh
gh repo view rudrasatani13/SherpaLabs --json defaultBranchRef,visibility
gh api repos/rudrasatani13/SherpaLabs/branches | jq '.[] | {name, protected}'
gh api repos/rudrasatani13/SherpaLabs/branches/main/protection \
  | jq 'del(.. | .url?)'
```
