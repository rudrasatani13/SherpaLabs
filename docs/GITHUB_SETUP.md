# GitHub setup checklist

These steps require pushing to GitHub or talking to the GitHub API. They were left
out of Phase 3's automated work — run them when you are ready to take the repo
public.

Everything below assumes the [GitHub CLI](https://cli.github.com) is installed and
authenticated (`gh auth login`).

## 1. Create the GitHub organisation (one-time, if not done in Phase 4)

Sherpa Labs lives under its own org so the public packages can sit under a clean
namespace. Create it in the GitHub UI (orgs cannot be created from `gh`):

- Org name: `sherpa-labs`
- Plan: Free (sufficient until private repos and seats are needed)
- Reserve the matching npm scope at the same time: `@sherpa-labs`

## 2. Create the public repository

```sh
cd /Users/rudrasatani/Desktop/SherpaLabs

gh repo create sherpa-labs/sherpa-labs \
  --public \
  --source=. \
  --description "Sherpa Labs — better rules, smarter agents." \
  --homepage "https://sherpalabs.dev" \
  --remote=origin \
  --push=false
```

`--push=false` keeps the local commits local; push manually once you are
satisfied with the working tree.

## 3. Push the initial history

```sh
git push -u origin main
```

## 4. Create and push the `develop` branch

`develop` is the default integration branch for feature work.

```sh
git switch -c develop
git push -u origin develop
```

Set `develop` as the default branch in the GitHub UI:

`Settings → General → Default branch → Switch → develop`

Or via CLI:

```sh
gh repo edit sherpa-labs/sherpa-labs --default-branch develop
```

`main` stays as the protected release branch — see step 5.

## 5. Branch protection rules

CI is not wired up yet (that lands in Phase 6), so for now require a PR + review.
Add the required status checks once the CI workflow exists.

### Protect `main`

```sh
gh api -X PUT repos/sherpa-labs/sherpa-labs/branches/main/protection \
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

After Phase 6 lands the CI workflow, update `required_status_checks` to require
the `ci` job:

```json
"required_status_checks": {
  "strict": true,
  "contexts": ["ci"]
}
```

### Protect `develop` (lighter)

```sh
gh api -X PUT repos/sherpa-labs/sherpa-labs/branches/develop/protection \
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

## 6. Repository settings to flip in the UI

`Settings → General`:

- **Pull Requests** → tick *Allow squash merging*, untick *Allow merge commits*
  and *Allow rebase merging*. The squash commit message default should be
  *Pull request title and description* so the Conventional Commit lives on
  `main`/`develop`.
- **Pull Requests** → tick *Always suggest updating pull request branches* and
  *Automatically delete head branches*.
- **Features** → enable *Issues* and *Discussions* (Discussions is useful for
  future community questions).

`Settings → Code security`:

- Enable *Dependabot alerts*, *Dependabot security updates*, and *Secret
  scanning*. Free on public repos.

## 7. Secrets (added when needed in later phases)

Phase 6 (CI/CD) introduces these. Add them via
`Settings → Secrets and variables → Actions`:

| Secret                  | Used by                          | Phase |
| ----------------------- | -------------------------------- | ----- |
| `NPM_TOKEN`             | Changesets release workflow       | 6     |
| `CLOUDFLARE_API_TOKEN`  | Wrangler deploys for `apps/api`   | later |
| `VERCEL_TOKEN`          | Vercel deploys for `apps/web`     | later |

## 8. Verify

```sh
gh repo view sherpa-labs/sherpa-labs --web
gh api repos/sherpa-labs/sherpa-labs/branches/main/protection | jq '.required_pull_request_reviews'
```

You should see the repo render with the README and the PR template, and the
protection payload should reflect the rules above.
