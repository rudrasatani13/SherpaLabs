# aimcp-lint GitHub Action

One-step CI integration for `@sherpa-labs/aimcp-lint`. Run against your MCP server on every push or PR.

## Action Repository

`https://github.com/sherpa-labs/aimcp-lint-action`

The action template lives in this repo at `templates/aimcp-lint-action/`.

## Usage

```yaml
- uses: sherpa-labs/aimcp-lint-action@v1
  with:
    server-command: 'node ./server.mjs'
```

## Inputs

| Input               | Required | Default    | Description                                                                                                             |
| ------------------- | -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| `server-command`    | yes      | —          | Command to start your MCP server                                                                                        |
| `min-score`         | no       | `80`       | Minimum score to pass (0–100)                                                                                           |
| `format`            | no       | `terminal` | Step summary and PR comment rendering: `terminal`, `json`, `markdown`. CLI execution always uses JSON quiet internally. |
| `config`            | no       | —          | Path to `.aimcp-lint.json`                                                                                              |
| `working-directory` | no       | `.`        | Working directory                                                                                                       |
| `post-comment`      | no       | `true`     | Post PR comment with results                                                                                            |
| `verbose`           | no       | `false`    | Enable verbose diagnostics                                                                                              |

## Outputs

| Output        | Description              |
| ------------- | ------------------------ |
| `score`       | Lint score achieved      |
| `max-score`   | Maximum score            |
| `passed`      | `"true"` or `"false"`    |
| `report-path` | Path to JSON result file |

## Behavior

1. Runs `npx @sherpa-labs/aimcp-lint --format json --quiet` against the provided `server-command`.
2. Parses the JSON output for `score`, `max_score`, and `passed`.
3. Writes rendered output to `$GITHUB_STEP_SUMMARY` using the `format` input.
4. When `passed` is `false`, sets the step as failed.
5. On `pull_request` events with `post-comment: true`, posts or updates a PR comment using the same rendering, even when the lint threshold fails.

## Step Summary Example

```
## aimcp-lint Results

| Metric | Value |
|--------|-------|
| Score | `95/100` |
| Threshold | `80` |
| Result | PASS |
| Server Command | `node ./server.mjs` |

<details><summary>JSON Report</summary>
...
</details>
```

## PR Comment Example

```markdown
## aimcp-lint Report

**Result:** PASS

| Metric    | Value    |
| --------- | -------- |
| Score     | `95/100` |
| Threshold | `80`     |
```

## Permissions

For PR comments, the workflow needs `pull-requests: write`:

```yaml
permissions:
  contents: read
  pull-requests: write
```

## Creating the Action Repository

To create the standalone `sherpa-labs/aimcp-lint-action` repository:

1. Copy `templates/aimcp-lint-action/action.yml` to the repo root as `action.yml`.
2. Copy `templates/aimcp-lint-action/README.md` to the repo root as `README.md`.
3. Add a `LICENSE` file with the MIT license.
4. Create a GitHub release with tag `v1` and check "Publish to Marketplace".
5. Follow the Marketplace listing metadata in `templates/aimcp-lint-action/MARKETPLACE.md`.

## Examples

### Full workflow

```yaml
name: MCP Lint

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read
  pull-requests: write

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - run: npm ci

      - uses: sherpa-labs/aimcp-lint-action@v1
        id: lint
        with:
          server-command: 'node ./server.mjs'
          min-score: '80'

      - if: steps.lint.outputs.passed == 'true'
        run: echo "MCP lint passed with score ${{ steps.lint.outputs.score }}"
```

### Using output in matrix strategy

```yaml
strategy:
  matrix:
    server: [server-a, server-b]

steps:
  - uses: sherpa-labs/aimcp-lint-action@v1
    id: lint
    with:
      server-command: 'node ./packages/${{ matrix.server }}/index.mjs'

  - run: echo "${{ matrix.server }} score: ${{ steps.lint.outputs.score }}"
```

### With custom config and no PR comments

```yaml
- uses: sherpa-labs/aimcp-lint-action@v1
  with:
    server-command: 'node ./server.mjs'
    config: '.aimcp-lint.ci.json'
    post-comment: 'false'
    min-score: '90'
```
