# aimcp-lint Configuration

`aimcp-lint` reads an optional `.aimcp-lint.json` configuration file from your project. This file lets teams share consistent lint settings without repeating command-line flags.

## Complete Config Example

```json
{
  "command": "node ./server.mjs",
  "format": "terminal",
  "failUnder": 80,
  "ignore": ["X004"],
  "only": [],
  "severityOverrides": {
    "P001": "warning",
    "X004": "info"
  },
  "ruleOverrides": {
    "P001": {
      "enabled": true,
      "severity": "warning",
      "thresholds": {
        "maxTools": 10
      }
    }
  },
  "thresholds": {
    "maxTools": 50,
    "maxResponseBytes": 1048576
  },
  "severityWeights": {
    "error": -10,
    "warning": -3,
    "info": -1
  },
  "watch": {
    "paths": ["."]
  },
  "detailed": false,
  "quiet": false,
  "verbose": false
}
```

## Field Reference

### `command`

Default MCP server command when none is passed on the command line.

- **Type**: `string` | `string[]`
- **Default**: none

```json
"command": "node ./server.mjs"
```

```json
"command": ["node", "./server.mjs", "--flag"]
```

When both a CLI command and a config `command` are present, the CLI command wins. When neither is present, `aimcp-lint` shows the usage help.

### `format`

Output format for lint results.

- **Type**: `"terminal"` | `"json"` | `"markdown"`
- **Default**: `"terminal"`

Overridden by `--format <format>`.

### `failUnder`

Minimum score required for the run to pass. Exit code 1 when the score is below this threshold.

- **Type**: `number`
- **Default**: no minimum (always passes)
- **Constraints**: non-negative finite number

Overridden by `--fail-under <score>`.

### `ignore`

Rule IDs to skip during lint execution.

- **Type**: `string[]`
- **Default**: `[]`

```json
"ignore": ["X004", "X005"]
```

Setting `--ignore` on the CLI **replaces** the config value rather than merging.

Legacy key `ignoredRules` is equivalent and still supported.

### `only`

Rule IDs to exclusively run. All other rules are skipped.

- **Type**: `string[]`
- **Default**: `[]`

```json
"only": ["P001", "P002"]
```

Setting `--only` on the CLI **replaces** the config value and clears any ignored rules.

Legacy key `includedRules` is equivalent and still supported.

### `severityOverrides`

Change the severity of specific rules.

- **Type**: `Record<string, "error" | "warning" | "info">`
- **Default**: `{}`

```json
"severityOverrides": {
  "P001": "warning",
  "X004": "info"
}
```

Overridden severities affect the violation's severity label in output and its contribution to the score (via severity weights).

### `ruleOverrides`

Fine-grained per-rule configuration.

- **Type**: `Record<string, { enabled?: boolean; severity?: "error" | "warning" | "info"; thresholds?: Record<string, number> }>`
- **Default**: `{}`

```json
"ruleOverrides": {
  "P001": {
    "enabled": false
  },
  "X001": {
    "severity": "error",
    "thresholds": {
      "maxTools": 5
    }
  }
}
```

- `enabled`: Set to `false` to disable a rule. Equivalent to adding it to `ignore`.
- `severity`: Override the rule's severity.
- `thresholds`: Rule-specific threshold values. These take precedence over global `thresholds` for matching keys.

### `thresholds`

Global threshold values available to all rules.

- **Type**: `Record<string, number>`
- **Default**: `{}`
- **Constraints**: all values must be non-negative finite numbers

```json
"thresholds": {
  "maxTools": 50,
  "maxResponseBytes": 1048576
}
```

### `severityWeights`

Score deduction for each severity level.

- **Type**: `{ error?: number; warning?: number; info?: number }`
- **Default**: `{}` (uses built-in defaults: error=-10, warning=-3, info=-1)

```json
"severityWeights": {
  "error": -10,
  "warning": -5,
  "info": -1
}
```

Values can be negative (deductions from the 100-point baseline) or positive.

### `watch`

Paths to watch in `aimcp-lint watch` mode.

- **Type**: `string[]` | `{ paths?: string[] }`
- **Default**: no paths

```json
"watch": {
  "paths": ["src", "lib"]
}
```

```json
"watch": ["src", "lib"]
```

When the config file itself exists, it is automatically watched regardless of the `watch.paths` setting.

### `detailed`

Show fix hints in terminal output.

- **Type**: `boolean`
- **Default**: `false`

Overridden by `--detailed` / `--no-detailed`.

### `quiet`

Suppress detailed output. Terminal shows only PASS/FAIL + score; JSON shows only score/max_score/passed.

- **Type**: `boolean`
- **Default**: `false`

Overridden by `--quiet`.

### `verbose`

Write internal diagnostics (config, connection, protocol) to stderr.

- **Type**: `boolean`
- **Default**: `false`

Overridden by `--verbose`. `--quiet` suppresses verbose output.

