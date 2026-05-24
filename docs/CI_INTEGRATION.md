# aimcp-lint CI Integration

Run `aimcp-lint` in your CI/CD pipeline to catch MCP server protocol, schema, security, and performance issues on every push.

## Quick Start

```bash
npx @sherpa-labs/aimcp-lint --format=json --quiet --fail-under 80 -- node ./server.mjs
```

This produces a minimal JSON object on stdout and exits with the appropriate code your CI tool can use.

## Exit Codes

| Code | Name                | Meaning                                                     |
| ---- | ------------------- | ----------------------------------------------------------- |
| 0    | `EXIT_SUCCESS`      | Lint completed. Score meets or exceeds threshold.           |
| 1    | `EXIT_LINT_FAILED`  | Lint completed but score is below `--fail-under` threshold. |
| 2    | `EXIT_CONFIG_ERROR` | Configuration, usage, or validation error.                  |
| 3    | `EXIT_SERVER_ERROR` | MCP server connection, spawn, or runtime failure.           |

## CI-Safe Output: `--format=json --quiet`

When using `--format=json --quiet`, stdout contains exactly:

```json
{
  "score": 85,
  "max_score": 100,
  "passed": false
}
```

- **No ANSI color codes** on stdout
- **No spinner output** on stdout
- **parseable** by `JSON.parse`, `jq`, and any JSON tool
- Add `--verbose` to send diagnostics to stderr while keeping stdout clean

## GitHub Actions

### Recommended: One-step Action

The [`aimcp-lint-action`](https://github.com/sherpa-labs/aimcp-lint-action) composite action handles everything — installing, running, step summaries, and PR comments — in one step.

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
        with:
          server-command: 'node ./server.mjs'
```

See [GITHUB_ACTION.md](./GITHUB_ACTION.md) for full action documentation, all inputs, outputs, and examples.

### Manual npx (no action)

If you prefer running directly without the action:

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

      - name: Setup MCP server dependencies
        run: npm ci

      - name: Run aimcp-lint
        id: lint
        run: |
          npx @sherpa-labs/aimcp-lint --format=json --quiet --fail-under 80 -- node ./server.mjs > lint-result.json
          echo "score=$(jq -r .score lint-result.json)" >> "$GITHUB_OUTPUT"
          echo "max_score=$(jq -r .max_score lint-result.json)" >> "$GITHUB_OUTPUT"
          echo "passed=$(jq -r .passed lint-result.json)" >> "$GITHUB_OUTPUT"
        continue-on-error: true

      - name: Upload lint artifact
        if: steps.lint.outcome != 'skipped'
        uses: actions/upload-artifact@v4
        with:
          name: mcp-lint-report
          path: lint-result.json

      - name: Add PR comment
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('node:fs');
            const report = JSON.parse(fs.readFileSync('lint-result.json', 'utf8'));
            const emoji = report.passed ? '✅' : '❌';
            const outcome = report.passed ? 'skipped' : 'failure';
            const body = `## ${emoji} aimcp-lint Report\n\n**Score:** \`${report.score}/${report.max_score}\`\n**Result:** ${report.passed ? 'PASS' : 'FAIL'}`;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body,
            });
```

### GitHub Actions with config file

```yaml
- name: Run aimcp-lint (config file)
  run: npx @sherpa-labs/aimcp-lint --format=json --quiet --config .aimcp-lint.json
```

### GitHub Actions with explicit server command and options

```yaml
- name: Run aimcp-lint (explicit server)
  run: |
    npx @sherpa-labs/aimcp-lint \
      --format json --quiet \
      --fail-under 80 \
      --ignore X004 \
      -- node dist/server.js --port 3000
```

## GitLab CI

```yaml
mcp-lint:
  image: node:22
  stage: test
  script:
    - npm ci
    - npx @sherpa-labs/aimcp-lint --format=json --quiet --fail-under 80 -- node ./server.mjs > lint-result.json
    - |
      SCORE=$(jq -r .score lint-result.json)
      PASSED=$(jq -r .passed lint-result.json)
      echo "Score: $SCORE/100"
      if [ "$PASSED" = "false" ]; then
        echo "Lint threshold not met"
        exit 1
      fi
  artifacts:
    when: always
    paths:
      - lint-result.json
    reports:
      metrics: lint-result.json
```

### GitLab CI with Markdown and job summary

```yaml
mcp-lint-summary:
  image: node:22
  stage: test
  script:
    - npm ci
    - npx @sherpa-labs/aimcp-lint --format markdown --fail-under 80 -- node ./server.mjs > lint-report.md
  artifacts:
    when: always
    paths:
      - lint-report.md
```

### GitLab CI with config discovery

```yaml
mcp-lint-config:
  image: node:22
  stage: test
  script:
    - npm ci
    - npx @sherpa-labs/aimcp-lint --format=json --quiet
  artifacts:
    when: always
    paths:
      - lint-result.json
```

## CircleCI

```yaml
version: 2.1

jobs:
  mcp-lint:
    docker:
      - image: cimg/node:22.0
    steps:
      - checkout
      - run:
          name: Install dependencies
          command: npm ci
      - run:
          name: Run aimcp-lint
          command: |
            npx @sherpa-labs/aimcp-lint --format=json --quiet --fail-under 80 -- node ./server.mjs > lint-result.json
            echo "Score: $(jq -r .score lint-result.json)/$(jq -r .max_score lint-result.json)"
            if [ "$(jq -r .passed lint-result.json)" = "false" ]; then
              echo "Lint threshold not met"
              exit 1
            fi
      - store_artifacts:
          path: lint-result.json
          destination: mcp-lint-report

