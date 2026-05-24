# MCP Lint Fixtures

These fixtures are serialized local `LintContext` equivalents, not live network/server executions.

- `createFilesystemLikeGoodContext()` is a pinned local filesystem-like success fixture modeled after the reference filesystem server behavior: allowed roots, constrained path schemas, valid initialization, and safe sampled output.
- `createIntentionallyBrokenContext()` is deliberately invalid across protocol, schema, security, and performance categories.
- `ruleFixtures` contains one passing and one failing context builder for every implemented Phase 18 rule.
