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

      - uses: sherpa-labs/aimcp-lint-action@v1
        with:
          server-command: 'node ./server.mjs'
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `server-command` | yes | — | Command to start your MCP server (e.g., `'node ./server.mjs'`) |
| `min-score` | no | `80` | Minimum score required to pass (0–100) |
| `format` | no | `terminal` | Output format: `terminal`, `json`, or `markdown` |
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

Each run writes a summary table to the GitHub Actions step summary, including:

- Score and threshold
- Pass/fail status
- Server command
- Full JSON report in a collapsible section

## PR Comments

When `post-comment` is `true` (default) and the workflow runs on a `pull_request` event, a comment is posted or updated with the lint results. Consecutive runs on the same PR update the existing comment.

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
      - uses: sherpa-labs/aimcp-lint-action@v1
        with:
          server-command: 'node ./server.mjs'
```

## Examples

### Minimal setup

```yaml
- uses: sherpa-labs/aimcp-lint-action@v1
  with:
    server-command: 'node ./dist/server.js'
```

### Custom threshold and Markdown output

```yaml
- uses: sherpa-labs/aimcp-lint-action@v1
  with:
    server-command: 'npx my-mcp-server'
    min-score: '90'
    format: 'markdown'
```

### With config file

```yaml
- uses: sherpa-labs/aimcp-lint-action@v1
  with:
    server-command: 'node ./server.mjs'
    config: '.aimcp-lint.json'
```

### Using outputs in downstream steps

```yaml
- uses: sherpa-labs/aimcp-lint-action@v1
  id: lint
  with:
    server-command: 'node ./server.mjs'

- run: echo "Score: ${{ steps.lint.outputs.score }}/${{ steps.lint.outputs.max-score }}"
```

### Disable PR comments

```yaml
- uses: sherpa-labs/aimcp-lint-action@v1
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

      - uses: sherpa-labs/aimcp-lint-action@v1
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

### Markdown output

The step summary always shows the JSON report. For Markdown-specific output in PR comments, use `format: 'markdown'` — the raw JSON is still available via the `report-path` output.