## Config Discovery

### Walk-up Discovery

When you run `aimcp-lint` without `--config`:

1. Start in the current working directory.
2. Look for `.aimcp-lint.json`.
3. If not found, move up to the parent directory.
4. Repeat until a config is found or the filesystem root is reached.
5. If no config is found anywhere, built-in defaults are used.

This means you can put `.aimcp-lint.json` at your project root and `aimcp-lint` will find it from any subdirectory.

**Termination**: Discovery stops at the filesystem root (`/` on macOS/Linux). A config placed at root is never loaded unless you are running from root.

### Explicit Config: `--config <path>`

When `--config <path>` is provided:

- The exact file at `<path>` is loaded.
- Walk-up discovery is **disabled**.
- If the file does not exist, `aimcp-lint` exits with an error.

### Missing Config

A missing config is normal — `aimcp-lint` uses sensible defaults for all settings. No config file is required.

## CLI Override Behavior

| Config Key  | CLI Flag          | Behavior                                  |
| ----------- | ----------------- | ----------------------------------------- |
| `format`    | `--format`        | CLI replaces                              |
| `failUnder` | `--fail-under`    | CLI replaces                              |
| `ignore`    | `--ignore`        | CLI **replaces** (does not merge)         |
| `only`      | `--only`          | CLI **replaces** and clears ignores       |
| `command`   | `[serverCommand]` | CLI replaces                              |
| `detailed`  | `--detailed`      | CLI replaces if provided                  |
| `quiet`     | `--quiet`         | true if either is true                    |
| `verbose`   | `--verbose`       | true if either is true (quiet suppresses) |

## Default Command Behavior

| Scenario                             | Result               |
| ------------------------------------ | -------------------- |
| CLI command provided                 | Use CLI command      |
| No CLI command, config has `command` | Use config `command` |
| Neither                              | Show help and exit   |

The config `command` supports two formats:

**String form** (split on whitespace):

```json
"command": "node ./server.mjs --flag"
```

**Array form**:

```json
"command": ["node", "./server.mjs", "--flag"]
```

## Severity Overrides

Severity overrides change how violations are labeled and scored.

```json
{
  "severityOverrides": {
    "P001": "warning"
  }
}
```

This changes violations from rule `P001` from their built-in severity to `warning`. The severity weight for `warning` (default -3) is applied to the score instead of the original severity weight.

## Thresholds

Thresholds are key-value number pairs available to rules during lint evaluation.

```json
{
  "thresholds": {
    "maxTools": 50,
    "maxResponseBytes": 1048576
  }
}
```

Rule-specific thresholds (inside `ruleOverrides`) take precedence over global thresholds for matching keys:

```json
{
  "thresholds": {
    "maxTools": 50
  },
  "ruleOverrides": {
    "X001": {
      "thresholds": {
        "maxTools": 10
      }
    }
  }
}
```

Here, rule `X001` sees `maxTools: 10`, while other rules see `maxTools: 50`.

## Invalid Config Examples

### Non-object root

```json
["not", "an", "object"]
```

Error: `must contain a JSON object.`

### Invalid format

```json
{ "format": "xml" }
```

Error: `format must be terminal, json, or markdown.`

### Invalid failUnder

```json
{ "failUnder": "high" }
```

Error: `failUnder must be a non-negative finite number.`

### Negative failUnder

```json
{ "failUnder": -5 }
```

Error: `failUnder must be a non-negative finite number.`

### Non-array ignore

```json
{ "ignore": "X004" }
```

Error: `ignore must be an array of strings.`

### Invalid severity override

```json
{ "severityOverrides": { "P001": "critical" } }
```

Error: `severityOverrides.P001 must be error, warning, or info.`

### Invalid command shape

```json
{ "command": 123 }
```

Error: `command must be a non-empty string or a non-empty array of strings.`

### Invalid threshold value

```json
{ "thresholds": { "maxTools": -5 } }
```

Error: `thresholds.maxTools must be a non-negative finite number.`

### Malformed ruleOverrides

```json
{ "ruleOverrides": { "P001": "disabled" } }
```

Error: `ruleOverrides.P001 must be an object.`

### Invalid severityWeights key

```json
{ "severityWeights": { "critical": -99 } }
```

Error: `severityWeights.critical is not a valid key; expected error, warning, or info.`

## init Command

`aimcp-lint init` creates a `.aimcp-lint.json` with all supported fields:

```json
{
  "command": "node ./server.mjs",
  "format": "terminal",
  "failUnder": 80,
  "ignore": [],
  "only": [],
  "severityOverrides": {},
  "ruleOverrides": {},
  "thresholds": {},
  "severityWeights": {},
  "watch": {
    "paths": ["."]
  },
  "detailed": false,
  "quiet": false,
  "verbose": false
}
```

If a config already exists, `init` refuses to overwrite it. Use `--force` to overwrite.
