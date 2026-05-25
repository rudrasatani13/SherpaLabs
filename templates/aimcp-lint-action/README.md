# aimcp-lint GitHub Action

Run [`@sherpa-labs/aimcp-lint`](https://www.npmjs.com/package/@sherpa-labs/aimcp-lint) in your CI pipeline with a single step. Catches MCP server protocol, schema, security, and performance issues on every push.

## Quick Start

```yaml
name: MCP Lint

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - run: npm ci

      - uses: rudrasatani13/aimcp-lint-action@v1
        with:
          server-command: 'node ./server.mjs'
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `server-command` | yes | — | Command to start your MCP server (e.g., `'node ./server.mjs'`) |
| `min-score` | no | `80` | Minimum score required to pass (0–100) |
| `format` | no | `terminal` | Rendering format for the step summary and PR comment: `terminal`, `json`, or `markdown`. The CLI run always uses `--format json --quiet` internally so outputs stay machine-readable. |
| `config` | no | — | Path to `.aimcp-lint.json` config file |
| `working-directory` | no | `.` | Working directory for the lint run |
| `post-comment` | no | `true` | Post or update a PR comment with lint results |
| `verbose` | no | `false` | Enable verbose diagnostics |

## Outputs

| Output | Description |
|--------|-------------|
| `score` | Lint score achieved |
| `max-score` | Maximum possible score |
| `passed` | Whether the score met the threshold (`"true"` / `"false"`) |
| `report-path` | Path to the JSON lint result file |

## Step Summary

Each run writes rendered results to the GitHub Actions step summary. The `format` input controls the summary rendering:

- `terminal` shows the compact default table plus a collapsible JSON report.
- `markdown` shows a richer GitHub-flavored Markdown report with summary fields, category subscores, violations, and the JSON report.
- `json` shows the raw JSON report in a fenced block.

The lint command itself still runs with `--format json --quiet` so action outputs are parsed from a deterministic report file.

## PR Comments

When `post-comment` is `true` (default) and the workflow runs on a `pull_request` event, a comment is posted or updated with the lint results. The comment uses the same `format` rendering as the step summary and still posts when the lint threshold fails. Consecutive runs on the same PR update the existing comment.

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Lint passed — score meets or exceeds threshold |
| 1 | Lint failed — score below threshold |

## Permissions

For PR comments, the workflow needs:

```yaml
permissions:
  pull-requests: write
```

Or in the job:

```yaml
jobs:
  lint:
    permissions:
      pull-requests: write
    runs-on: ubuntu-latest
    steps:
      - uses: rudrasatani13/aimcp-lint-action@v1
        with:
          server-command: 'node ./server.mjs'
```

## Examples

### Minimal setup

```yaml
- uses: rudrasatani13/aimcp-lint-action@v1
  with:
    server-command: 'node ./dist/server.js'
```

### Custom threshold and Markdown rendering

```yaml
- uses: rudrasatani13/aimcp-lint-action@v1
  with:
    server-command: 'npx my-mcp-server'
    min-score: '90'
    format: 'markdown'
```

### With config file

```yaml
- uses: rudrasatani13/aimcp-lint-action@v1
  with:
    server-command: 'node ./server.mjs'
    config: '.aimcp-lint.json'
```

### Using outputs in downstream steps

```yaml
- uses: rudrasatani13/aimcp-lint-action@v1
  id: lint
  with:
    server-command: 'node ./server.mjs'

- run: echo "Score: ${{ steps.lint.outputs.score }}/${{ steps.lint.outputs.max-score }}"
```

### Disable PR comments

```yaml
- uses: rudrasatani13/aimcp-lint-action@v1
  with:
    server-command: 'node ./server.mjs'
    post-comment: 'false'
```

### Full workflow with all options

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

      - uses: rudrasatani13/aimcp-lint-action@v1
        id: lint
        with:
          server-command: 'node ./server.mjs'
          min-score: '80'
          format: 'terminal'
          verbose: 'false'
          post-comment: 'true'

      - name: Verify lint passed
        if: steps.lint.outputs.passed == 'true'
        run: echo "Lint passed with score ${{ steps.lint.outputs.score }}"
```

## Troubleshooting

### Server command not found

Ensure your MCP server dependencies are installed (`npm ci` or equivalent) in a step before this action. The server command must be resolvable from the working directory.

### PR comment not appearing

1. The workflow must run on a `pull_request` event.
2. The job needs `pull-requests: write` permission.
3. Set `post-comment: 'true'` (the default).

### Markdown rendering

Use `format: 'markdown'` for a richer GitHub-flavored summary and PR comment. The raw JSON report is still available via the `report-path` output, and the CLI execution remains JSON quiet internally for reliable parsing.
