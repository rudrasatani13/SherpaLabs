# aimcp-lint JSON Report Schema

Schema version: `1.0.0`

## Root Object

```json
{
  "schema_version": "1.0.0",
  "score": 85,
  "max_score": 100,
  "passed": true,
  "violations": [],
  "summary": {},
  "category_subscores": {},
  "failing_rules": [],
  "server_info": {},
  "metadata": {}
}
```

| Key                  | Type                               | Description                                                                                |
| -------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------ |
| `schema_version`     | string                             | Schema version (`"1.0.0"`)                                                                 |
| `score`              | number                             | Overall score (0-100)                                                                      |
| `max_score`          | number                             | Maximum possible score (100)                                                               |
| `passed`             | boolean                            | Whether the score met the threshold                                                        |
| `violations`         | Violation[]                        | Array of violations found                                                                  |
| `summary`            | Summary                            | Aggregate violation counts                                                                 |
| `category_subscores` | Record\<string, CategorySubscore\> | Per-category scores keyed by category ID (`protocol`, `schema`, `security`, `performance`) |
| `failing_rules`      | FailingRule[]                      | Rules that produced violations                                                             |
| `server_info`        | ServerInfo                         | Information about the MCP server                                                           |
| `metadata`           | Metadata                           | Report metadata                                                                            |

## Quiet Mode

When `--quiet` is used with `--format json`, the output is a minimal object:

```json
{
  "score": 85,
  "max_score": 100,
  "passed": true
}
```

## Violation

```json
{
  "rule_id": "X001",
  "category": "security",
  "severity": "error",
  "message": "Unsafe filesystem access pattern detected",
  "fix_hint": "Restrict filesystem access to known directories",
  "location": "tools/list > tools[0].inputSchema",
  "evidence": "./etc/passwd"
}
```

| Key        | Type   | Required | Description                                                       |
| ---------- | ------ | -------- | ----------------------------------------------------------------- |
| `rule_id`  | string | yes      | Rule identifier (e.g. `"X001"`)                                   |
| `category` | string | yes      | Category: `"protocol"`, `"schema"`, `"security"`, `"performance"` |
| `severity` | string | yes      | Severity: `"error"`, `"warning"`, `"info"`                        |
| `message`  | string | yes      | Human-readable violation description                              |
| `fix_hint` | string | yes      | How to fix the violation                                          |
| `location` | string | no       | Where in the server response the violation was found              |
| `evidence` | string | no       | The specific data that triggered the violation                    |

## Summary

```json
{
  "error_count": 2,
  "warning_count": 1,
  "info_count": 0,
  "violation_count": 3
}
```

| Key               | Type   | Description                           |
| ----------------- | ------ | ------------------------------------- |
| `error_count`     | number | Number of error-severity violations   |
| `warning_count`   | number | Number of warning-severity violations |
| `info_count`      | number | Number of info-severity violations    |
| `violation_count` | number | Total violations                      |

## CategorySubscore

```json
{
  "category": "security",
  "label": "Security",
  "score": 20,
  "max_score": 25,
  "baseline": 25,
  "deduction": 5,
  "violation_count": 2,
  "error_count": 1,
  "warning_count": 1,
  "info_count": 0,
  "failing_rule_ids": ["X001", "X002"]
}
```

| Key                | Type     | Description                           |
| ------------------ | -------- | ------------------------------------- |
| `category`         | string   | Category ID                           |
| `label`            | string   | Human-readable category label         |
| `score`            | number   | Category score                        |
| `max_score`        | number   | Maximum category score                |
| `baseline`         | number   | Starting baseline before deductions   |
| `deduction`        | number   | Total points deducted                 |
| `violation_count`  | number   | Violations in this category           |
| `error_count`      | number   | Error-severity violations             |
| `warning_count`    | number   | Warning-severity violations           |
| `info_count`       | number   | Info-severity violations              |
| `failing_rule_ids` | string[] | IDs of rules that produced violations |

## FailingRule

```json
{
  "rule_id": "X001",
  "category": "security",
  "category_label": "Security",
  "worst_severity": "error",
  "count": 3,
  "message": "Unsafe filesystem access",
  "fix_hint": "Restrict filesystem access to known directories",
  "violation_ids": ["viol-1", "viol-2"]
}
```

| Key              | Type     | Description                          |
| ---------------- | -------- | ------------------------------------ |
| `rule_id`        | string   | Rule identifier                      |
| `category`       | string   | Category ID                          |
| `category_label` | string   | Human-readable category label        |
| `worst_severity` | string   | Highest severity among violations    |
| `count`          | number   | Number of violations from this rule  |
| `message`        | string   | Rule message                         |
| `fix_hint`       | string   | How to fix violations from this rule |
| `violation_ids`  | string[] | IDs of all violations from this rule |

## ServerInfo

```json
{
  "transport": "stdio",
  "protocol_version": "2024-11-05",
  "name": "example-server",
  "version": "1.0.0",
  "capabilities": ["tools", "resources"],
  "tool_count": 5,
  "resource_count": 2,
  "prompt_count": 1
}
```

| Key                | Type     | Required | Description                                                          |
| ------------------ | -------- | -------- | -------------------------------------------------------------------- |
| `transport`        | string   | yes      | Transport type: `"stdio"`, `"sse"`, `"streamable-http"`, `"unknown"` |
| `protocol_version` | string   | no       | MCP protocol version                                                 |
| `name`             | string   | no       | Server name from `serverInfo`                                        |
| `version`          | string   | no       | Server version from `serverInfo`                                     |
| `capabilities`     | string[] | yes      | Available capabilities                                               |
| `tool_count`       | number   | yes      | Number of tools                                                      |
| `resource_count`   | number   | yes      | Number of resources                                                  |
| `prompt_count`     | number   | yes      | Number of prompts                                                    |

## Metadata

```json
{
  "schema_version": "1.0.0",
  "linted_at": "2026-01-01T00:00:00.000Z",
  "rules_run": ["P001", "P002"]
}
```

| Key              | Type     | Description                    |
| ---------------- | -------- | ------------------------------ |
| `schema_version` | string   | Schema version (`"1.0.0"`)     |
| `linted_at`      | string   | ISO 8601 timestamp of lint run |
| `rules_run`      | string[] | Rule IDs that were executed    |

## Determinism

The JSON output is deterministic across runs for the same input. No unstable timestamps, random IDs, or non-deterministic values are included. The `linted_at` field uses the time from the underlying lint run, not a fresh timestamp on each format call.

## No ANSI Codes

JSON output never contains ANSI color codes regardless of terminal settings, `--format`, or `isTTY`.
