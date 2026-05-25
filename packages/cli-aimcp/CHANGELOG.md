# @sherpa-labs/aimcp-lint

## 0.0.2

### Patch Changes

- [`961335a`](https://github.com/rudrasatani13/SherpaLabs/commit/961335ae49c9d36e6b3396ec1ca4e429d75e4b63) Thanks [@rudrasatani13](https://github.com/rudrasatani13)! - Fix npm installs by keeping the bundled core MCP implementation out of runtime dependencies.

## 0.0.1

### Patch Changes

- [`3164129`](https://github.com/rudrasatani13/SherpaLabs/commit/3164129bce9ed0204ddfd375a58d8c4091a77036) Thanks [@rudrasatani13](https://github.com/rudrasatani13)! - Initial public release of aimcp-lint — the MCP server linter.
  - Lint MCP servers for protocol compliance, schema violations, security issues, and performance best practices
  - Terminal, JSON, Markdown, and CI-friendly --quiet output
  - Config file discovery with .aimcp-lint.json, severity overrides, thresholds, and rule-level configuration
  - Watch mode for continuous linting during development
  - Init and rules subcommands for interactive setup and rule exploration
  - Stable exit codes for CI/CD pipelines
  - GitHub Action template for one-step CI integration
