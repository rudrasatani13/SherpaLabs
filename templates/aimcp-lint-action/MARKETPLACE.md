# aimcp-lint — Marketplace Listing Metadata

## Listing Name

**aimcp-lint** — Lint your MCP server with one step.

## Short Description (≤ 200 chars)

Lint MCP servers for protocol, schema, security, and performance issues. Generate reports, enforce score thresholds, and get PR comments — all in one step.

## Categories

- Code Quality
- Continuous Integration
- Code Review

## Branding

- **Icon:** check-circle
- **Color:** blue

## Required Permissions

| Permission             | Reason                                         |
| ---------------------- | ---------------------------------------------- |
| `contents: read`       | Check out code (handled by `actions/checkout`) |
| `pull-requests: write` | Post PR comments with lint results             |

## Inputs

| Name                | Description                                | Required | Default    |
| ------------------- | ------------------------------------------ | -------- | ---------- |
| `server-command`    | MCP server start command                   | yes      | —          |
| `min-score`         | Minimum score threshold (0–100)            | no       | `80`       |
| `format`            | Output format: terminal, json, or markdown | no       | `terminal` |
| `config`            | Path to `.aimcp-lint.json`                 | no       | —          |
| `working-directory` | Working directory for lint run             | no       | `.`        |
| `post-comment`      | Post PR comment with results               | no       | `true`     |
| `verbose`           | Enable verbose diagnostics                 | no       | `false`    |

## Outputs

| Name          | Description                                      |
| ------------- | ------------------------------------------------ |
| `score`       | Lint score achieved                              |
| `max-score`   | Maximum possible score                           |
| `passed`      | Whether the threshold was met (`true` / `false`) |
| `report-path` | Path to JSON result file                         |

## Author

Sherpa Labs ([@sherpa-labs-io](https://github.com/sherpa-labs-io))

## Repository

`https://github.com/sherpa-labs/aimcp-lint-action`

## Steps to Publish on GitHub Marketplace

1. Create the repository `sherpa-labs/aimcp-lint-action` on GitHub.
2. Push the following files to the repo root:
   - `action.yml`
   - `README.md`
3. Go to `https://github.com/sherpa-labs/aimcp-lint-action/releases/new`
4. Tag the release as `v1` (or `v1.0.0` with `v1` as an additional tag).
5. Check "Publish this Action to the GitHub Marketplace".
6. Fill in the metadata from above.
7. Publish the release.

After publishing, the action is available as:

```yaml
- uses: sherpa-labs/aimcp-lint-action@v1
```
