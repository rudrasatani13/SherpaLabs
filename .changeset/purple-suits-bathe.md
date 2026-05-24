---
"@sherpa-labs/aimcp-lint": patch
---

Initial public release of aimcp-lint — the MCP server linter.

- Lint MCP servers for protocol compliance, schema violations, security issues, and performance best practices
- Terminal, JSON, Markdown, and CI-friendly --quiet output
- Config file discovery with .aimcp-lint.json, severity overrides, thresholds, and rule-level configuration
- Watch mode for continuous linting during development
- Init and rules subcommands for interactive setup and rule exploration
- Stable exit codes for CI/CD pipelines
- GitHub Action template for one-step CI integration