workflows:
  test:
    jobs:
      - mcp-lint
```

### CircleCI with Markdown artifact

```yaml
- run:
    name: Generate lint report
    command: |
      npx @sherpa-labs/aimcp-lint --format markdown --fail-under 80 -- node ./server.mjs > lint-report.md
- store_artifacts:
    path: lint-report.md
    destination: mcp-lint-report
```

## Jenkins

### Jenkins Pipeline (Declarative)

```groovy
pipeline {
    agent any
    tools {
        nodejs 'NodeJS-22'
    }
    stages {
        stage('Setup') {
            steps {
                sh 'npm ci'
            }
        }
        stage('MCP Lint') {
            steps {
                script {
                    sh '''
                        npx @sherpa-labs/aimcp-lint \
                            --format=json --quiet \
                            --fail-under 80 \
                            -- node ./server.mjs > lint-result.json
                    '''
                    def report = readJSON file: 'lint-result.json'
                    echo "Score: ${report.score}/${report.max_score}"
                    if (!report.passed) {
                        error "MCP lint threshold not met (${report.score}/${report.max_score})"
                    }
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'lint-result.json', fingerprint: true
                }
            }
        }
    }
}
```

### Jenkins with config file

```groovy
stage('MCP Lint') {
    steps {
        sh '''
            npx @sherpa-labs/aimcp-lint \
                --format=json --quiet \
                --config .aimcp-lint.json
        '''
    }
}
```

### Jenkins Freestyle

Add a build step (Execute shell):

```bash
npm ci
npx @sherpa-labs/aimcp-lint --format=json --quiet --fail-under 80 -- node ./server.mjs > lint-result.json
SCORE=$(jq -r .score lint-result.json)
PASSED=$(jq -r .passed lint-result.json)
echo "MCP Lint Score: $SCORE/100"
if [ "$PASSED" = "false" ]; then
  echo "Lint threshold not met"
  exit 1
fi
```

Add a post-build action to archive `lint-result.json`.

## Parsing Output with jq

```bash
# Extract just the score
npx @sherpa-labs/aimcp-lint --format=json --quiet -- node ./server.mjs | jq .score

# Check pass/fail
npx @sherpa-labs/aimcp-lint --format=json --quiet -- node ./server.mjs | jq .passed

# Store result in a variable
RESULT=$(npx @sherpa-labs/aimcp-lint --format=json --quiet -- node ./server.mjs)
SCORE=$(echo "$RESULT" | jq .score)
echo "Score: $SCORE/100"

# Conditional based on pass/fail
if echo "$RESULT" | jq -e '.passed' > /dev/null; then
  echo "Lint passed"
else
  echo "Lint failed"
  exit 1
fi
```

## Parsing Output with grep

```bash
# Check for PASS/FAIL in terminal output
npx @sherpa-labs/aimcp-lint --quiet -- node ./server.mjs | grep -q 'PASS' && echo "OK" || echo "FAIL"

# Extract score from terminal output
npx @sherpa-labs/aimcp-lint --quiet -- node ./server.mjs | grep -oE '[0-9]+/[0-9]+'

# Check for PASS/FAIL in full terminal output
npx @sherpa-labs/aimcp-lint -- node ./server.mjs | grep -E 'PASS|FAIL'

# Check if any errors were found
npx @sherpa-labs/aimcp-lint -- node ./server.mjs | grep 'Total Errors' | grep -v ': 0'
```

## Troubleshooting

### Server command not found

```
Error: MCP server process exited before completing pending requests: npx (exit code 127)
```

The MCP server executable cannot be found. Verify:

- The server script exists at the specified path
- The correct Node.js version is available in CI
- Dependencies are installed (`npm ci` in a prior step)
- The server command matches what you run locally

### Config validation failure (exit code 2)

```
Error: .aimcp-lint.json: format must be terminal, json, or markdown.
```

Check your `.aimcp-lint.json` for:

- Valid `format` (must be `terminal`, `json`, or `markdown`)
- `failUnder` is a non-negative number, not a string
- `severityOverrides` values are `error`, `warning`, or `info`
- `thresholds` values are non-negative numbers
- `command` is a non-empty string or array of strings

### Score below threshold (exit code 1)

```
Error: exit code 1 — score below --fail-under threshold
```

Check your `--fail-under` value. Try running locally with `--format=terminal` to see violations and fix issues:

```bash
npx @sherpa-labs/aimcp-lint -- node ./server.mjs
```

### JSON parsing in shell

If `jq` is not available in your CI environment:

```bash
# Node.js one-liner to extract score
node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).score.toString())" < lint-result.json

# Or install jq first
apt-get update && apt-get install -y jq
npm ci
```

### ANSI codes appearing in CI logs

Always use `--format=json --quiet` for CI pipelines. Terminal output with `--format=terminal` includes ANSI color codes when stdout is a TTY. If your CI captures TTY output, ANSI codes may appear as garbage. Use:

```bash
npx @sherpa-labs/aimcp-lint --format=json --quiet --fail-under 80 -- node ./server.mjs
```

### Debugging server connection issues

Add `--verbose` to see diagnostics on stderr:

```bash
npx @sherpa-labs/aimcp-lint --verbose -- node ./server.mjs 2> lint-debug.log
```

Check that your MCP server starts correctly in the CI environment with the same environment variables and working directory as your local setup.
