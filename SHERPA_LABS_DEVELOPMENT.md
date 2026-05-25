# SHERPA LABS — Development Plan (A → Z)

---

**Version:** 1.0.0
**Last Updated:** May 2026
**Purpose:** Step-by-step development guide for building Sherpa Labs from zero to launch
**For:** Solo developer using Claude Code for guided implementation
**Companion Doc:** `SHERPA_LABS_MASTER_PLAN.md` (product info, scope, pricing, business strategy)

---

## How To Use This Document

This document contains only **development phases**. It does not contain code samples — only instructions about what to build in each phase, what features to add, and how to verify the work is complete.

Each phase follows the same structure:

- **Purpose** — Why this phase exists
- **Focus Areas** — High-level topics covered
- **Key Deliverables** — Specific things to build in this phase
- **Expected Outcome** — What is "done" at the end
- **Success Criteria** — How to verify the phase is actually complete
- **Depends On** — Which previous phases must be done first

Work through phases sequentially within a stage. Some stages can be parallelized later (e.g., Stage U Documentation can start once Stage E is done). Most phases should take 4–16 hours of focused work.

**Total phases:** ~165
**Estimated solo dev timeline:** ~26-30 weeks at 2 phases/day average

---

## Prerequisites Before Starting

- macOS, Linux, or Windows with WSL2
- Comfort with TypeScript, React, Node.js
- GitHub account
- Cloudflare account (free tier)
- Vercel account (free tier)
- Neon account (free tier)
- Clerk account (free tier)
- Paddle account (start KYC early in Phase 4 — takes 5–14 days)
- Anthropic API key (for AI-powered features, optional)
- Domain available (e.g., sherpalabs.dev)

---

## Stages Overview

| Stage | Phases | Focus | Approx. Duration |
|-------|--------|-------|------------------|
| A | 1–7 | Foundation & Environment | 1 week |
| B | 8–14 | Shared Libraries (Parsing, Audit Engine) | 1 week |
| C | 15–19 | MCP Protocol Core | 1 week |
| D | 20–25 | aimcp-lint CLI | 1 week |
| E | 26–33 | Sherpa CLI | 1.5 weeks |
| F | 34–40 | Backend API Foundation | 1 week |
| G | 41–46 | Authentication & Users | 1 week |
| H | 47–58 | Dashboard Web App | 2 weeks |
| I | 59–65 | Repo Connection & Cloud Sync | 1 week |
| J | 66–70 | Audit Visualization | 1 week |
| K | 71–77 | Team Sync Feature | 1 week |
| L | 78–86 | Monetization (Paddle) | 1.5 weeks |
| M | 87–91 | Trial & Customer Portal | 1 week |
| N | 92–98 | GitHub Integrations | 1.5 weeks |
| O | 99–104 | Advanced CLI Features | 1 week |
| P | 105–108 | Notifications & Webhooks | 0.5 week |
| Q | 109–112 | Internationalization (Hindi) | 0.5 week |
| R | 113–118 | Privacy, Security, Compliance | 1 week |
| S | 119–123 | Performance Optimization | 1 week |
| T | 124–129 | Testing & Quality | 1 week |
| U | 130–135 | Documentation Site | 1 week |
| V | 136–141 | Marketing Site | 1 week |
| W | 142–146 | Monitoring & Observability | 0.5 week |
| X | 147–152 | Production Deployment | 0.5 week |
| Y | 153–158 | Beta & Launch Preparation | 2 weeks |
| Z | 159–165 | Public Launch | 1 week |

---

# STAGE A — FOUNDATION & ENVIRONMENT

---

## Phase 1 — Local Development Environment Setup

**Purpose:** Set up a fast, reproducible local development environment optimized for TypeScript monorepo work.

**Focus Areas:**
- Node.js + pnpm installation and version pinning
- Code editor configuration
- Terminal tooling and CLI utilities
- Git configuration

**Key Deliverables:**
- Node.js LTS v20+ installed via nvm
- pnpm installed globally (faster than npm, native workspaces support)
- `.nvmrc` file pinning the Node version
- VS Code installed with extensions: ESLint, Prettier, Tailwind CSS IntelliSense, GitLens, Vitest, Error Lens, Pretty TypeScript Errors
- gh CLI for GitHub Actions testing
- Git configured with user name, email, and SSH key for GitHub
- Cloudflare's Wrangler CLI installed globally for Workers development
- httpie or curl installed for API testing
- Documentation file recording everything installed (versions matter for reproducibility)

**Expected Outcome:** A working dev environment where any contributor can clone and start in under 15 minutes by following the setup documentation.

**Success Criteria:**
- `node --version` shows the pinned LTS version
- `pnpm --version` works
- VS Code launches without warnings
- gh CLI authenticated to GitHub account
- Wrangler CLI authenticated to Cloudflare account

**Depends On:** None

---

## Phase 2 — Monorepo Scaffold (pnpm workspaces)

**Purpose:** Initialize the monorepo structure that will house all CLIs, the dashboard, the backend API, and shared packages.

**Focus Areas:**
- pnpm workspaces configuration
- Folder layout supporting multiple deployable units
- TypeScript project references for incremental builds
- Workspace-level scripts

**Key Deliverables:**
- Root `package.json` with workspaces field
- `pnpm-workspace.yaml` defining package patterns
- Directory structure created (empty for now):
  - `apps/web` (Next.js dashboard, future)
  - `apps/api` (Hono on Cloudflare Workers, future)
  - `packages/cli-aimcp` (aimcp-lint CLI, future)
  - `packages/cli-sherpa` (sherpa CLI, future)
  - `packages/core-rules` (parsing + audit engine)
  - `packages/core-mcp` (MCP protocol + lint rules)
  - `packages/shared-types` (cross-package TypeScript types)
  - `packages/shared-config` (ESLint, Prettier, tsconfig presets)
  - `docs/` (documentation)
  - `tools/` (build scripts, release helpers)
- Root `tsconfig.json` with project references
- Root README.md explaining the monorepo layout

**Expected Outcome:** A clean monorepo where each package can be added later by simply scaffolding its `package.json` and TypeScript config.

**Success Criteria:**
- `pnpm install` runs successfully even with empty packages
- Directory structure matches the planned layout
- README explains the purpose of each folder

**Depends On:** Phase 1

---

## Phase 3 — Git Repository & Version Control Setup

**Purpose:** Establish version control with proper branching, commit conventions, and release automation before significant code is written.

**Focus Areas:**
- GitHub repository creation and configuration
- Branch protection rules
- Conventional Commits
- Changesets for monorepo version management
- Pull request templates and contribution guidelines

**Key Deliverables:**
- Public GitHub repository created (e.g., `sherpa-labs/sherpa-labs`)
- `.gitignore` covering Node, TypeScript, Next.js, Wrangler, env files
- Branch strategy documented:
  - `main` for production releases
  - `develop` for integration / staging
  - `feature/*` for feature branches
  - `fix/*` for bug fixes
- Branch protection on `main` requiring PR review and passing CI
- Changesets package initialized for independent versioning of monorepo packages
- Conventional Commits format documented in CONTRIBUTING.md
- `.github/PULL_REQUEST_TEMPLATE.md` with sections for what changed, why, and how to verify
- LICENSE files:
  - MIT for `packages/*` (public OSS packages)
  - Closed/proprietary for `apps/web` and `apps/api`

**Expected Outcome:** Professional version control setup with automated release management ready.

**Success Criteria:**
- Repository visible on GitHub
- Branch protection rules active
- First commit follows Conventional Commits format
- CONTRIBUTING.md readable and complete

**Depends On:** Phase 2

---

## Phase 4 — Brand Identity, Domain & Asset Preparation

**Purpose:** Lock the brand name, acquire the domain, and prepare basic visual assets before any public-facing work begins. Avoid late-stage rename pain.

**Focus Areas:**
- Brand name validation across npm, GitHub, domain registrars
- Domain registration
- Visual identity basics (logo, color palette, typography)
- Email setup
- Paddle account creation (start KYC because it takes 5-14 days)

**Key Deliverables:**
- npm scope availability verified and reserved (e.g., `@sherpa-labs/`)
- GitHub organization created (e.g., `sherpa-labs`)
- Primary domain registered (e.g., `sherpalabs.dev`)
- Basic logo (wordmark for v1, no need for elaborate art)
- Brand color palette defined (2-3 colors with documented hex values)
- Typography choice for landing page and dashboard
- Open Graph image template (1200×630)
- Favicon set generated (16, 32, 192, 512, maskable)
- Email forwarding set up (e.g., `noreply@sherpalabs.dev` → personal Gmail via Cloudflare Email Routing free tier)
- Paddle account signup initiated and KYC documents submitted

**Expected Outcome:** Brand identity locked, domain live, basic assets in place. Paddle KYC in flight.

**Success Criteria:**
- Domain resolves (even if to a placeholder page)
- Logo and favicon files committed to `packages/shared-config/assets/`
- Brand colors documented in a brand guide file
- Paddle confirmation email received

**Depends On:** Phase 3

---

## Phase 5 — Shared Configuration (TypeScript, ESLint, Prettier)

**Purpose:** Set up shared configurations that all packages in the monorepo will extend. Single source of truth for code style and quality.

**Focus Areas:**
- Base TypeScript configuration
- Shared ESLint rules
- Prettier formatting
- Husky pre-commit hooks
- lint-staged for fast pre-commit checks

**Key Deliverables:**
- `packages/shared-config/` package created with:
  - `tsconfig.base.json` with strict TypeScript settings (`strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`)
  - Separate tsconfig presets for Node CLIs, edge runtimes (Workers), and Next.js apps
  - `eslint.config.js` using flat config with TypeScript-aware rules, no-`any` enforcement, no-`console.log` in production code
  - `prettier.config.js` with 2-space indent, single quotes, trailing commas, 100-char line width
- Husky installed with pre-commit hook
- lint-staged configured to run ESLint + Prettier on staged files
- TypeScript not-on-disk types for cross-package references configured

**Expected Outcome:** Adding a new package requires only extending the shared configs (3 lines), not duplicating configuration.

**Success Criteria:**
- New file with `any` type fails lint
- Pre-commit hook blocks malformed code
- `pnpm typecheck` runs across all packages
- Code style consistent across all files

**Depends On:** Phase 2

---

## Phase 6 — CI/CD Pipeline (GitHub Actions)

**Purpose:** Set up continuous integration that catches regressions on every PR, and automates package publishing.

**Focus Areas:**
- PR validation workflow (lint + typecheck + test + build)
- Release workflow (Changesets → npm publish)
- Workspace caching for speed
- Secrets configuration

**Key Deliverables:**
- `.github/workflows/ci.yml`: runs on every PR, installs with pnpm cache, then lint, typecheck, test, build
- `.github/workflows/release.yml`: runs on push to `main`, creates a Changesets PR or publishes packages to npm
- GitHub Actions cache configured for pnpm store and TypeScript build outputs
- Secrets added to GitHub repository settings:
  - `NPM_TOKEN` for npm publishing
  - `CLOUDFLARE_API_TOKEN` for Workers deployment (used later)
  - `VERCEL_TOKEN` for dashboard deployment (used later)
- Status checks required on `main`: CI must pass
- Optional: Codecov integration for coverage tracking (free for public repos)

**Expected Outcome:** Every PR auto-tested. Merging to `main` auto-publishes packages within minutes.

**Success Criteria:**
- Full CI run completes in under 4 minutes
- Failing test blocks merge
- Successful Changeset merge publishes to npm

**Depends On:** Phase 5

---

## Phase 7 — Initial Documentation Foundation

**Purpose:** Establish documentation structure and write foundational docs before code complexity makes this harder.

**Focus Areas:**
- README at repo root
- Setup guide
- Architecture overview
- Contribution guide
- Coding standards
- Decision log structure

**Key Deliverables:**
- `README.md` at repo root: project overview, link to setup guide, link to master plan, license info
- `docs/SETUP.md`: step-by-step environment setup for new contributors
- `docs/ARCHITECTURE.md`: explanation of monorepo layout, what each package does, how data flows
- `docs/CONTRIBUTING.md`: branching, commits, PR process, code review expectations
- `docs/CODING_STANDARDS.md`: naming conventions, file organization, common patterns
- `docs/DECISIONS/` folder with template for ADRs (Architecture Decision Records)
- First ADR: `001-monorepo-with-pnpm.md` explaining why this stack was chosen

**Expected Outcome:** A new developer (or future you) can understand the project structure from documentation alone.

**Success Criteria:**
- README renders cleanly on GitHub
- All docs are linked from README
- Architecture doc has folder tree and explanation of each folder

**Depends On:** Phase 2

---

# STAGE B — SHARED LIBRARIES (PARSING & AUDIT ENGINE)

---

## Phase 8 — Shared Types Package

**Purpose:** Create a central package for TypeScript types used across CLIs, API, and dashboard.

**Focus Areas:**
- Core domain types
- API request/response shapes
- Cross-package type sharing

**Key Deliverables:**
- `packages/shared-types/` package scaffolded
- Type definitions for:
  - `RuleSet` (parsed CLAUDE.md/.cursorrules/AGENTS.md structure)
  - `RuleFile` (file metadata + content)
  - `AuditResult` (score, violations, recommendations)
  - `Violation` (rule id, severity, message, location, fix hint)
  - `AuditConfig` (configurable thresholds and rule overrides)
  - `McpServerInfo` (server capabilities, tools, resources)
  - `McpLintResult` (score, violations by category)
  - `User`, `Workspace`, `Repo`, `Subscription` (domain entities)
  - `ApiResponse<T>` (consistent response envelope)
- Index file exporting all types
- Build configured to emit `.d.ts` files for consumption

**Expected Outcome:** Any package can import shared types via `@sherpa-labs/shared-types`.

**Success Criteria:**
- Package builds without errors
- Types are tree-shakeable
- Other packages can import and use these types

**Depends On:** Phase 6

---

## Phase 9 — Core Utilities Package

**Purpose:** Build reusable utility functions that multiple packages will need: logger, file system helpers, token counting, etc.

**Focus Areas:**
- Logging utilities with levels
- File reading with safety (size limits, encoding handling)
- Token counting (approximate, for budget checks)
- Async retry helpers
- Path normalization across platforms

**Key Deliverables:**
- `packages/core-utils/` package created (or merge into `shared-types` if minimal)
- Logger utility supporting log levels (debug, info, warn, error) and JSON output for CI
- Safe file read function with max size limit and encoding detection
- Token counting helper (approximate via word count × 1.3 multiplier)
- Async retry helper with exponential backoff
- Path utilities that handle Windows vs Unix paths consistently
- Hash utility for deterministic IDs

**Expected Outcome:** Common operations have a single canonical implementation.

**Success Criteria:**
- All utilities have unit tests
- Logger writes correct output to terminal and JSON
- File reader handles edge cases (huge files, binary files, missing files)

**Depends On:** Phase 8

---

## Phase 10 — Rule File Parser

**Purpose:** Parse all supported AI agent rule file formats into a normalized internal representation.

**Focus Areas:**
- Markdown parsing (CLAUDE.md, AGENTS.md)
- Plain text and JSON parsing (.cursorrules)
- Directory-based rule sets (.cursor/rules/*.md, .windsurfrules/*.md)
- Common internal model

**Key Deliverables:**
- `packages/core-rules/` package created
- Parser submodule with:
  - `parseClaudeMd(content)` returning structured RuleSet (sections, headings, code blocks, directives)
  - `parseCursorRules(content)` handling both plain text and JSON formats
  - `parseAgentsMd(content)` similar to CLAUDE.md
  - `parseRulesDirectory(path)` globbing `.cursor/rules/*.md` and concatenating
  - `parseWindsurfRules(content)` for Windsurf format
  - `parseContinueConfig(content)` for `.continue/config.yaml`
- Markdown parsing library integrated (marked or unified — marked recommended for speed)
- Format auto-detection based on filename and content patterns
- Graceful handling of malformed files (return parse errors, not crashes)
- Round-trip test: parse → serialize → matches input within whitespace tolerance

**Expected Outcome:** Any supported rule file can be loaded into a common `RuleSet` structure.

**Success Criteria:**
- Parser handles 20+ real CLAUDE.md examples from public GitHub repos
- All formats round-trip correctly
- Malformed input returns useful errors

**Depends On:** Phase 9

---

## Phase 11 — Stack Detection

**Purpose:** Detect the user's tech stack from their repository so audit rules can be stack-aware.

**Focus Areas:**
- Language detection
- Framework detection
- AI tool config detection
- Lockfile / manifest parsing

**Key Deliverables:**
- Stack detection module that reads:
  - `package.json` for Node.js, identifies frameworks (Next.js, React, Vue, Svelte, Express, etc.)
  - `pyproject.toml` and `requirements.txt` for Python (FastAPI, Django, Flask, etc.)
  - `Cargo.toml` for Rust
  - `go.mod` for Go
  - `composer.json` for PHP
  - `Gemfile` for Ruby
- Detection of TypeScript usage (presence of `tsconfig.json`, `.ts` files)
- Detection of AI tool configs:
  - `CLAUDE.md` (Claude Code)
  - `.cursorrules` and `.cursor/rules/` (Cursor)
  - `AGENTS.md` (multi-tool)
  - `.windsurfrules` (Windsurf)
  - `.continue/config.yaml` (Continue.dev)
- Output: a `StackContext` object with detected language, frameworks, tools

**Expected Outcome:** Given any repository, the system knows what tech stack and which AI tools are in use.

**Success Criteria:**
- Detection works correctly on 10+ sample repos covering different stacks
- Output `StackContext` is consistent and complete
- Missing manifest files don't cause crashes

**Depends On:** Phase 9

---

## Phase 12 — Audit Engine Architecture

**Purpose:** Build the core architecture for the rule audit system. Plugin-style architecture where each rule is a separate, testable unit.

**Focus Areas:**
- Plugin/rule registration system
- Severity levels and scoring
- Violation reporting structure
- Configuration system

**Key Deliverables:**
- Audit engine core in `packages/core-rules/audit/`
- Rule plugin interface defining how an audit rule is structured:
  - Rule ID, severity, title, description, check function
- Severity weights for scoring (error = -10, warning = -3, info = -1)
- Composite score calculation (baseline 100, deduct per violation)
- Rule registry that loads all rules
- Configuration system supporting:
  - Custom severity overrides
  - Rule disabling via `.sherpa.json`
  - Custom thresholds for token budgets, etc.
- Context object passed to rules: parsed RuleSet, stack context, file metadata

**Expected Outcome:** A clean plugin system for audit rules that makes adding new rules trivial.

**Success Criteria:**
- A sample rule can be added by creating one file in the rules directory
- Disabling a rule via config works
- Scoring is deterministic for the same input

**Depends On:** Phase 10, Phase 11

---

## Phase 13 — Heuristic Audit Rules Implementation

**Purpose:** Implement the core set of audit rules using deterministic heuristics (no LLM calls). These are the rules that produce a score and recommendations.

**Focus Areas:**
- Anti-pattern detection
- Token budget analysis
- Conflict detection across files
- Stack-awareness checks
- Quality heuristics

**Key Deliverables:**
- At least 12 audit rules implemented:
  - **A1 — Token budget overrun:** flag if file > 8000 tokens
  - **A2 — Conflicting directives:** detect contradictory rules in same file
  - **A3 — Vague directives:** sentences with no actionable content ("write good code")
  - **A4 — Missing stack context:** no mention of detected language / framework
  - **A5 — Cross-file contradictions:** CLAUDE.md says X, .cursorrules says NOT X
  - **A6 — Duplicate sections:** same content in multiple rule files
  - **A7 — Outdated tool references:** mentions deprecated tool versions
  - **A8 — Missing priority signals:** no MUST/SHOULD/MAY patterns
  - **A9 — Verbose preamble:** too many tokens before first actionable rule
  - **A10 — Unbalanced sections:** one section significantly longer than others
  - **A11 — Missing examples:** rules without concrete code examples
  - **A12 — Ambiguous instructions:** "sometimes", "usually", "maybe"
- Each rule has unit tests with passing and failing fixtures
- Each rule returns specific, actionable violation messages (not generic)

**Expected Outcome:** Running the audit on any rule file produces a meaningful score and specific recommendations.

**Success Criteria:**
- All 12+ rules pass unit tests
- Auditing a known-good CLAUDE.md scores ≥ 85
- Auditing a known-bad file scores ≤ 50
- False positive rate < 5% on real-world test files

**Depends On:** Phase 12

---

## Phase 14 — Scoring & Violation Reporting

**Purpose:** Polish the output of the audit engine into clean, actionable reports suitable for human eyes, CI machines, and PR comments.

**Focus Areas:**
- Score calculation and weighting
- Violation prioritization
- Recommendation generation
- Multiple output formats

**Key Deliverables:**
- Composite scoring function combining all rule outputs
- Top recommendations algorithm (highest-impact fixes first)
- Three output format generators:
  - Human-readable terminal report with colors, grouping by severity
  - Stable JSON output with documented schema
  - Markdown output suitable for GitHub PR comments
- "Quick wins" section that highlights easy fixes
- Fix hint generation per violation (what to change and why)

**Expected Outcome:** Audit results are presented clearly regardless of consumption method.

**Success Criteria:**
- Terminal output is colored and readable
- JSON output validates against documented schema
- Markdown renders correctly in GitHub PR preview
- Recommendations are specific and actionable

**Depends On:** Phase 13

---

# STAGE C — MCP PROTOCOL CORE

---

## Phase 15 — MCP Protocol Research & Specification Study

**Purpose:** Develop deep understanding of the MCP protocol before implementing a client and lint rules.

**Focus Areas:**
- MCP specification reading
- Reference implementation study
- Transport mechanisms (stdio, SSE)
- Error handling patterns

**Key Deliverables:**
- Read the official MCP specification end-to-end
- Study Anthropic's reference servers (filesystem, github, etc.)
- Study existing `mcp-lint` (PyPI) for inspiration (not copy)
- Document in `docs/MCP_PROTOCOL_NOTES.md`:
  - Initialization handshake
  - Capabilities advertising
  - Tools, resources, prompts
  - Transport details (stdio framing, SSE conventions)
  - Common protocol violations seen in the wild
- Plan the rule taxonomy in `docs/MCP_LINT_RULES.md`:
  - Protocol rules (P-prefix)
  - Schema rules (S-prefix)
  - Security rules (X-prefix)
  - Performance rules (F-prefix)

**Expected Outcome:** A complete, written-down understanding of MCP and the rule taxonomy that drives implementation.

**Success Criteria:**
- 20+ rules planned with examples
- Severity assigned to each rule
- Test cases identified for each rule

**Depends On:** None (can run in parallel with earlier stages)

---

## Phase 16 — MCP Client Implementation (stdio Transport)

**Purpose:** Build an MCP client that connects to servers over stdio transport.

**Focus Areas:**
- Process spawning and management
- JSON-RPC framing over stdin/stdout
- Request/response correlation
- Timeout handling

**Key Deliverables:**
- `packages/core-mcp/client/StdioClient.ts` module
- Spawns child process running the MCP server
- Sends JSON-RPC requests over stdin
- Parses JSON-RPC responses from stdout
- Correlates request IDs with responses
- Configurable timeouts (5s default for initialize, 10s for tools/list)
- Handles process crashes, hangs, and malformed responses gracefully
- Logs all protocol messages in verbose mode for debugging

**Expected Outcome:** Reliable connection to any MCP server via stdio.

**Success Criteria:**
- Connects to filesystem reference server in < 1 second
- Handles a server that crashes mid-conversation
- Handles a server that hangs (timeout triggers correctly)
- Returns useful errors for malformed JSON-RPC

**Depends On:** Phase 15

---

## Phase 17 — MCP Client Implementation (SSE Transport)

**Purpose:** Add support for MCP servers using HTTP + Server-Sent Events transport.

**Focus Areas:**
- HTTP POST for requests
- SSE stream parsing
- Connection lifecycle
- Reconnection handling

**Key Deliverables:**
- `packages/core-mcp/client/SseClient.ts` module
- HTTP POST for sending JSON-RPC requests
- SSE stream parser for receiving responses
- Connection lifecycle management (connect, disconnect, error recovery)
- Optional automatic reconnection with backoff
- Common `McpClient` interface that both stdio and SSE clients implement

**Expected Outcome:** Either transport can be used interchangeably with the same API.

**Success Criteria:**
- Connects to an SSE MCP server successfully
- Handles network errors gracefully
- Reconnects automatically when configured

**Depends On:** Phase 16

---

## Phase 18 — MCP Lint Rules Implementation (15+ rules)

**Purpose:** Implement deterministic lint rules that analyze MCP server behavior captured by the client.

**Focus Areas:**
- Protocol rules (P-prefix)
- Schema rules (S-prefix)
- Security rules (X-prefix)
- Performance rules (F-prefix)

**Key Deliverables:**
- At least 15 lint rules organized by category, one file each:
  - **Protocol rules** (P001-P008): handshake correctness, JSON-RPC compliance, capabilities advertised vs supported, error response format, etc.
  - **Schema rules** (S001-S005): tool input/output schema validity, required fields, type correctness, JSON Schema draft compliance
  - **Security rules** (X001-X004): no plaintext secrets in tool descriptions, OAuth token handling patterns, file path traversal in resource URIs, dangerous tool capabilities
  - **Performance rules** (F001-F003): response size warnings, blocking call detection, missing streaming support flags
- Each rule has unit tests with passing/failing fixtures
- Rules run against the `LintContext` object built from MCP client responses
- Severity-weighted scoring identical to audit engine pattern

**Expected Outcome:** Comprehensive lint coverage of MCP server quality issues.

**Success Criteria:**
- All 15+ rules pass unit tests
- Running against filesystem reference server scores ≥ 85
- Running against an intentionally broken test server scores ≤ 40

**Depends On:** Phase 17

---

## Phase 19 — MCP Scoring & Categorization

**Purpose:** Aggregate lint results into a clear, categorized report.

**Focus Areas:**
- Composite scoring across categories
- Category-specific subscores
- Violation prioritization
- Output format generation

**Key Deliverables:**
- Composite score formula combining all rule violations
- Per-category subscores (Protocol, Schema, Security, Performance)
- Priority ordering of violations (security first, then protocol, then schema, then performance)
- Three output formats:
  - Terminal with category groupings
  - JSON with stable schema
  - Markdown for PR comments
- "Failing rules" summary at the bottom

**Expected Outcome:** MCP server authors get a clear, actionable report on their server quality.

**Success Criteria:**
- Subscores accurately reflect category violations
- Critical security issues always surface first
- All three formats produce consistent information

**Depends On:** Phase 18

---

# STAGE D — AIMCP-LINT CLI

---

## Phase 20 — aimcp-lint CLI Scaffold

**Purpose:** Build the CLI shell for aimcp-lint with great developer experience before adding lint logic.

**Focus Areas:**
- CLI framework setup
- Build pipeline for npm
- Help text quality
- Argument parsing

**Key Deliverables:**
- `packages/cli-aimcp/` package created
- `package.json` configured with `bin` field pointing to entry script
- Commander.js installed and configured
- Entry script with shebang
- tsup configured for bundling (Node 18+ target)
- Build produces a single distributable file
- `--version` reads from `package.json`
- `--help` shows clean, helpful text

**Expected Outcome:** A working CLI binary that prints help and version. No lint logic yet.

**Success Criteria:**
- `npx @sherpa-labs/aimcp-lint --help` works
- Binary builds in under 5 seconds
- Bundle size < 200 KB

**Depends On:** Phase 19

---

## Phase 21 — aimcp-lint Subcommands Implementation

**Purpose:** Implement all aimcp-lint subcommands wired to the lint engine.

**Focus Areas:**
- `lint` command (default)
- `watch` command (continuous mode)
- `init` command (config generation)
- `rules` command (list all rules)

**Key Deliverables:**
- `aimcp-lint <command>` runs the lint engine against a target MCP server
- `aimcp-lint watch <command>` runs lint in a loop, re-running on file changes
- `aimcp-lint init` generates a `.aimcp-lint.json` config file
- `aimcp-lint rules` lists all available rules with descriptions
- Common flags supported: `--format`, `--fail-under`, `--ignore`, `--only`, `--config`, `--verbose`, `--quiet`
- Progress spinners during connection and rule execution

**Expected Outcome:** All planned subcommands work end-to-end.

**Success Criteria:**
- Each subcommand has a clear help screen
- Running `aimcp-lint <test-server>` produces meaningful output
- Watch mode detects changes and re-runs
- Init creates a usable config file

**Depends On:** Phase 20

---

## Phase 22 — aimcp-lint Output Formatters

**Purpose:** Polish the three output formats for different consumers.

**Focus Areas:**
- Terminal output with colors and groupings
- JSON output with stable schema
- Markdown output for PR comments
- Quiet and verbose modes

**Key Deliverables:**
- Terminal formatter:
  - Colored output via picocolors
  - Violation grouping by category
  - Score banner at top
  - Summary table at bottom
  - Detailed mode shows fix hints
- JSON formatter:
  - Stable schema documented in `docs/AIMCP_JSON_SCHEMA.md`
  - Includes score, max_score, violations array, summary counts
- Markdown formatter:
  - GitHub-flavored Markdown
  - Tables for violation lists
  - Collapsible sections for long output
- `--quiet` mode shows only score
- `--verbose` mode shows every internal step
- `NO_COLOR` env variable respected

**Expected Outcome:** Output is excellent for humans in terminal, machines via JSON, and PR commenters via Markdown.

**Success Criteria:**
- Terminal output readable on dark and light terminals
- JSON validates against documented schema
- Markdown renders correctly in GitHub PR preview

**Depends On:** Phase 21

---

## Phase 23 — aimcp-lint Configuration System

**Purpose:** Support project-level configuration via `.aimcp-lint.json` for repeatable behavior.

**Focus Areas:**
- Config file discovery and loading
- Config schema definition
- Validation with helpful errors
- Defaults and overrides

**Key Deliverables:**
- Config file format defined and documented:
  - Default command to lint
  - Rules to disable
  - Severity overrides
  - Custom thresholds
  - Output format default
- Config discovery: walks up directory tree from cwd looking for `.aimcp-lint.json`
- Config validation with clear errors on invalid config
- Defaults applied when config is missing or partial
- `--config <path>` flag to explicitly specify config location

**Expected Outcome:** Teams can configure aimcp-lint per-project without command-line flags.

**Success Criteria:**
- `aimcp-lint init` generates a valid config
- Custom config respected on subsequent runs
- Invalid configs produce useful errors

**Depends On:** Phase 22

---

## Phase 24 — aimcp-lint CI Integration Features

**Purpose:** Make aimcp-lint excellent for use in CI/CD pipelines.

**Focus Areas:**
- Exit codes
- CI-friendly output
- Threshold gating
- Caching strategies

**Key Deliverables:**
- `--fail-under <score>` flag exits with code 1 if score is below threshold
- `--format=json --quiet` combination ideal for CI processing
- Stable exit codes:
  - 0: success
  - 1: score below threshold
  - 2: configuration error
  - 3: server connection error
- Documentation in `docs/CI_INTEGRATION.md` with examples for:
  - GitHub Actions
  - GitLab CI
  - CircleCI
  - Jenkins

**Expected Outcome:** Plug-and-play CI integration for any pipeline.

**Success Criteria:**
- CI run on sample server completes in < 60 seconds
- Score below threshold correctly fails the pipeline
- Output parseable by standard tools (jq, grep, etc.)

**Depends On:** Phase 23

---

## Phase 25 — aimcp-lint GitHub Action Template & npm Publish

**Purpose:** Publish a GitHub Action template for instant CI integration, and prepare the package for npm publication.

**Focus Areas:**
- GitHub Action composite or workflow template
- npm publish configuration
- Marketplace listing
- First public release

**Key Deliverables:**
- GitHub Action repository: `rudrasatani13/aimcp-lint-action`
- Composite Action that:
  - Installs the CLI
  - Runs lint against specified server
  - Outputs results to step summary
  - Posts PR comment with results
- Inputs: `server-command`, `min-score`, `format`
- Marketplace listing prepared
- npm package metadata in `packages/cli-aimcp/package.json`:
  - Description, keywords, repository, author, license
  - Files included (only `dist/`)
  - Engines field for Node version
- `prepublishOnly` script to ensure tests pass before publish
- First version published to npm via Changesets

**Expected Outcome:** aimcp-lint is publicly installable via `npm i @sherpa-labs/aimcp-lint` and usable as a GitHub Action.

**Success Criteria:**
- npm package installs cleanly
- GitHub Action runs on a sample repo
- Marketplace listing live

**Depends On:** Phase 24

---

# STAGE E — SHERPA CLI

---

## Phase 26 — Sherpa CLI Scaffold

**Purpose:** Build the CLI shell for the Sherpa rules optimizer.

**Focus Areas:**
- CLI framework setup (Commander.js)
- Build pipeline (tsup)
- Subcommand structure
- Help text

**Key Deliverables:**
- `packages/cli-sherpa/` package created
- `bin` field pointing to entry script
- Subcommand structure planned: `init`, `audit`, `convert`, `sync`, `login`, `commit`, `changelog`
- Commander.js subcommand setup with each command in its own file
- tsup configuration matching aimcp-lint
- Help text polished and helpful

**Expected Outcome:** A CLI shell ready for command implementations.

**Success Criteria:**
- `sherpa --help` shows all planned subcommands
- Each subcommand has its own `--help`
- Bundle size < 500 KB

**Depends On:** Phase 14

---

## Phase 27 — `sherpa init` Command

**Purpose:** Generate a baseline CLAUDE.md / .cursorrules / AGENTS.md from proven templates, customized to the detected stack.

**Focus Areas:**
- Stack detection invocation
- Interactive prompts
- Template selection
- File writing with safety

**Key Deliverables:**
- `sherpa init` command implemented in `packages/cli-sherpa/src/commands/init.ts`
- Uses stack detection from Phase 11
- Interactive prompts via @clack/prompts:
  - "Which AI tool do you primarily use?" (Claude Code / Cursor / Cline / Multiple)
  - "What's the main goal?" (Strict types / Move fast / Learning)
  - "Output filename?" (default CLAUDE.md)
- Template selection based on detected stack + answers
- File writing with backup of existing file (suffix `.sherpa-backup`)
- Summary printed at end with next steps

**Expected Outcome:** From an empty repo to a usable rules file in 30 seconds.

**Success Criteria:**
- Works on 5 different real repos producing stack-appropriate templates
- Existing files always backed up, never silently overwritten
- Generated file scores ≥ 80 on `sherpa audit`

**Depends On:** Phase 26, Phase 11

---

## Phase 28 — Template Library

**Purpose:** Build a library of high-quality CLAUDE.md / .cursorrules templates covering common stacks.

**Focus Areas:**
- Template authoring for major stacks
- Template metadata
- Template versioning
- Template testing

**Key Deliverables:**
- Templates in `packages/cli-sherpa/templates/`:
  - `nextjs-typescript-claude.md`
  - `react-typescript-claude.md`
  - `node-typescript-claude.md`
  - `python-fastapi-claude.md`
  - `python-django-claude.md`
  - `rust-claude.md`
  - `go-claude.md`
  - `nextjs-typescript-cursorrules`
  - `react-typescript-cursorrules`
  - Generic fallback for unknown stacks
- Each template has frontmatter metadata: stack, language, tools, version
- Templates undergo `sherpa audit` and score ≥ 85
- Variable substitution: project name, primary language version, etc.

**Expected Outcome:** Quality starting templates that produce good agent results immediately.

**Success Criteria:**
- All templates score ≥ 85 on audit
- Templates are concise (< 1500 tokens each)
- Variable substitution works correctly

**Depends On:** Phase 13

---

## Phase 29 — `sherpa audit` Command

**Purpose:** Run the audit engine against the user's repository and present results.

**Focus Areas:**
- File discovery
- Audit execution
- Output presentation
- Auto-fix mode

**Key Deliverables:**
- `sherpa audit` command implemented
- Auto-discovers rule files in current directory and subdirectories
- `sherpa audit <file>` audits a specific file
- Output sections:
  - Overall score (large, color-coded)
  - Per-file scores if multiple
  - Top 5 actionable improvements
  - Detected stack (so user knows assumptions)
- Flags: `--format`, `--fix`, `--config`, `--fail-under`
- `--fix` mode applies safe automatic fixes (with confirmation prompt)
- Backup created before any fix is applied

**Expected Outcome:** Run `sherpa audit` and immediately understand what to fix.

**Success Criteria:**
- Audits 5 real repos and produces meaningful, specific recommendations
- `--fix` doesn't corrupt files
- Total command time < 2 seconds on typical repos

**Depends On:** Phase 14, Phase 26

---

## Phase 30 — `sherpa convert` Command (Cross-Tool Conversion)

**Purpose:** Convert between rule file formats (e.g., .cursorrules → CLAUDE.md).

**Focus Areas:**
- Format-to-format transformation
- Lossless conversion where possible
- Warning system for lossy conversions

**Key Deliverables:**
- `sherpa convert --from <format> --to <format> <input>` command
- Supported conversions:
  - cursor → claude
  - claude → cursor
  - cursor → windsurf
  - claude → continue
  - And reverse paths
- Lossless conversion attempted; warnings printed for any lossy elements
- Output written to stdout or to file with `--output <path>`
- Used internally by `init` when generating multi-tool configs

**Expected Outcome:** Teams can migrate between AI tools without manual rule rewriting.

**Success Criteria:**
- Round-trip conversion preserves semantic content
- Lossy elements clearly flagged to user
- Common patterns convert correctly

**Depends On:** Phase 29

---

## Phase 31 — AI-Powered Audit (BYO API Key)

**Purpose:** Add an opt-in LLM-augmented audit layer for deeper insights, using the user's own API key.

**Focus Areas:**
- API key handling from environment
- Prompt design for rule analysis
- Cost transparency
- Privacy disclosure

**Key Deliverables:**
- `sherpa audit --ai` flag enables LLM augmentation
- Reads API key from environment: `ANTHROPIC_API_KEY` preferred, `OPENAI_API_KEY` fallback
- Sends rule content + stack context to LLM with a structured prompt
- Uses cost-effective model (Claude Haiku 4.5 or GPT-4.1-mini)
- Pre-flight cost estimate: "This will use approximately X tokens (~$Y)"
- Confirmation prompt unless `--no-confirm` is set
- API key never logged or stored anywhere
- Privacy disclosure printed: "Your rules file will be sent to <provider>"

**Expected Outcome:** Power users get deeper LLM-driven analysis without Sherpa absorbing the cost.

**Success Criteria:**
- AI audit produces measurably better recommendations than heuristic-only
- API key never appears in logs
- `--ai` without API key fails with clear error

**Depends On:** Phase 29

---

## Phase 32 — CLI Polish & Developer Experience

**Purpose:** Make both CLIs feel premium. This is the user's first impression.

**Focus Areas:**
- Help text quality
- Error messages
- Progress indicators
- Color handling
- Cross-platform considerations

**Key Deliverables:**
- All help text reviewed and rewritten (no auto-generated boilerplate)
- Progress spinners for any operation > 500ms
- Structured error messages: what / why / what to try next
- Verbose mode (`-v`) shows internal steps
- Quiet mode (`-q`) shows only final result
- `NO_COLOR` env variable respected
- Tested on macOS Terminal, iTerm2, Windows Terminal, Linux terminals
- Tested on Node 18, 20, 22

**Expected Outcome:** A CLI experience comparable to gh or vercel.

**Success Criteria:**
- 5 user-style test scenarios complete without confusion
- Color output looks correct on all tested terminals
- Errors guide the user to a solution

**Depends On:** Phase 31, Phase 25

---

## Phase 33 — npm Publish Setup for Both CLIs

**Purpose:** Configure both CLIs for stable, automated npm publishing.

**Focus Areas:**
- Package metadata
- Files included
- Engines requirements
- Publish workflow

**Key Deliverables:**
- Both `packages/cli-aimcp/` and `packages/cli-sherpa/` have:
  - Complete `package.json` metadata (description, keywords, repository, homepage, author, license)
  - `files` field restricting published content to `dist/` and necessary files
  - `engines` field requiring Node 18+
  - `prepublishOnly` script ensuring tests pass before publish
  - Repository field linking to GitHub
- Changeset published flows tested
- npm provenance enabled for verified publishes (optional but recommended)
- Beta tag publishing workflow for pre-release testing

**Expected Outcome:** Both CLIs publishable via Changesets in CI without manual intervention.

**Success Criteria:**
- Both packages installable via `npx`
- Package metadata correct on npmjs.com
- Beta releases tagged correctly

**Depends On:** Phase 32

---

# STAGE F — BACKEND API FOUNDATION

---

## Phase 34 — Hono Framework Setup on Cloudflare Workers

**Purpose:** Set up the API backend on Cloudflare Workers using Hono framework.

**Focus Areas:**
- Wrangler installation and configuration
- Hono framework setup
- Local dev workflow
- Basic routing

**Key Deliverables:**
- `apps/api/` package created with Hono
- `wrangler.toml` configured for local dev
- Hono app with health check endpoint (`/api/v1/health`)
- Local dev server running via `wrangler dev`
- Hot reload working on file changes
- Basic logging middleware

**Expected Outcome:** API server runs locally with hot reload, responds to health checks.

**Success Criteria:**
- `wrangler dev` starts in < 2 seconds
- `curl localhost:8787/api/v1/health` returns 200 OK
- Code changes trigger automatic reload

**Depends On:** Phase 6

---

## Phase 35 — Wrangler Configuration (Dev/Staging/Production)

**Purpose:** Configure separate Cloudflare Workers environments for development, staging, and production.

**Focus Areas:**
- Environment-specific configuration
- Secrets management
- Deployment workflows
- Domain routing

**Key Deliverables:**
- `wrangler.toml` with three environment sections (default = dev, staging, production)
- Environment-specific bindings (database URL, API keys, etc.)
- Secrets configured via `wrangler secret put` (never committed to git)
- Custom routes for staging and production:
  - Staging: `staging-api.sherpalabs.dev`
  - Production: `api.sherpalabs.dev`
- Deploy commands documented for each environment
- GitHub Actions workflow for automated staging deploy on push to `develop`

**Expected Outcome:** Clear separation of environments with safe deployment paths.

**Success Criteria:**
- `wrangler deploy --env staging` deploys to staging environment
- `wrangler deploy --env production` deploys to production
- Secrets not visible in git history

**Depends On:** Phase 34

---

## Phase 36 — Database Setup (Neon Postgres + Drizzle ORM)

**Purpose:** Set up the Postgres database that backs the dashboard and API.

**Focus Areas:**
- Neon project creation
- Drizzle ORM integration
- Connection pooling for Workers
- Migration workflow

**Key Deliverables:**
- Two Neon projects created: `sherpa-labs-prod`, `sherpa-labs-staging`
- Connection pooling URL configured (required for Workers)
- Drizzle ORM installed and configured
- Drizzle CLI configured for migrations
- Database connection helper in `apps/api/src/db/connection.ts`
- Connection tested from local dev

**Expected Outcome:** Backend can connect to Neon Postgres from Cloudflare Workers.

**Success Criteria:**
- Test query from local Worker reaches Neon and returns result
- Connection pool reuses connections efficiently
- Staging and production DBs both reachable

**Depends On:** Phase 35

---

## Phase 37 — Database Schema Design & Initial Migrations

**Purpose:** Design and create the initial database schema.

**Focus Areas:**
- Schema design for core entities
- Foreign key relationships
- Indexes for common queries
- Migration tooling

**Key Deliverables:**
- Drizzle schema files in `apps/api/src/db/schema/`:
  - `users` (id, clerk_id, email, name, created_at, updated_at)
  - `workspaces` (id, clerk_org_id, name, owner_id, plan, created_at)
  - `workspace_members` (workspace_id, user_id, role, joined_at)
  - `repos` (id, workspace_id, github_full_name, default_branch, github_pat_encrypted)
  - `audits` (id, repo_id, score, violations_json, file_paths, created_at, source)
  - `canonical_rules` (id, workspace_id, name, content, version, updated_by, updated_at)
  - `subscriptions` (id, user_id, paddle_subscription_id, plan, status, current_period_end)
  - `audit_log` (id, user_id, action, entity_type, entity_id, metadata, created_at)
- Indexes on: `audits(repo_id, created_at DESC)`, `workspace_members(user_id)`, `subscriptions(user_id, status)`
- Initial migration generated and applied to staging
- Migration runbook documented

**Expected Outcome:** Database schema in place, ready for application code.

**Success Criteria:**
- All tables created in Neon
- Foreign keys enforce referential integrity
- Indexes verified via explain plans
- Sample data can be inserted and queried

**Depends On:** Phase 36

---

## Phase 38 — Core API Endpoints (Read-Heavy)

**Purpose:** Implement the read-side API endpoints that the dashboard will use to display data.

**Focus Areas:**
- RESTful route design
- Drizzle queries
- Response shaping
- Error handling

**Key Deliverables:**
- API routes implemented:
  - `GET /api/v1/users/me` — fetch current user
  - `GET /api/v1/workspaces` — list user's workspaces
  - `GET /api/v1/workspaces/:id` — get workspace details
  - `GET /api/v1/workspaces/:id/members` — list workspace members
  - `GET /api/v1/workspaces/:id/repos` — list workspace repos
  - `GET /api/v1/repos/:id` — get repo details
  - `GET /api/v1/repos/:id/audits` — list audits for a repo (paginated)
  - `GET /api/v1/audits/:id` — get audit details
- Consistent response envelope: `{ data: T } | { error: { code, message } }`
- Pagination via cursor-based approach
- 404 / 403 / 401 errors returned with appropriate codes

**Expected Outcome:** All read endpoints needed by the dashboard exist and return correct data.

**Success Criteria:**
- Endpoints tested via curl/httpie with seeded data
- Pagination works correctly
- Errors return appropriate status codes
- Response shapes documented

**Depends On:** Phase 37

---

## Phase 39 — Rate Limiting & Abuse Prevention

**Purpose:** Protect the API from abuse, runaway scripts, and DoS attempts.

**Focus Areas:**
- Cloudflare Workers Rate Limiting API
- Per-user limits
- Per-IP fallback limits
- Abuse detection patterns

**Key Deliverables:**
- Rate limiting configured via Cloudflare Workers Rate Limiting:
  - Authenticated users: tier-based (free: 100/hour, Pro: 500/hour, Team: 2000/hour)
  - Unauthenticated: 60/minute per IP
- 429 responses include `Retry-After` header and clear messaging
- Abuse signals tracked: identical payloads, rapid bursts, malformed requests
- Optional hCaptcha integration ready for signup flow
- Rate limit middleware in Hono app
- Documentation of limits in `docs/RATE_LIMITS.md`

**Expected Outcome:** API stable under abuse attempts. No surprise infrastructure costs.

**Success Criteria:**
- Burst of 200 requests in 60 seconds from single user gets rate limited
- 429 response includes useful retry guidance
- Authenticated users see higher limits than anonymous

**Depends On:** Phase 38

---

## Phase 40 — Logging, Error Handling & Observability Foundation

**Purpose:** Set up logging and structured error handling that will make debugging production issues feasible.

**Focus Areas:**
- Structured logging
- Error catching middleware
- Request ID tracking
- Error categorization

**Key Deliverables:**
- Structured logger emitting JSON in production, pretty output in dev
- Global error handler middleware catching unhandled exceptions
- Request ID middleware generating unique ID per request (returned in response header)
- Error categorization: `validation_error`, `not_found`, `unauthorized`, `forbidden`, `rate_limited`, `internal_error`
- Worker-friendly logging (no console.log, use proper logger)
- Sensitive data redaction in logs (no PATs, tokens, secrets)
- Error responses include request ID for support reference

**Expected Outcome:** Production errors are debuggable from logs alone.

**Success Criteria:**
- Logs include request ID and structured fields
- Unhandled errors don't leak stack traces in production
- No PII or secrets visible in logs

**Depends On:** Phase 39

---

# STAGE G — AUTHENTICATION & USERS

---

## Phase 41 — Clerk Project Setup

**Purpose:** Set up Clerk for authentication. Choose Clerk because of best DX, native Organizations support, and generous free tier.

**Focus Areas:**
- Clerk account and application creation
- Auth providers configuration
- Organizations enablement
- Domain configuration

**Key Deliverables:**
- Clerk accounts created for two environments: `sherpa-labs-staging`, `sherpa-labs-prod`
- Authentication methods enabled:
  - GitHub OAuth (primary)
  - Email/password (fallback)
  - Magic link (optional)
- Clerk Organizations feature enabled (maps to workspaces in our model)
- Allowed redirect URLs configured for staging and production
- API keys captured (publishable + secret) and stored as Wrangler secrets
- Webhook signing secret configured

**Expected Outcome:** Clerk projects ready for integration.

**Success Criteria:**
- Sign-in with GitHub completes in Clerk dashboard test
- Organizations can be created in test mode
- API keys present in Wrangler secrets

**Depends On:** Phase 40

---

## Phase 42 — Clerk Integration in Next.js Dashboard

**Purpose:** Wire Clerk into the dashboard for sign-in, sign-up, and session management.

**Focus Areas:**
- Clerk Next.js SDK integration
- Provider setup at app root
- Middleware for protected routes
- Sign-in / sign-up pages

**Key Deliverables:**
- `@clerk/nextjs` installed in `apps/web`
- `<ClerkProvider>` at the root layout
- Middleware in `apps/web/src/middleware.ts` protecting `/dashboard/*` routes
- Sign-in page at `/sign-in`
- Sign-up page at `/sign-up`
- Sign-out function wired
- Redirect after sign-in to `/dashboard`

**Expected Outcome:** Users can sign in, sign out, and access protected routes.

**Success Criteria:**
- GitHub sign-in flow completes successfully
- Unauthenticated access to `/dashboard` redirects to sign-in
- Session persists across page reloads

**Depends On:** Phase 41 (note: depends on Phase 47 dashboard scaffold but those can be parallelized; sequence as G-then-H or interleave)

---

## Phase 43 — JWT Validation Middleware in API

**Purpose:** Validate Clerk JWT tokens on every API request, identifying the user.

**Focus Areas:**
- JWT verification using Clerk's JWKS
- User extraction from token
- Middleware integration
- Unauthorized response handling

**Key Deliverables:**
- Middleware in `apps/api/src/middleware/auth.ts` that:
  - Extracts JWT from `Authorization: Bearer <token>` header
  - Verifies signature using Clerk JWKS endpoint (cached)
  - Extracts user_id, email from token claims
  - Attaches user context to request
  - Returns 401 on invalid/missing token
- JWKS caching with reasonable TTL (1 hour)
- Bypass for public endpoints (e.g., health check)

**Expected Outcome:** API knows who is making each request.

**Success Criteria:**
- Valid JWT request succeeds with user context attached
- Invalid JWT returns 401
- Missing JWT on protected routes returns 401
- Public routes accessible without JWT

**Depends On:** Phase 41

---

## Phase 44 — User Sync (Clerk → Database)

**Purpose:** On first sign-in, create a corresponding row in our `users` table linked to the Clerk user ID.

**Focus Areas:**
- Clerk webhook integration
- Idempotent user creation
- User profile syncing

**Key Deliverables:**
- Webhook endpoint at `POST /api/v1/webhooks/clerk`
- Webhook signature verification
- Event handlers for:
  - `user.created` — create user row in DB
  - `user.updated` — sync email and name
  - `user.deleted` — mark user as deleted in DB
  - `organization.created` — create workspace row
  - `organization.updated` — sync workspace name
  - `organizationMembership.created` — create workspace_member row
  - `organizationMembership.updated` — update role
  - `organizationMembership.deleted` — remove workspace_member row
- Idempotent handlers (safe to receive same event twice)
- Just-in-time sync fallback: if API request comes from a user not yet in DB, create them on the spot

**Expected Outcome:** Our database always knows about every Clerk user and organization.

**Success Criteria:**
- Signing up creates user in DB within 5 seconds
- Creating organization creates workspace
- Adding member creates workspace_member row

**Depends On:** Phase 43

---

## Phase 45 — Workspace / Organization Mapping

**Purpose:** Ensure Clerk Organizations and our Workspace concept stay in sync.

**Focus Areas:**
- Organization → workspace mapping
- Member → workspace_member mapping
- Workspace switching
- Default workspace for new users

**Key Deliverables:**
- Mapping helpers in `apps/api/src/services/workspaces.ts`:
  - `getOrCreateWorkspace(clerkOrgId)` — idempotent workspace creation
  - `syncMembership(clerkUserId, clerkOrgId, role)` — sync membership state
- On first sign-up, automatically create a personal workspace
- Workspace switcher UI in dashboard (uses Clerk's OrganizationSwitcher)
- Active workspace stored in user's session

**Expected Outcome:** Every user always has at least one workspace.

**Success Criteria:**
- New user has a personal workspace immediately after sign-up
- Workspace switching works in dashboard
- API requests use the active workspace context

**Depends On:** Phase 44

---

## Phase 46 — Roles & Permissions System

**Purpose:** Implement role-based access control for workspace operations.

**Focus Areas:**
- Role definitions
- Permission checking
- API enforcement
- UI gating

**Key Deliverables:**
- Three roles defined: `owner`, `admin`, `member`
- Permission matrix:
  - `owner`: billing, delete workspace, all admin permissions
  - `admin`: manage members, edit canonical rules, all member permissions
  - `member`: read everything, run audits
- Permission helper: `canPerform(userId, action, workspaceId)` in API
- Middleware enforcing permissions on protected endpoints
- UI gating: buttons/pages hidden for users without permission
- Insufficient permission returns 403 with clear message

**Expected Outcome:** Roles enforced consistently across API and UI.

**Success Criteria:**
- Member cannot edit canonical rules (403)
- Admin cannot access billing (403)
- Owner can do everything
- UI doesn't show buttons users can't use

**Depends On:** Phase 45

---

# STAGE H — DASHBOARD WEB APP

---

## Phase 47 — Next.js 14 App Router Setup

**Purpose:** Scaffold the Next.js dashboard application.

**Focus Areas:**
- Next.js 14 with App Router
- TypeScript configuration
- Folder structure for routing

**Key Deliverables:**
- `apps/web/` initialized with Next.js 14 App Router
- TypeScript strict mode
- Folder structure:
  - `src/app/` — routes
  - `src/components/` — shared components
  - `src/lib/` — utilities, API client
  - `src/hooks/` — custom hooks
- Path aliases configured (`@/components`, `@/lib`, etc.)
- Sample home page rendering

**Expected Outcome:** Next.js dashboard scaffold ready for layout and pages.

**Success Criteria:**
- `pnpm dev` starts dashboard at localhost:3000
- TypeScript compiles
- Sample page renders

**Depends On:** Phase 6

---

## Phase 48 — Tailwind CSS + shadcn/ui Integration

**Purpose:** Set up Tailwind and install shadcn/ui base components.

**Focus Areas:**
- Tailwind CSS configuration
- shadcn/ui CLI setup
- Base component installation
- Theme tokens

**Key Deliverables:**
- Tailwind CSS installed and configured
- Tailwind config with brand color palette from Phase 4
- shadcn/ui CLI initialized
- Base components installed: Button, Card, Input, Label, Table, Dialog, Dropdown, Tabs, Toast, Skeleton, Avatar, Badge, Separator
- Global styles file with CSS variables for theming
- Dark mode setup with class strategy

**Expected Outcome:** Component library ready to compose UIs from.

**Success Criteria:**
- All shadcn/ui components render
- Tailwind classes work
- Custom brand colors usable via Tailwind

**Depends On:** Phase 47

---

## Phase 49 — Layout Shell (Sidebar + Main + Topbar)

**Purpose:** Build the persistent layout structure that wraps all dashboard pages.

**Focus Areas:**
- Sidebar navigation
- Top bar (user menu, workspace switcher)
- Main content area
- Responsive behavior

**Key Deliverables:**
- Sidebar component with:
  - Workspace switcher at top
  - Main nav links: Dashboard, Repos, Rules, Members, Settings
  - Collapsible on small screens
  - User profile at bottom
- Top bar with:
  - Breadcrumbs
  - Quick actions
  - User menu (Clerk's UserButton)
- Main content area with proper padding and max-width
- Mobile responsive: sidebar collapses to drawer
- Persistent layout in `app/dashboard/layout.tsx`

**Expected Outcome:** Consistent shell across all dashboard pages.

**Success Criteria:**
- Sidebar visible on all dashboard routes
- Navigation links work
- Mobile drawer slides in correctly

**Depends On:** Phase 48

---

## Phase 50 — Dark Mode Implementation

**Purpose:** Implement complete dark mode toggle that respects user preference and system setting.

**Focus Areas:**
- Theme provider
- System preference detection
- Persistent user choice
- Component coverage

**Key Deliverables:**
- Theme provider context: light / dark / system
- System preference detection via `prefers-color-scheme`
- User preference stored in localStorage and synced to user settings
- Theme toggle in settings page
- Every component reviewed for dark mode support
- Charts and visualizations adapt to dark mode
- Brand colors have dark mode variants

**Expected Outcome:** Complete dark mode that looks intentional.

**Success Criteria:**
- Theme toggle works without page reload
- System theme change updates app theme
- All pages look correct in both modes

**Depends On:** Phase 49

---

## Phase 51 — Auth Pages (Sign-in / Sign-up)

**Purpose:** Build sign-in and sign-up pages styled to match dashboard branding.

**Focus Areas:**
- Clerk UI customization
- Branded sign-in page
- Sign-up flow
- Error handling

**Key Deliverables:**
- Sign-in page at `/sign-in` with Clerk's `<SignIn>` component customized
- Sign-up page at `/sign-up` with `<SignUp>` component
- Custom appearance prop styled to match brand
- "Continue with GitHub" prominent
- Error messages styled consistently
- Post-signup redirect to `/dashboard`
- Marketing hero side panel on auth pages with product value props

**Expected Outcome:** Auth experience is on-brand and conversion-optimized.

**Success Criteria:**
- Sign-in completes in under 5 seconds
- Custom styling visible
- Errors readable and helpful

**Depends On:** Phase 50, Phase 42

---

## Phase 52 — Dashboard Home & Workspace Selector

**Purpose:** Build the landing page after sign-in: workspace overview and quick stats.

**Focus Areas:**
- Workspace overview cards
- Quick stats
- Recent activity
- Empty states

**Key Deliverables:**
- `/dashboard` page shows:
  - Active workspace name and member count
  - Quick stats: total repos, recent audits, average score
  - Recent audits list (last 5)
  - "Connect a repo" CTA if no repos
- Workspace switcher in sidebar (uses Clerk's OrganizationSwitcher)
- Loading states for all sections
- Empty state for brand new users

**Expected Outcome:** Users land on dashboard and immediately see their data.

**Success Criteria:**
- All sections render with seeded data
- Empty state shows for new users
- Workspace switching changes displayed data

**Depends On:** Phase 51

---

## Phase 53 — Workspace Overview Page

**Purpose:** Detailed workspace overview with all repos and aggregate metrics.

**Focus Areas:**
- Repo list with status
- Workspace-level metrics
- Filter and sort

**Key Deliverables:**
- `/dashboard/[workspaceId]` page with:
  - Workspace name and metadata
  - Aggregate score trend chart (last 30 days)
  - Repo table with: name, last audit score, last audit date, trend arrow
  - Filter by score range, sort by name/date/score
  - "Connect Repo" button
- Pagination for workspaces with many repos
- Empty state if no repos connected

**Expected Outcome:** Workspace-level visibility into all rules quality across repos.

**Success Criteria:**
- Repo table loads in under 1 second
- Filters and sorting work
- Trend chart renders correctly

**Depends On:** Phase 52

---

## Phase 54 — Workspace Settings Page

**Purpose:** Workspace-level settings for admins and owners.

**Focus Areas:**
- Workspace name editing
- Default thresholds
- Workspace deletion
- Branding (optional, Pro+)

**Key Deliverables:**
- `/dashboard/[workspaceId]/settings` page with sections:
  - General: workspace name, description
  - Audit defaults: minimum score threshold, severity overrides
  - Notifications: Slack/Discord webhook URLs (Phase 105+)
  - Danger zone: delete workspace (with confirmation)
- Role-based visibility (owner sees all, admin sees most, member read-only)
- Save buttons with optimistic updates
- Toast notifications for save success/failure

**Expected Outcome:** Workspace fully manageable from settings.

**Success Criteria:**
- All settings save correctly
- Role permissions enforced
- Deletion requires confirmation typing

**Depends On:** Phase 53

---

## Phase 55 — Account Settings Page

**Purpose:** User-level settings page.

**Focus Areas:**
- Profile management
- Email preferences
- API tokens
- Account deletion

**Key Deliverables:**
- `/account` page with:
  - Profile section (name, email via Clerk)
  - API tokens section: generate, list, revoke personal access tokens
  - Email preferences: weekly digest, security alerts
  - Theme preference
  - Language preference (after Stage Q)
  - Delete account button (cascade delete in DB, then Clerk delete)
- API token shown only once on generation (security best practice)

**Expected Outcome:** Users have full control of their account.

**Success Criteria:**
- All settings persist
- API token generation works
- Delete account fully removes data

**Depends On:** Phase 54

---

## Phase 56 — Loading States & Empty States Everywhere

**Purpose:** Polish the empty and loading experience across all pages.

**Focus Areas:**
- Skeleton loaders
- Empty state components
- Error states
- Optimistic updates

**Key Deliverables:**
- Skeleton loaders for: tables, cards, charts, lists
- Empty states with illustrations and CTAs for: no repos, no audits, no members
- Error boundaries on all pages
- Error state UI with retry button
- Optimistic UI updates for common actions
- Suspense boundaries where appropriate

**Expected Outcome:** App feels polished even with no data or slow networks.

**Success Criteria:**
- Loading states visible during data fetches
- Empty states helpful, not blank
- Errors recoverable, not dead-ends

**Depends On:** Phase 55

---

## Phase 57 — Mobile Responsive Polish

**Purpose:** Make dashboard usable on mobile devices for read-only access.

**Focus Areas:**
- Sidebar drawer behavior
- Table responsiveness
- Touch targets
- Mobile-specific layouts

**Key Deliverables:**
- Sidebar becomes drawer below 768px
- Tables reflow to cards on mobile
- Touch targets ≥ 44px
- Mobile-optimized navigation
- Test on iOS Safari, Chrome Android, Samsung Internet

**Expected Outcome:** Dashboard functional on phones for monitoring purposes.

**Success Criteria:**
- All pages usable on iPhone 12 viewport
- No horizontal scrolling
- Touch interactions work

**Depends On:** Phase 56

---

## Phase 58 — 404 / 500 Error Pages

**Purpose:** Build branded error pages that handle edge cases gracefully.

**Focus Areas:**
- 404 page
- 500 page
- App-level error boundary

**Key Deliverables:**
- `not-found.tsx` at app root with helpful message and navigation back
- `error.tsx` for app-level error boundary
- Custom 404 page for `/dashboard` routes too
- Error pages include support contact and request ID

**Expected Outcome:** Errors are friendly, not scary.

**Success Criteria:**
- Visiting non-existent route shows 404 page
- Server errors show 500 page (not raw stack trace)
- Both pages include way to recover

**Depends On:** Phase 57

---

# STAGE I — REPO CONNECTION & CLOUD SYNC

---

## Phase 59 — GitHub PAT Collection Flow

**Purpose:** Build the UI for users to provide their GitHub Personal Access Token to connect repos.

**Focus Areas:**
- PAT collection UI
- Permission explanation
- Validation
- Storage

**Key Deliverables:**
- Modal or page at `/dashboard/[workspaceId]/repos/connect` with:
  - Clear explanation of what PAT will be used for
  - List of required scopes (initially: `repo` for read access)
  - Link to GitHub PAT creation page with pre-filled scope
  - Input field for PAT
  - Validation: PAT format check, then GitHub API verification call
- Success state shows "Repos connected" with list
- Error state for invalid token

**Expected Outcome:** Users can connect their GitHub via PAT with clear consent.

**Success Criteria:**
- Valid PAT verified successfully
- Invalid PAT shows clear error
- User can see which repos will be accessible

**Depends On:** Phase 58

---

## Phase 60 — PAT Encryption & Secure Storage

**Purpose:** Store GitHub PATs encrypted at rest. Never plaintext.

**Focus Areas:**
- Encryption key management
- AES-256-GCM encryption
- Decrypt-on-use pattern
- Secret rotation strategy

**Key Deliverables:**
- Encryption helper using Web Crypto API in Worker
- Encryption key stored as Wrangler secret
- PATs encrypted before insertion into DB
- Decryption only at point of use (e.g., when calling GitHub API)
- Audit logging when PATs are accessed
- Key rotation procedure documented in `docs/SECURITY.md`

**Expected Outcome:** PATs are never visible in DB dumps or logs.

**Success Criteria:**
- DB row contains ciphertext, never plaintext
- Worker logs don't contain decrypted PATs
- Encryption tested with sample data

**Depends On:** Phase 59

---

## Phase 61 — Repo Connection API Endpoint

**Purpose:** Backend endpoint to register a new repo connection.

**Focus Areas:**
- Repo metadata fetch from GitHub
- DB insertion with encrypted PAT
- Validation
- Error handling

**Key Deliverables:**
- `POST /api/v1/workspaces/:id/repos` endpoint:
  - Validates PAT against GitHub API
  - Fetches repo metadata (default branch, name)
  - Encrypts PAT
  - Inserts row in `repos` table
  - Returns repo summary
- `DELETE /api/v1/repos/:id` endpoint for disconnection
- Errors for: invalid PAT, repo not found, already connected, no permission

**Expected Outcome:** Users can connect/disconnect repos via API.

**Success Criteria:**
- Connecting valid repo creates DB row
- Disconnecting removes row
- Duplicate connection prevented
- Errors handled with clear messages

**Depends On:** Phase 60

---

## Phase 62 — CLI `sherpa login` Command

**Purpose:** Authenticate the CLI to the cloud backend so audits can sync.

**Focus Areas:**
- Login flow design
- Token generation
- Local credential storage
- Logout

**Key Deliverables:**
- `sherpa login` command:
  - Opens browser to dashboard `/cli-auth` page
  - User signs in (or already signed in)
  - Dashboard generates a CLI token, displays it
  - User pastes token back into CLI
  - CLI stores token at `~/.config/sherpa/credentials` with mode 600
- Alternative: device flow (poll endpoint) — more polished but more complex
- `sherpa logout` removes the credential file
- `sherpa whoami` shows currently logged-in user

**Expected Outcome:** Users can authenticate CLI in under a minute.

**Success Criteria:**
- Login flow completes end-to-end
- Token stored with correct permissions
- Logout clears state
- Whoami displays user info

**Depends On:** Phase 61

---

## Phase 63 — CLI `sherpa audit --sync` Flag

**Purpose:** Send local audit results to the cloud for storage.

**Focus Areas:**
- Audit submission
- Repo matching
- Network resilience
- Error handling

**Key Deliverables:**
- `sherpa audit --sync` flag enables submission
- Submits audit result via API with stored CLI token
- Repo matching: detects current repo from git remote, looks up by `github_full_name`
- If repo not connected: prompt user to connect via dashboard, give link
- Network failure: cache audit locally and retry later
- Successful sync shows audit URL on dashboard

**Expected Outcome:** Audits run from CLI flow into the dashboard automatically.

**Success Criteria:**
- Audit submitted appears in dashboard within 5 seconds
- Repo not connected → clear instructions to user
- Network failure → graceful retry

**Depends On:** Phase 62

---

## Phase 64 — Audit Submission API

**Purpose:** Backend endpoint to receive and store audit results.

**Focus Areas:**
- Endpoint design
- Validation
- Storage
- Quota checking

**Key Deliverables:**
- `POST /api/v1/audits` endpoint:
  - Validates CLI token
  - Validates audit payload (score, violations, file_paths)
  - Checks subscription quota (free tier: 50/month)
  - Inserts audit row linked to repo
  - Returns audit ID and dashboard URL
- Quota exceeded → 402 Payment Required with upgrade message
- Idempotency key support to prevent duplicates

**Expected Outcome:** Audits stored and retrievable via dashboard.

**Success Criteria:**
- Valid audit submission stored in DB
- Quota enforcement works
- Idempotency prevents duplicates

**Depends On:** Phase 63

---

## Phase 65 — Repo Detail Page (Basic Audit List)

**Purpose:** Display audit history for a connected repo.

**Focus Areas:**
- Audit list table
- Audit detail view
- Quick actions

**Key Deliverables:**
- `/dashboard/[workspaceId]/repos/[repoId]` page with:
  - Repo metadata at top
  - Audit history table: date, score, violations count, source (CLI / GitHub App)
  - "Audit Now" button (queues a server-side audit, if implementation chosen)
  - "View Details" per audit → expanded view with full violations
- Pagination for repos with many audits
- Empty state for newly connected repos

**Expected Outcome:** Users can see audit history per repo.

**Success Criteria:**
- Audit history displays in correct order
- Detail view shows all violations
- Pagination works

**Depends On:** Phase 64

---

# STAGE J — AUDIT VISUALIZATION

---

## Phase 66 — Recharts Setup

**Purpose:** Set up Recharts for chart rendering throughout the dashboard.

**Focus Areas:**
- Recharts installation
- Theme integration
- Shared chart components
- Performance optimization

**Key Deliverables:**
- Recharts installed in `apps/web`
- Shared chart wrappers in `apps/web/src/components/charts/`
- Theme-aware colors that work in light and dark mode
- Loading and error states for charts
- Responsive container wrapping

**Expected Outcome:** Charts ready to use throughout the dashboard.

**Success Criteria:**
- Sample chart renders in dashboard
- Theme colors update with dark mode
- No performance jank on resize

**Depends On:** Phase 65

---

## Phase 67 — Score-Over-Time Line Chart

**Purpose:** Visualize how a repo's audit score has changed over time.

**Focus Areas:**
- Line chart component
- Time range selectors
- Hover tooltips
- Empty state

**Key Deliverables:**
- Line chart on repo detail page showing score over time
- Time range filter: 7 days, 30 days, 90 days, all-time
- Hover tooltip showing exact score and date
- Annotations for significant changes
- Smooth empty state for repos with < 3 audits

**Expected Outcome:** Users see trend at a glance.

**Success Criteria:**
- Chart renders correctly with 0, 1, 5, 30, 100 data points
- Time range filter updates chart
- Tooltips show on hover

**Depends On:** Phase 66

---

## Phase 68 — Violation Breakdown Charts

**Purpose:** Show distribution of violation types per repo.

**Focus Areas:**
- Bar chart for violation counts
- Pie chart for violation types
- Category groupings
- Drill-down navigation

**Key Deliverables:**
- Bar chart showing violation counts by severity (errors, warnings, info)
- Pie chart showing violation distribution by category (token budget, conflicts, vague rules, etc.)
- Click violation type → filter audit history to that violation
- Responsive sizing on mobile

**Expected Outcome:** Users understand what types of issues recur in their rules.

**Success Criteria:**
- Charts accurately reflect violation data
- Click interaction filters audit list
- Empty state when no violations

**Depends On:** Phase 67

---

## Phase 69 — Per-Repo & Per-Workspace Comparison Views

**Purpose:** Allow users to compare audit performance across multiple repos.

**Focus Areas:**
- Multi-repo trend chart
- Sortable comparison table
- Workspace-level aggregates

**Key Deliverables:**
- Workspace-level chart showing average score across all repos over time
- Comparison table on workspace overview: repo name, current score, 30-day trend, last audit
- Sortable by any column
- Color-coded score badges

**Expected Outcome:** Workspace admins can identify which repos need attention.

**Success Criteria:**
- Comparison renders correctly
- Sorting works across all columns
- Color coding consistent

**Depends On:** Phase 68

---

## Phase 70 — Insights Generation

**Purpose:** Automatically generate textual insights based on audit data ("Your score improved by 12 points this week").

**Focus Areas:**
- Insight calculation
- Insight prioritization
- Display in dashboard

**Key Deliverables:**
- Insight engine generating:
  - Score change insights ("Your squat rules improved 12 points")
  - Regression insights ("Score dropped 8 points in last week")
  - Pattern insights ("Most common violation: token budget overrun")
  - Comparison insights ("This repo scores 15 points higher than workspace average")
- Insights displayed as cards on dashboard
- Dismissible insights (won't show again for 30 days)

**Expected Outcome:** Users see proactive insights without having to dig into data.

**Success Criteria:**
- Insights factually accurate
- Top insights surface naturally
- Dismissal persists

**Depends On:** Phase 69

---

# STAGE K — TEAM SYNC FEATURE (THE KEY PAID FEATURE)

---

## Phase 71 — Canonical Rules Data Model

**Purpose:** Store team-wide canonical rules in the database.

**Focus Areas:**
- Data model
- Version tracking
- Multiple rule sets per workspace

**Key Deliverables:**
- `canonical_rules` table populated with:
  - id, workspace_id, name, content, version, updated_by, updated_at
- Multiple named rules per workspace (e.g., "Frontend CLAUDE.md", "Backend CLAUDE.md")
- Version tracking: every save creates a new version, never overwrites
- "Current" version flag per rule set

**Expected Outcome:** Teams can have multiple canonical rule sets, each versioned.

**Success Criteria:**
- Multiple rules per workspace
- Version history queryable
- Current version always identifiable

**Depends On:** Phase 46

---

## Phase 72 — Canonical Rules Editor UI

**Purpose:** Build the in-dashboard editor for team canonical rules.

**Focus Areas:**
- Markdown editor
- Live audit
- Save and version

**Key Deliverables:**
- `/dashboard/[workspaceId]/rules` page with:
  - List of canonical rule sets
  - "New rule set" button
  - Click rule set → editor view
- Editor with:
  - Markdown editing (CodeMirror or Monaco)
  - Live audit panel showing score and violations as user types
  - Save button creates new version
  - Version history sidebar
  - Diff view between versions
- Confirmation before save: "This will become the new canonical version."

**Expected Outcome:** Team admins can author and refine canonical rules with live feedback.

**Success Criteria:**
- Editor saves correctly
- Live audit updates as user types
- Version history accurate

**Depends On:** Phase 71

---

## Phase 73 — Version History for Rules

**Purpose:** Browse, compare, and revert to previous versions of canonical rules.

**Focus Areas:**
- Version list UI
- Diff view
- Revert action

**Key Deliverables:**
- Version history panel showing all versions with timestamps and authors
- Click version → side-by-side diff with current
- Revert button restores previous version (creates new version equal to old)
- Permission: only admin/owner can revert

**Expected Outcome:** Mistakes can be undone; history is auditable.

**Success Criteria:**
- All versions listed correctly
- Diffs show accurately
- Revert creates new version, doesn't delete current

**Depends On:** Phase 72

---

## Phase 74 — CLI `sherpa sync` Command

**Purpose:** Pull canonical rules from workspace to local repo.

**Focus Areas:**
- Sync command implementation
- Authentication
- File writing
- Backup

**Key Deliverables:**
- `sherpa sync` command in CLI
- Requires login (uses stored CLI token)
- Auto-detects workspace from connected repo (via git remote)
- Pulls current canonical version of all rule sets
- Default mode prompts before overwriting
- Backup created before any overwrite

**Expected Outcome:** Devs can pull team rules with one command.

**Success Criteria:**
- Sync completes in < 3 seconds
- Local file updated correctly
- Backup file created

**Depends On:** Phase 73, Phase 62

---

## Phase 75 — Sync Modes (overwrite / merge / check)

**Purpose:** Support different sync strategies for different use cases.

**Focus Areas:**
- Overwrite mode (default for fresh setup)
- Merge mode (interactive)
- Check mode (CI use case)

**Key Deliverables:**
- `--mode=overwrite` replaces local file
- `--mode=merge` opens interactive 3-way merge (or shows conflicts)
- `--mode=check` exits 1 if local differs from canonical (perfect for CI)
- Documentation for each mode
- Test cases for each mode

**Expected Outcome:** Sync flexible enough for any team workflow.

**Success Criteria:**
- All three modes tested with sample scenarios
- CI integration example documented
- Errors handled gracefully

**Depends On:** Phase 74

---

## Phase 76 — Diff Preview for Sync

**Purpose:** Show user what will change before applying sync.

**Focus Areas:**
- Diff calculation
- Terminal diff rendering
- Confirmation prompt

**Key Deliverables:**
- Before applying sync, show line-by-line diff in terminal
- Colored diff output (red for removed, green for added)
- Summary: N lines added, N lines removed
- Confirmation prompt: "Apply this change? (y/N)"
- `--yes` flag to skip prompt for automation

**Expected Outcome:** No surprise overwrites; users see exactly what changes.

**Success Criteria:**
- Diff matches actual change
- Colors readable on both terminals
- Confirmation works

**Depends On:** Phase 75

---

## Phase 77 — CI Integration for Rule Drift Detection

**Purpose:** Provide GitHub Action / CI template that enforces canonical rules in PRs.

**Focus Areas:**
- GitHub Action template
- CI workflow example
- PR comment integration

**Key Deliverables:**
- GitHub Action template using `sherpa sync --mode=check`
- Workflow example posted on docs
- PR comment posted if drift detected:
  - "Rule drift detected: your local CLAUDE.md differs from canonical."
  - "Run `sherpa sync` to fix."
- Commit status check
- Documentation: how to add to existing repos

**Expected Outcome:** Teams can enforce rule consistency in CI.

**Success Criteria:**
- Sample workflow runs successfully
- Drift detection accurate
- PR comment posts on drift

**Depends On:** Phase 76

---

# STAGE L — MONETIZATION (PADDLE)

---

## Phase 78 — Paddle Account Verification & Activation

**Purpose:** Complete Paddle account setup (KYC started in Phase 4 should be done by now).

**Focus Areas:**
- KYC completion
- Bank account linking
- Sandbox vs production environments
- API key generation

**Key Deliverables:**
- Paddle KYC fully approved
- Indian bank account linked for INR payouts
- API keys generated for both sandbox and production
- Webhook endpoint registered (will be implemented in Phase 84)
- Test purchase made in sandbox to verify flow

**Expected Outcome:** Paddle ready to accept payments.

**Success Criteria:**
- Sandbox test purchase completes
- API keys work
- Bank account confirmed

**Depends On:** Phase 4 (KYC initiated long ago)

---

## Phase 79 — Products & Pricing Setup in Paddle

**Purpose:** Create the catalog of products and prices in Paddle's dashboard.

**Focus Areas:**
- Product taxonomy
- Pricing tiers
- Per-currency pricing
- Trial configuration

**Key Deliverables:**
- Products created in Paddle:
  - `sherpa-pro-individual` with two prices: monthly $9, annual $90
  - `sherpa-pro-team` with two prices: monthly $49, annual $490
  - Per-seat add-on for Team: $7/seat/month above 5 seats
- Currency overrides for India:
  - Individual: ₹499/month, ₹4,990/year
  - Team: ₹2,999/month, ₹29,990/year
- 14-day trial enabled on Team annual plan
- Product IDs and price IDs saved to environment variables

**Expected Outcome:** Catalog complete and ready for checkout integration.

**Success Criteria:**
- All products and prices visible in Paddle dashboard
- Currency conversion correct
- Trial enabled

**Depends On:** Phase 78

---

## Phase 80 — India Pricing Tier Configuration

**Purpose:** Ensure India-specific pricing flows correctly through Paddle's Razorpay rails.

**Focus Areas:**
- India geo detection
- Currency display
- Payment method preferences (UPI, cards)
- Tax handling

**Key Deliverables:**
- India geo detection in dashboard using Cloudflare's `cf-ipcountry` header
- India users shown ₹ pricing automatically
- UPI listed as primary payment method for India
- Tax (GST) handled by Paddle as Merchant of Record
- Test purchase from India IP to verify flow

**Expected Outcome:** Indian users see localized pricing and pay via UPI/cards.

**Success Criteria:**
- India IP shows ₹ pricing
- UPI checkout works
- GST handled correctly by Paddle

**Depends On:** Phase 79

---

## Phase 81 — Paddle.js Client Integration

**Purpose:** Integrate Paddle's frontend checkout overlay into the dashboard.

**Focus Areas:**
- Paddle.js library
- Checkout opening
- Customer information passing
- Custom data attribution

**Key Deliverables:**
- Paddle.js loaded in dashboard
- Initialized with production token
- Helper function to open checkout for a given price ID
- Customer info pre-filled from Clerk user data
- Custom data passed to webhook: user_id, workspace_id
- Success and close callbacks wired

**Expected Outcome:** Checkout overlay opens and processes payment.

**Success Criteria:**
- Checkout opens cleanly
- User info pre-filled
- Sandbox test purchase completes

**Depends On:** Phase 80

---

## Phase 82 — Pricing Page UI

**Purpose:** Build the public pricing page that drives conversions.

**Focus Areas:**
- Pricing table design
- Monthly/annual toggle
- Geo-aware display
- Trust signals

**Key Deliverables:**
- `/pricing` page accessible publicly (and from dashboard)
- Three columns: Free, Pro Individual ($9), Team ($49)
- Monthly/Annual toggle with "Save 17%" indicator
- Geo-aware: India users see ₹ pricing
- Feature comparison checklist per tier
- Trust signals:
  - "30-day money-back guarantee"
  - "Cancel anytime"
  - "Trusted by N teams" (only when real)
- FAQ section
- "Compare plans" detailed table

**Expected Outcome:** Compelling pricing page that drives trial sign-ups.

**Success Criteria:**
- Page Lighthouse score ≥ 95
- Currency auto-detects
- Checkout opens from CTAs

**Depends On:** Phase 81

---

## Phase 83 — Checkout Flow Integration

**Purpose:** Wire all checkout entry points to Paddle.

**Focus Areas:**
- "Upgrade" buttons throughout dashboard
- Trial-to-paid flow
- Plan change flow
- Cancel flow

**Key Deliverables:**
- Upgrade button in sidebar opens Paddle checkout
- Upgrade prompts at gate points (e.g., free tier limit hit)
- Plan change from current tier to higher tier
- Cancel flow links to Paddle's customer portal
- Post-checkout success page

**Expected Outcome:** Multiple paths to upgrade, all working smoothly.

**Success Criteria:**
- Upgrade flow completes in < 5 clicks
- Subscription activates after webhook
- Cancel works via customer portal

**Depends On:** Phase 82

---

## Phase 84 — Paddle Webhook Handler

**Purpose:** Receive Paddle webhook events and update subscription state in DB.

**Focus Areas:**
- Webhook endpoint
- Signature verification
- Event handlers
- Idempotency

**Key Deliverables:**
- `POST /api/v1/webhooks/paddle` endpoint
- Webhook signature verification using `PADDLE_WEBHOOK_SECRET`
- Event handlers for:
  - `subscription.activated`
  - `subscription.canceled`
  - `subscription.updated`
  - `transaction.completed`
  - `transaction.payment_failed`
- Idempotent processing (event ID tracking)
- Audit log of all webhook events
- Failed processing retries automatically

**Expected Outcome:** Subscription state in DB always matches Paddle state.

**Success Criteria:**
- Test webhook events update DB correctly
- Duplicate events not processed twice
- Failed events logged for review

**Depends On:** Phase 83

---

## Phase 85 — Subscription State in Database

**Purpose:** Store and query subscription state efficiently.

**Focus Areas:**
- Subscription model
- Query helpers
- Caching strategy

**Key Deliverables:**
- `subscriptions` table fully populated by webhooks
- Query helpers:
  - `getActiveSubscription(userId)` returns current subscription or null
  - `getEntitlements(userId)` returns feature flags based on plan
- Caching active subscriptions for fast access (Cloudflare Cache API or KV)
- Grace period logic: failed payment → 7-day grace before downgrade

**Expected Outcome:** Subscription status always known and queryable.

**Success Criteria:**
- Active subscription queryable in < 50ms
- Grace period applied correctly
- Cache invalidates on subscription change

**Depends On:** Phase 84

---

## Phase 86 — Entitlement Gating

**Purpose:** Gate features behind subscription tiers in both API and UI.

**Focus Areas:**
- Feature flag definitions
- API enforcement
- UI gating
- Upgrade prompts

**Key Deliverables:**
- Feature flags defined per tier (per the master plan tier table)
- Server-side entitlement check on every relevant API endpoint
- Client-side `useEntitlement(feature)` hook for UI
- Features that hit gates show upgrade prompts (non-aggressive, helpful)
- Upgrade prompts link to /pricing with relevant tier highlighted

**Expected Outcome:** Free tier delivers value; paid features clearly gated.

**Success Criteria:**
- Free user can't sync (sees upgrade prompt)
- Pro Individual can sync but no team features
- Team users have full access
- Downgrade after cancellation removes access

**Depends On:** Phase 85

---

# STAGE M — TRIAL & CUSTOMER PORTAL

---

## Phase 87 — 14-Day Team Trial Flow

**Purpose:** Let new users try the Team tier free for 14 days without entering a credit card.

**Focus Areas:**
- Trial activation
- Trial state in DB
- Conversion prompts
- Trial expiration

**Key Deliverables:**
- "Start 14-day team trial" button on pricing page
- Trial creates subscription row with `status='trialing'`, `trial_end=now+14days`
- All Team features unlocked during trial
- Trial countdown visible in dashboard
- Day 12: "Trial ending soon" prompt
- Day 14: trial expires, downgrade to Free
- User can convert to paid at any time during or after trial

**Expected Outcome:** Frictionless trial drives conversion.

**Success Criteria:**
- Trial starts without credit card
- Features unlock immediately
- Expiration handled gracefully
- Conversion during trial works

**Depends On:** Phase 86

---

## Phase 88 — Customer Portal Integration

**Purpose:** Let users self-serve their subscription management via Paddle's hosted portal.

**Focus Areas:**
- Customer portal link
- Plan change UI
- Cancel flow
- Update payment method

**Key Deliverables:**
- `/billing` page with "Manage Subscription" button → Paddle's customer portal
- Plan information displayed: current tier, next billing date, payment method (masked)
- "Update payment method" link to Paddle
- "Cancel subscription" link to Paddle (with confirmation)
- Post-cancel: subscription remains active until period end, then downgrades

**Expected Outcome:** Users manage their own subscriptions without support tickets.

**Success Criteria:**
- Portal opens correctly
- Plan changes reflected in our DB via webhook
- Cancel keeps access until period end

**Depends On:** Phase 87

---

## Phase 89 — Email Automation Setup (Resend)

**Purpose:** Set up transactional email service for trial sequence and other email comms.

**Focus Areas:**
- Resend account setup
- Domain verification (DKIM, SPF, DMARC)
- Email templates
- Sending API

**Key Deliverables:**
- Resend account created
- Custom domain `sherpalabs.dev` verified with DKIM, SPF, DMARC records
- React Email installed for templating
- Base email layout with brand styling
- Email sending helper in `apps/api/src/services/email.ts`
- Test email sends successfully

**Expected Outcome:** Production-ready email infrastructure.

**Success Criteria:**
- Email arrives in inbox (not spam)
- DKIM signature valid
- Template renders correctly across email clients

**Depends On:** Phase 88

---

## Phase 90 — Trial-Day Email Sequence

**Purpose:** Engage trial users to drive conversion.

**Focus Areas:**
- Email content per day
- Scheduling
- Personalization
- Unsubscribe handling

**Key Deliverables:**
- Email templates and scheduled sends:
  - Day 1: Welcome + getting started checklist
  - Day 3: "Have you connected a repo?" (only if not connected)
  - Day 7: Midpoint recap of usage
  - Day 12: "Trial ending in 2 days — add payment to continue"
  - Day 14: "Trial ended — pick a plan or stay on Free"
  - Day 21 (post-trial): Win-back email if not converted
- Personalization: workspace name, top stat, named CTA
- Plain text, founder-signed tone
- Unsubscribe link in every email
- Sent via Resend cron or Workers Cron Triggers

**Expected Outcome:** Trial-to-paid conversion ≥ 20%.

**Success Criteria:**
- All emails arrive on schedule
- Personalization works
- Conversion tracked

**Depends On:** Phase 89

---

## Phase 91 — Failed Payment & Grace Period Handling

**Purpose:** Handle payment failures gracefully without immediately cutting users off.

**Focus Areas:**
- Failed payment detection (via webhook)
- Grace period
- Retry logic
- Communication

**Key Deliverables:**
- Webhook handler for `transaction.payment_failed` event
- Subscription marked `past_due`, 7-day grace period begins
- User notified via email: "Payment failed, please update card"
- Dashboard banner: "Payment failed — update billing"
- After 7 days without successful payment, subscription downgrades
- Paddle's smart retries handle most failures automatically

**Expected Outcome:** Payment failures don't cause angry users.

**Success Criteria:**
- Grace period applied correctly
- Email sent on failure
- Banner visible in dashboard
- Auto-recovery on successful retry

**Depends On:** Phase 90

---

# STAGE N — GITHUB INTEGRATIONS

---

## Phase 92 — GitHub App Creation

**Purpose:** Create the GitHub App that will run audits on PRs automatically.

**Focus Areas:**
- GitHub App configuration
- Permissions and events
- Installation flow design
- Public app listing

**Key Deliverables:**
- GitHub App created: "Sherpa Labs"
- Permissions:
  - Contents: read (to fetch rule files)
  - Pull requests: write (to comment)
  - Metadata: read
  - Checks: write (for status checks)
- Events subscribed: `pull_request` (opened, synchronize, reopened), `installation`
- App listed publicly on GitHub Marketplace (Free + Paid plans)
- App icon and branding aligned with Sherpa Labs identity
- Setup URL and webhook URL configured for staging and production

**Expected Outcome:** GitHub App live and installable.

**Success Criteria:**
- App visible on GitHub Marketplace
- Test install on a personal repo works
- Webhooks deliver to our endpoint

**Depends On:** Phase 91

---

## Phase 93 — GitHub App Installation Flow

**Purpose:** Smooth UX for users to install the GitHub App and link it to their workspace.

**Focus Areas:**
- Installation initiation
- OAuth callback handling
- Repo selection
- Workspace linking

**Key Deliverables:**
- "Install GitHub App" button in dashboard
- Redirects to GitHub installation page
- Post-install callback handler at `/dashboard/github-callback`
- Installation ID stored linked to workspace
- User selects which repos to enable
- Repos pulled and synced to our `repos` table
- Confirmation: "GitHub App installed — auditing N repos"

**Expected Outcome:** Installation completes in under 2 minutes.

**Success Criteria:**
- Install flow completes end-to-end
- Repos selected during install appear in dashboard
- Installation ID stored correctly

**Depends On:** Phase 92

---

## Phase 94 — PR Webhook Handler

**Purpose:** Process pull_request events from GitHub App.

**Focus Areas:**
- Webhook receiver
- Event filtering
- Rule file detection in PR
- Triggering audit

**Key Deliverables:**
- `POST /api/v1/webhooks/github` endpoint
- Webhook signature verification
- Filter events: only `pull_request.opened`, `pull_request.synchronize`, `pull_request.reopened`
- Check if PR touches files: CLAUDE.md, .cursorrules, AGENTS.md, .cursor/rules/, .windsurfrules, .continue/config.yaml
- If yes, fetch file contents from GitHub API
- Trigger audit (using GitHub App installation token)
- Audit result stored in DB linked to repo + PR

**Expected Outcome:** Every PR touching rule files gets audited automatically.

**Success Criteria:**
- Test PR triggers audit within 30 seconds
- Audit stored correctly in DB
- Non-rule-file PRs not audited (no spam)

**Depends On:** Phase 93

---

## Phase 95 — Rule File Change Detection

**Purpose:** Robustly detect when a PR modifies rule files.

**Focus Areas:**
- File path patterns
- Diff parsing
- Edge cases (renames, deletions)

**Key Deliverables:**
- File matcher logic:
  - Exact: `CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `.windsurfrules`
  - Glob: `.cursor/rules/**/*.md`, `.windsurfrules/**/*.md`
  - YAML: `.continue/config.yaml`
- Detection works for: file added, modified, renamed, deleted
- Multi-file PRs handled (audit each)
- Audit context includes only changed files (faster)

**Expected Outcome:** Accurate detection of rule file changes in any PR.

**Success Criteria:**
- Renames detected
- Deletions detected
- Multi-file PRs handled
- No false positives

**Depends On:** Phase 94

---

## Phase 96 — PR Comment Posting

**Purpose:** Post audit results as PR comments.

**Focus Areas:**
- Comment formatting
- Sticky comments (update vs create)
- Comment templates
- Read more / collapse

**Key Deliverables:**
- After audit, post comment on PR with:
  - Sherpa Labs branded header
  - Score and trend (if previous audit exists)
  - Top 5 violations with file:line links
  - "View full report" link to dashboard
- Sticky comment: existing Sherpa comment updated instead of new one (use external action like `marocchino/sticky-pull-request-comment` patterns)
- Comment opt-out via repo or workspace settings

**Expected Outcome:** PR authors see audit feedback inline.

**Success Criteria:**
- Comment appears within 30 seconds of PR open
- Re-running on synchronize updates existing comment
- Comment renders correctly

**Depends On:** Phase 95

---

## Phase 97 — Commit Status Checks

**Purpose:** Add pass/fail status checks to PR builds based on audit score.

**Focus Areas:**
- Status API integration
- Pass/fail threshold
- Status name
- Multiple checks if multiple files

**Key Deliverables:**
- After audit, post commit status via GitHub Checks API:
  - Status name: "Sherpa Audit"
  - Success if score ≥ workspace threshold (default 70)
  - Failure if score < threshold
  - Details URL → dashboard audit page
- Status updates on re-audit
- Configurable threshold per workspace

**Expected Outcome:** PR can't merge if rule quality regresses.

**Success Criteria:**
- Status check appears on PR
- Success/failure correctly determined
- Status updates on re-audit

**Depends On:** Phase 96

---

## Phase 98 — GitHub Action (Composite)

**Purpose:** Provide a GitHub Action as an alternative to the GitHub App for teams who prefer it.

**Focus Areas:**
- Composite action design
- Inputs and outputs
- Marketplace listing

**Key Deliverables:**
- New repo: `sherpa-labs/sherpa-action`
- Composite action that:
  - Installs sherpa CLI
  - Runs audit
  - Posts PR comment via marocchino/sticky-pull-request-comment or similar
  - Optionally calls our API to sync results
- Inputs: `min-score`, `sync-to-cloud`, `api-token`
- Marketplace listing prepared
- Documentation in `docs/GITHUB_ACTION.md`

**Expected Outcome:** Two parallel paths for GitHub integration.

**Success Criteria:**
- Action runs on sample workflow
- Sync to cloud works with token
- Marketplace listing live

**Depends On:** Phase 97

---

# STAGE O — ADVANCED CLI FEATURES

---

## Phase 99 — Multi-Tool Detection (Cursor + Claude + Windsurf + Continue)

**Purpose:** Detect all AI tools in use in a repo and audit each.

**Focus Areas:**
- Tool detection across all formats
- Audit per tool
- Cross-tool insights

**Key Deliverables:**
- Multi-tool detection in stack-detection module (already partly done in Phase 11)
- Audit runs against all detected rule files
- Per-tool subscores aggregated into overall score
- Tool-specific audit rules where appropriate (e.g., Cursor rule priority handling)

**Expected Outcome:** Sherpa works for teams using any combination of AI tools.

**Success Criteria:**
- Detection works for 5 different tool combinations
- Per-tool scores correct
- Aggregated score sensible

**Depends On:** Phase 70

---

## Phase 100 — Cross-Tool Consistency Checking

**Purpose:** Detect when CLAUDE.md and .cursorrules contradict each other.

**Focus Areas:**
- Cross-file rule extraction
- Contradiction detection
- Violation reporting

**Key Deliverables:**
- Audit rule A5 (from Phase 13) extended to deeply check cross-tool contradictions
- Heuristic patterns for opposing directives
- Output flags exact lines where contradictions found
- Suggested resolution

**Expected Outcome:** Teams using multiple tools get told when their rules conflict.

**Success Criteria:**
- Sample contradictory files flagged
- False positive rate < 10%
- Specific lines identified

**Depends On:** Phase 99

---

## Phase 101 — `sherpa commit` Feature (AI Commit Messages)

**Purpose:** Generate AI-powered commit messages from staged changes.

**Focus Areas:**
- Git diff reading
- LLM prompt
- BYO API key
- Convention support

**Key Deliverables:**
- `sherpa commit` subcommand
- Reads staged git diff
- Sends diff + workspace commit convention (if set) to LLM
- Generates 3 commit message suggestions
- User selects one or edits
- Performs `git commit -m`
- BYO API key (env: `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`)
- Workspace can define commit conventions (max length, prefixes, etc.) via dashboard

**Expected Outcome:** Reasonable commit messages generated 80%+ of the time.

**Success Criteria:**
- Generated messages adhere to Conventional Commits
- User can edit before committing
- Workspace convention respected

**Depends On:** Phase 100

---

## Phase 102 — `sherpa changelog` Feature (Release Notes)

**Purpose:** Generate changelog entries from recent commits.

**Focus Areas:**
- Git log parsing
- Conventional Commits grouping
- LLM enhancement
- PR description integration

**Key Deliverables:**
- `sherpa changelog` subcommand
- Reads commits since last tag (or specified range)
- Groups by Conventional Commit type
- Optionally enriches with PR descriptions via GitHub API (needs PAT)
- LLM polishes wording
- Output formats: Markdown, plain text, JSON
- Configurable template

**Expected Outcome:** Release notes ready in seconds.

**Success Criteria:**
- Generated changelog readable without manual edit 80%+ of the time
- Groupings correct
- PR descriptions integrated when PAT provided

**Depends On:** Phase 101

---

## Phase 103 — Custom Audit Rule Support

**Purpose:** Let teams write their own audit rules in JavaScript.

**Focus Areas:**
- Rule plugin API
- Custom rule loading
- Sandboxing
- Documentation

**Key Deliverables:**
- Plugin API exposed in `packages/core-rules`
- Custom rules loaded from `.sherpa/rules/*.js`
- Rules are plain JS modules exporting check functions
- VM-based sandboxing for security
- Custom rules show up in `sherpa rules` listing
- Documentation with example custom rule

**Expected Outcome:** Teams can encode their internal coding standards as audit rules.

**Success Criteria:**
- Sample custom rule loads and runs
- Custom rule violations appear in output
- Malicious code sandboxed (no fs/network access)

**Depends On:** Phase 102

---

## Phase 104 — Plugin System for Custom Rules

**Purpose:** Standardize plugin distribution via npm.

**Focus Areas:**
- Plugin package conventions
- Plugin discovery
- Plugin marketplace (basic)

**Key Deliverables:**
- npm package naming convention: `@sherpa-labs/plugin-*` or `sherpa-plugin-*`
- Plugin auto-discovery from `node_modules`
- Plugin enabling via `.sherpa.json` config
- Sample plugins published (e.g., `sherpa-plugin-typescript-strict`)
- Plugin development docs

**Expected Outcome:** A growing ecosystem of community-contributed audit rules.

**Success Criteria:**
- Sample plugin published to npm
- Plugin loads from a fresh project
- Documentation enables third-party plugin creation

**Depends On:** Phase 103

---

# STAGE P — NOTIFICATIONS & WEBHOOKS

---

## Phase 105 — Slack Webhook Integration

**Purpose:** Send audit notifications to Slack channels.

**Focus Areas:**
- Webhook URL collection
- Slack Block Kit messages
- Notification triggers
- Testing

**Key Deliverables:**
- Workspace settings: Slack webhook URL field
- Test button to verify webhook
- Block Kit formatted messages for:
  - Audit score drop
  - PR fail
  - Weekly summary
- Per-workspace enable/disable

**Expected Outcome:** Teams get notified in Slack about quality changes.

**Success Criteria:**
- Test message arrives in Slack
- Production triggers fire correctly
- Disable stops messages

**Depends On:** Phase 98

---

## Phase 106 — Discord Webhook Integration

**Purpose:** Send audit notifications to Discord channels.

**Focus Areas:**
- Discord webhook URL collection
- Embed formatting
- Same triggers as Slack

**Key Deliverables:**
- Workspace settings: Discord webhook URL field
- Discord embed formatted messages
- Same triggers as Slack
- Test button

**Expected Outcome:** Discord-based teams get same notifications.

**Success Criteria:**
- Test message arrives in Discord
- Embeds render correctly
- Triggers fire

**Depends On:** Phase 105

---

## Phase 107 — Notification Triggers

**Purpose:** Define exactly when notifications fire.

**Focus Areas:**
- Trigger rules
- Throttling
- Per-workspace preferences

**Key Deliverables:**
- Trigger types:
  - Score drop > 10 points week-over-week
  - PR audit fails threshold
  - New critical security violation
  - Weekly summary (Monday morning)
  - Trial expiring soon
- Throttling: same trigger max once per hour
- Per-trigger enable/disable in workspace settings

**Expected Outcome:** Notifications useful, not spammy.

**Success Criteria:**
- Triggers fire on test conditions
- Throttling prevents spam
- Disabled triggers stay silent

**Depends On:** Phase 106

---

## Phase 108 — Notification Preferences Per Workspace

**Purpose:** Granular notification control.

**Focus Areas:**
- Settings UI
- Persistence
- Defaults

**Key Deliverables:**
- Notifications tab in workspace settings
- Toggle per notification type
- Webhook URL configuration
- "Test webhook" button
- Sensible defaults for new workspaces

**Expected Outcome:** Teams control their notification noise.

**Success Criteria:**
- Toggles persist
- Disabled types not sent
- Test works

**Depends On:** Phase 107

---

# STAGE Q — INTERNATIONALIZATION (HINDI)

---

## Phase 109 — i18n Framework Setup (next-intl)

**Purpose:** Set up internationalization infrastructure for the dashboard.

**Focus Areas:**
- next-intl installation
- Locale routing
- Translation files structure
- Default locale fallback

**Key Deliverables:**
- next-intl installed and configured
- Locale routing: `/en/dashboard`, `/hi/dashboard`
- Translation files in `apps/web/messages/en.json`, `messages/hi.json`
- Locale detection via Accept-Language header + user preference
- Default locale: `en`
- Fallback handling for missing keys

**Expected Outcome:** Dashboard ready for multi-language support.

**Success Criteria:**
- Routes work with locale prefix
- Translation function returns correct string
- Fallback works for missing keys

**Depends On:** Phase 58

---

## Phase 110 — English Baseline Translations

**Purpose:** Extract all hardcoded English strings into translation files.

**Focus Areas:**
- String extraction
- Translation file organization
- Component refactoring

**Key Deliverables:**
- All hardcoded strings in dashboard moved to `messages/en.json`
- Organized by feature (auth, dashboard, settings, billing, etc.)
- Components use `useTranslations()` hook
- No string literals in JSX (except brand names)
- Linter check for hardcoded strings

**Expected Outcome:** English fully extracted; adding a language is content-only.

**Success Criteria:**
- Every visible string sourced from translations
- No hardcoded strings remain (verified by grep)
- App renders identically post-extraction

**Depends On:** Phase 109

---

## Phase 111 — CLI Internationalization Support

**Purpose:** Add language support to CLIs.

**Focus Areas:**
- CLI i18n library
- Translation files for CLI
- Locale detection

**Key Deliverables:**
- Both CLIs detect locale from `LANG` env var
- `--lang <code>` flag overrides detection
- Translation files in each CLI package
- English baseline translations for all CLI output
- Help text, error messages, prompts all translatable

**Expected Outcome:** CLIs ready for non-English speakers.

**Success Criteria:**
- `LANG=hi sherpa --help` would show Hindi (once translations added)
- All CLI output translatable
- Default English fallback works

**Depends On:** Phase 110

---

## Phase 112 — Hindi Translation (UI + CLI)

**Purpose:** First non-English language.

**Focus Areas:**
- Hindi translation of dashboard
- Hindi translation of CLI
- Native speaker review
- Locale-aware formatting

**Key Deliverables:**
- `messages/hi.json` for dashboard
- Hindi translations for both CLIs
- Native Hindi speaker review (paid for clear quality)
- Numbers, dates, currency formatted per `hi-IN` locale
- Language switcher in account settings

**Expected Outcome:** Complete Hindi experience for Indian users.

**Success Criteria:**
- Full Hindi user flow tested
- Native speaker confirms naturalness
- No untranslated strings

**Depends On:** Phase 111

---

# STAGE R — PRIVACY, SECURITY, COMPLIANCE

---

## Phase 113 — Privacy Audit (Data Flow Review)

**Purpose:** Document every data flow and ensure no sensitive data leaks.

**Focus Areas:**
- Data flow mapping
- Sensitive data identification
- Network audit
- Storage audit

**Key Deliverables:**
- `docs/DATA_FLOWS.md` documenting every flow:
  - CLI → API: what data, what's stored
  - Dashboard → API: same
  - GitHub App → API: only rule files
  - API → Neon DB: encrypted in transit + at rest
  - API → External services: Paddle, Resend, Sentry, PostHog
- Verification via Chrome DevTools Network tab: no unexpected outbound calls
- Confirmation: source code (other than rule files) never leaves dev machine
- Telemetry payload audited: no PII, no rule content, only platform/version

**Expected Outcome:** Sherpa truly is privacy-respecting and provable.

**Success Criteria:**
- Network audit shows no surprises
- Telemetry verified clean
- Documentation accurate

**Depends On:** Phase 91

---

## Phase 114 — Secret Encryption (PATs, API Keys)

**Purpose:** Audit all secret storage and encryption.

**Focus Areas:**
- GitHub PAT encryption
- API key handling
- Wrangler secrets
- DB encryption at rest

**Key Deliverables:**
- All sensitive fields in DB encrypted at rest (AES-256-GCM):
  - GitHub PATs
  - Slack/Discord webhook URLs
  - Any third-party tokens
- Encryption key rotated via Wrangler secret rotation procedure
- Audit log for secret access
- No secrets in environment variables of deployed apps (use Wrangler/Vercel secrets only)
- CLI credentials file always chmod 600

**Expected Outcome:** Secrets defensible in a security review.

**Success Criteria:**
- DB dump contains no plaintext secrets
- Wrangler secrets correctly scoped per environment
- CLI credentials file permissions correct

**Depends On:** Phase 113

---

## Phase 115 — CLI Token Storage Security

**Purpose:** Harden CLI credential storage.

**Focus Areas:**
- File permissions
- Token format
- Token revocation
- Multi-machine support

**Key Deliverables:**
- CLI credentials stored at:
  - macOS/Linux: `~/.config/sherpa/credentials` (chmod 600)
  - Windows: `%APPDATA%\sherpa\credentials` (NTFS ACL: user-only)
- Token format: opaque random string (not JWT)
- Tokens revocable from dashboard
- Token rotation supported
- Multi-machine: each machine has separate token

**Expected Outcome:** CLI authentication secure against local attacks.

**Success Criteria:**
- File permissions verified
- Tokens revocable
- Multi-machine works

**Depends On:** Phase 114

---

## Phase 116 — Telemetry Opt-In Flow

**Purpose:** Implement opt-in telemetry with clear consent.

**Focus Areas:**
- First-run prompt
- Persistent opt-in choice
- Telemetry payload
- Disable mechanism

**Key Deliverables:**
- First-run prompt: "Help improve Sherpa? Send anonymous version/platform info?" (default NO)
- Choice persisted in CLI config
- `SHERPA_TELEMETRY=0` env var force-disables
- Telemetry payload: only CLI version, Node version, OS platform
- Endpoint: simple counter at `api.sherpalabs.dev/telemetry`
- Documentation: what's collected, what's not

**Expected Outcome:** Opt-in telemetry that respects user choice.

**Success Criteria:**
- First-run prompt appears
- Default NO honored
- Env var override works
- No PII in payload

**Depends On:** Phase 115

---

## Phase 117 — Privacy Policy & Terms of Service

**Purpose:** Write and publish legal documents.

**Focus Areas:**
- Privacy policy
- Terms of service
- Cookie policy (if any cookies)
- Refund policy

**Key Deliverables:**
- `/privacy` page with full privacy policy
- `/terms` page with terms of service
- Both documents:
  - Drafted with care, not auto-generated
  - Reviewed by tech-savvy peer (or, if budget, lawyer)
  - GDPR-compliant (Article 13)
  - DPDP Rules 2025 compliant for India
  - Easy to read (not legal jargon overload)
- Refund policy: 30 days, no questions asked
- Links from footer, signup, checkout

**Expected Outcome:** Legal coverage in place for global SaaS.

**Success Criteria:**
- Policies live and linked
- GDPR / DPDP basics covered
- Refund policy clear

**Depends On:** Phase 116

---

## Phase 118 — GDPR & DPDP Compliance (Data Deletion Flow)

**Purpose:** Ensure data deletion requests can be fulfilled.

**Focus Areas:**
- Account deletion flow
- Data export
- Retention policies
- DPO contact

**Key Deliverables:**
- "Delete account" button in account settings
- Confirmation flow (type to confirm)
- Cascade delete:
  - All audits
  - All repo connections (with PATs encrypted and then purged)
  - All workspace memberships
  - User row
  - Clerk user (via Clerk API)
- Backup retention: 30 days then permanent purge
- "Export my data" button (downloads JSON of all user data)
- DPO contact email in privacy policy

**Expected Outcome:** Users can delete or export their data on demand.

**Success Criteria:**
- Account deletion fully removes data
- Export downloads valid JSON
- 30-day retention enforced

**Depends On:** Phase 117

---

# STAGE S — PERFORMANCE OPTIMIZATION

---

## Phase 119 — CLI Startup Optimization

**Purpose:** Make CLI feel instant.

**Focus Areas:**
- Lazy loading
- Bundle size
- Top-level imports
- Startup profiling

**Key Deliverables:**
- Both CLIs profiled with `node --prof`
- Heavy modules lazy-loaded (only imported when needed)
- Top-level imports minimized
- Bundle size analyzed
- Target: `sherpa --help` runs in < 200ms on M1 Mac
- Target: `aimcp-lint --help` runs in < 200ms

**Expected Outcome:** CLIs feel snappy.

**Success Criteria:**
- `time sherpa --help` shows ≤ 200ms
- `time aimcp-lint --help` shows ≤ 200ms
- Bundle sizes ≤ 500 KB

**Depends On:** Phase 32

---

## Phase 120 — Dashboard Performance (Lighthouse 90+)

**Purpose:** Optimize dashboard for speed.

**Focus Areas:**
- Bundle size
- Image optimization
- Code splitting
- Caching strategy

**Key Deliverables:**
- Lighthouse Performance ≥ 90 mobile, ≥ 95 desktop
- LCP < 2.5s on simulated Slow 4G
- INP < 200ms
- CLS < 0.1
- Next.js partial prerendering for marketing pages
- Image optimization via `next/image`
- Route-level code splitting
- Bundle analyzer integrated to catch regressions

**Expected Outcome:** Dashboard fast on every connection.

**Success Criteria:**
- Lighthouse targets met
- Core Web Vitals pass
- Bundle stays under thresholds

**Depends On:** Phase 58

---

## Phase 121 — API Latency Optimization

**Purpose:** Make API responses fast globally.

**Focus Areas:**
- DB query optimization
- Caching strategy
- Indexes review
- Connection pool tuning

**Key Deliverables:**
- All API endpoints p50 < 100ms, p99 < 500ms
- Slow queries identified and optimized via Neon's query insights
- Indexes added for frequent queries
- Read-heavy endpoints cached via Cloudflare Cache API or KV
- Connection pool sized appropriately for Workers

**Expected Outcome:** API responsive from anywhere.

**Success Criteria:**
- p50 < 100ms from US, EU, India
- No N+1 query patterns
- Cache hit rate > 50% for read endpoints

**Depends On:** Phase 65

---

## Phase 122 — Bundle Size Optimization

**Purpose:** Keep all built artifacts small.

**Focus Areas:**
- Bundle analyzer
- Tree shaking
- Dependency audit
- Polyfills

**Key Deliverables:**
- Bundle analyzer reports for dashboard and CLIs
- Tree-shakable dependencies preferred
- Unused dependencies removed
- Polyfills minimized (target modern browsers/Node)
- Dashboard initial JS < 200 KB gzipped
- CLI bundles < 500 KB

**Expected Outcome:** Lean, fast artifacts.

**Success Criteria:**
- Bundle sizes meet targets
- No surprising large dependencies
- Tree shaking effective

**Depends On:** Phase 121

---

## Phase 123 — Edge Caching Strategy

**Purpose:** Maximize Cloudflare edge cache usage for static and read-heavy resources.

**Focus Areas:**
- Cache headers
- Cache key design
- Purge strategy

**Key Deliverables:**
- Marketing pages: aggressively cached
- Audit lists: cached briefly with smart invalidation
- API responses: cache-friendly headers where appropriate
- Cache purge on relevant data updates
- Documentation of cache strategy

**Expected Outcome:** Cloudflare cache absorbs much of the traffic load.

**Success Criteria:**
- Cache hit rate > 70% for marketing
- Cache hit rate > 50% for cacheable API
- Purge works correctly

**Depends On:** Phase 122

---

# STAGE T — TESTING & QUALITY

---

## Phase 124 — Vitest Setup & Shared Config

**Purpose:** Set up Vitest across the monorepo with shared configuration.

**Focus Areas:**
- Vitest installation
- Shared config
- Watch mode
- Coverage tooling

**Key Deliverables:**
- Vitest installed at workspace root
- Shared Vitest config in `packages/shared-config`
- Per-package `vitest.config.ts` extending shared
- Watch mode workflow documented
- Coverage tooling: `@vitest/coverage-v8`
- CI integration: tests run on every PR

**Expected Outcome:** Testing infrastructure ready everywhere.

**Success Criteria:**
- `pnpm test` runs all tests
- Watch mode works
- Coverage reports generated

**Depends On:** Phase 6

---

## Phase 125 — Unit Tests for Parsers & Audit Engine

**Purpose:** Comprehensive unit tests for core packages.

**Focus Areas:**
- Parser tests
- Audit rule tests
- Stack detection tests
- Coverage targets

**Key Deliverables:**
- Unit tests for every parser function in `packages/core-rules/parser/`
- Unit tests for every audit rule in `packages/core-rules/audit/`
- Unit tests for stack detection
- Test fixtures (sample files) committed
- Coverage target: ≥ 85% for `packages/core-rules`

**Expected Outcome:** Rule parsing and audit logic reliable.

**Success Criteria:**
- All tests pass
- Coverage meets target
- Edge cases covered

**Depends On:** Phase 14

---

## Phase 126 — Unit Tests for MCP Lint Rules

**Purpose:** Unit tests for MCP-related code.

**Focus Areas:**
- MCP client tests (mocked transports)
- MCP rule tests
- Coverage targets

**Key Deliverables:**
- Unit tests for stdio and SSE clients (mocked process / HTTP)
- Unit tests for every MCP lint rule
- Test fixtures for sample server responses
- Coverage target: ≥ 85% for `packages/core-mcp`

**Expected Outcome:** MCP code reliable.

**Success Criteria:**
- All tests pass
- Coverage meets target
- Edge cases covered

**Depends On:** Phase 19

---

## Phase 127 — Unit Tests for CLI Commands

**Purpose:** Test CLI command handlers.

**Focus Areas:**
- Command logic tests
- Argument parsing tests
- Output formatter tests
- Coverage targets

**Key Deliverables:**
- Unit tests for command handlers in both CLIs
- Tests use mocked file system and network
- Coverage target: ≥ 70% for `packages/cli-*`

**Expected Outcome:** CLI commands reliable.

**Success Criteria:**
- All tests pass
- Coverage meets target

**Depends On:** Phase 33

---

## Phase 128 — Playwright E2E Setup & Critical Flows

**Purpose:** Set up end-to-end testing for the dashboard.

**Focus Areas:**
- Playwright setup
- Auth flow E2E
- Subscription E2E
- Repo connection E2E

**Key Deliverables:**
- Playwright installed
- Test fixtures for authenticated state
- E2E tests for:
  - Sign up → land on dashboard
  - Connect repo via PAT
  - Run sync (CLI invocation mocked or real)
  - Upgrade flow (Paddle sandbox)
  - Invite member
- Run on CI for every PR

**Expected Outcome:** Critical user flows regression-protected.

**Success Criteria:**
- All E2E tests pass in CI
- Tests run in < 5 minutes
- Failures produce useful traces

**Depends On:** Phase 91

---

## Phase 129 — Cross-Platform CLI Testing

**Purpose:** Ensure CLIs work on all supported platforms.

**Focus Areas:**
- CI matrix testing
- Platform-specific path handling
- Node version compatibility

**Key Deliverables:**
- GitHub Actions matrix: `os: [ubuntu, macos, windows]` × `node: [18, 20, 22]`
- Smoke tests on each combination
- Platform-specific issues documented
- Windows path handling verified

**Expected Outcome:** CLIs work reliably everywhere.

**Success Criteria:**
- All 9 matrix combinations pass
- No Windows-specific bugs
- Node version compatibility verified

**Depends On:** Phase 127

---

# STAGE U — DOCUMENTATION SITE

---

## Phase 130 — Documentation Site Setup

**Purpose:** Set up dedicated documentation site.

**Focus Areas:**
- Docs framework choice
- Initial structure
- Branding consistency

**Key Deliverables:**
- Docs framework chosen (Mintlify recommended for indie devs)
- Initial structure created
- Brand styling applied (logo, colors, fonts)
- Search enabled
- Sidebar navigation set up
- Hosted at `docs.sherpalabs.dev`

**Expected Outcome:** Docs site live and ready for content.

**Success Criteria:**
- Site live
- Search works
- Branding consistent with dashboard

**Depends On:** Phase 58

---

## Phase 131 — Quickstart Guide

**Purpose:** Get users from zero to first audit in 5 minutes.

**Focus Areas:**
- Step-by-step setup
- Common stack examples
- Troubleshooting

**Key Deliverables:**
- Quickstart page with:
  - Install via npx
  - Run first audit
  - Understand the output
  - Connect to dashboard (optional)
- 3 example workflows: Solo, Small team, Open source
- Common errors and solutions

**Expected Outcome:** New users productive in 5 minutes.

**Success Criteria:**
- Following the quickstart works for fresh user
- All steps verified
- Screenshots and code blocks accurate

**Depends On:** Phase 130

---

## Phase 132 — CLI Reference Documentation

**Purpose:** Document every CLI command and flag.

**Focus Areas:**
- Per-command pages
- Examples
- Edge cases

**Key Deliverables:**
- Reference page for each subcommand:
  - sherpa init, audit, convert, sync, login, commit, changelog
  - aimcp-lint lint, watch, init, rules
- Each page includes: synopsis, flags, examples, exit codes, related commands
- Auto-extraction from CLI help where possible

**Expected Outcome:** Self-service CLI reference.

**Success Criteria:**
- Every command has a page
- Every flag documented
- Examples runnable

**Depends On:** Phase 131

---

## Phase 133 — Audit Rules Reference

**Purpose:** Document every audit rule with examples.

**Focus Areas:**
- Per-rule pages
- Passing and failing examples
- Severity explanation

**Key Deliverables:**
- One page per audit rule (A1-A12 from Phase 13, plus any added later)
- Each page: rule ID, severity, what it checks, why it matters, passing example, failing example, fix guidance
- SEO-optimized: page title includes rule ID and concise description

**Expected Outcome:** Authoritative reference for what Sherpa checks.

**Success Criteria:**
- Every rule has a page
- Examples accurate
- SEO meta tags present

**Depends On:** Phase 132

---

## Phase 134 — MCP Lint Rules Reference

**Purpose:** Document every MCP lint rule.

**Focus Areas:**
- Per-rule pages
- Protocol context
- Examples

**Key Deliverables:**
- One page per MCP rule (P001+, S001+, X001+, F001+)
- Each page: rule ID, category, severity, what it checks, passing/failing examples, fix guidance

**Expected Outcome:** Complete reference for aimcp-lint behavior.

**Success Criteria:**
- Every rule has a page
- Examples accurate
- Categorization correct

**Depends On:** Phase 133

---

## Phase 135 — Integration Guides

**Purpose:** Document every integration with step-by-step instructions.

**Focus Areas:**
- GitHub App setup
- GitHub Action setup
- CI/CD examples
- IDE integration (if any)

**Key Deliverables:**
- Integration guides for:
  - GitHub App installation
  - GitHub Action setup
  - GitLab CI integration
  - CircleCI integration
  - Slack notifications
  - Discord notifications
  - Setting up canonical rules
- Each guide has copy-paste blocks and verification steps

**Expected Outcome:** Users can set up any integration without support.

**Success Criteria:**
- Every integration documented
- Copy-paste works
- Verification steps clear

**Depends On:** Phase 134

---

# STAGE V — MARKETING SITE

---

## Phase 136 — Landing Page Hero & Structure

**Purpose:** Build the marketing landing page that drives signups.

**Focus Areas:**
- Hero section
- Value proposition
- Brand alignment

**Key Deliverables:**
- Landing page at `/` with:
  - Hero: punchy headline, subhead, primary CTA, secondary CTA
  - Demo image or GIF
  - Social proof bar (if available)
- Lighthouse Performance ≥ 95

**Expected Outcome:** Strong first impression that converts.

**Success Criteria:**
- Page renders fast
- Hero clear and compelling
- CTAs prominent

**Depends On:** Phase 58

---

## Phase 137 — Features Section & Screenshots

**Purpose:** Showcase product capabilities.

**Focus Areas:**
- Feature highlights
- Screenshots
- Use case narrative

**Key Deliverables:**
- Features section with:
  - 3-6 key features highlighted
  - Real product screenshots (not mocks)
  - Brief copy per feature
- Use cases / personas section: "For solo devs", "For teams", "For MCP authors"

**Expected Outcome:** Visitors understand the product within 30 seconds.

**Success Criteria:**
- Screenshots polished
- Copy concise
- Features differentiated

**Depends On:** Phase 136

---

## Phase 138 — Demo Video Creation

**Purpose:** Create a 30-60 second demo video.

**Focus Areas:**
- Storyboarding
- Screen recording
- Voiceover (optional)
- Hosting

**Key Deliverables:**
- 30-60 second demo video showing:
  - Bad CLAUDE.md → `sherpa audit` shows low score → fix issues → high score → better agent output
- Captioned for sound-off viewing
- Hosted on YouTube or Vimeo (embed) or self-hosted as MP4 on Cloudflare
- Embedded prominently on landing page

**Expected Outcome:** Visitors get the value prop visually.

**Success Criteria:**
- Video under 60 seconds
- Clear voiceover or captions
- Plays smoothly on mobile

**Depends On:** Phase 137

---

## Phase 139 — Pricing Section Integration

**Purpose:** Pricing visible on landing page.

**Focus Areas:**
- Pricing display
- Geo-aware
- Clear CTAs

**Key Deliverables:**
- Pricing section linking to /pricing
- Inline summary: Free, Pro $9, Team $49
- Geo-aware (₹ for India)
- "Compare plans" link

**Expected Outcome:** Pricing transparency from landing.

**Success Criteria:**
- Pricing visible above fold or on scroll
- Geo detection works
- Links to full pricing page

**Depends On:** Phase 138

---

## Phase 140 — SEO Meta Tags & Open Graph

**Purpose:** Optimize for search and social sharing.

**Focus Areas:**
- Meta tags
- Open Graph
- Twitter Cards
- Sitemap

**Key Deliverables:**
- Title and description for every page
- Open Graph image (1200×630) per major page
- Twitter Cards configured
- `robots.txt` and `sitemap.xml`
- Schema.org markup (SoftwareApplication, FAQPage)
- Submitted to Google Search Console

**Expected Outcome:** Strong SEO foundation for organic discovery.

**Success Criteria:**
- Lighthouse SEO ≥ 95
- Social card preview renders correctly
- Sitemap valid

**Depends On:** Phase 139

---

## Phase 141 — FAQ & Testimonials Section

**Purpose:** Address common questions and showcase social proof.

**Focus Areas:**
- FAQ accordion
- Testimonial cards
- Trust signals

**Key Deliverables:**
- FAQ section with:
  - "What is Sherpa?"
  - "How is it different from Cursor / Claude Code?"
  - "Do you store my code?"
  - "How does pricing work?"
  - "Cancel anytime?"
  - "Open source?"
- Testimonial cards (from beta users, once available)
- Trust signals: GitHub stars badge, npm downloads, security badges

**Expected Outcome:** Common objections addressed proactively.

**Success Criteria:**
- FAQ covers top questions
- Testimonials authentic (with attribution)
- Trust signals visible

**Depends On:** Phase 140

---

# STAGE W — MONITORING & OBSERVABILITY

---

## Phase 142 — Sentry Error Tracking Integration

**Purpose:** Catch and analyze production errors.

**Focus Areas:**
- Sentry account setup
- Frontend integration
- Backend integration
- Source maps

**Key Deliverables:**
- Sentry account created
- Projects for: dashboard, API, both CLIs
- Source maps uploaded for dashboard and CLI
- Sensitive data scrubbing configured
- Sample rate set appropriately (50% for prod free tier)
- Alert thresholds: notify if error rate > 1%

**Expected Outcome:** Production errors caught and analyzable.

**Success Criteria:**
- Test error appears in Sentry
- Source maps resolve correctly
- Alerts fire on threshold

**Depends On:** Phase 121

---

## Phase 143 — PostHog Analytics Integration

**Purpose:** Track user behavior and funnel metrics.

**Focus Areas:**
- PostHog account setup
- Event tracking
- Funnel definitions
- Privacy-respecting configuration

**Key Deliverables:**
- PostHog account created
- Event tracking in dashboard:
  - `signup_completed`
  - `repo_connected`
  - `first_audit_run`
  - `paywall_shown`
  - `subscription_started`
  - `subscription_canceled`
  - `team_member_invited`
- Privacy: PostHog configured without cookies (or with opt-in cookie banner)
- Funnel: signup → first audit → upgrade
- Cohort retention reports

**Expected Outcome:** Product analytics visible.

**Success Criteria:**
- Events captured correctly
- Funnel chart shows conversion
- No PII in events

**Depends On:** Phase 142

---

## Phase 144 — Uptime Monitoring

**Purpose:** Get notified if services go down.

**Focus Areas:**
- Endpoint monitoring
- Notification channels
- Status threshold

**Key Deliverables:**
- BetterStack (free tier) or similar configured
- Endpoints monitored:
  - `sherpalabs.dev` (landing)
  - `app.sherpalabs.dev` (dashboard)
  - `api.sherpalabs.dev/api/v1/health`
  - `docs.sherpalabs.dev`
- Notifications via email + Slack/Discord on outage
- Check frequency: every minute

**Expected Outcome:** Outages detected within 1 minute.

**Success Criteria:**
- Test outage triggers notification
- All endpoints monitored
- Latency tracked

**Depends On:** Phase 143

---

## Phase 145 — Status Page Setup

**Purpose:** Public status page for transparency.

**Focus Areas:**
- Public status page
- Service component breakdown
- Incident communication

**Key Deliverables:**
- Status page at `status.sherpalabs.dev`
- Component status: API, Dashboard, CLI, Webhooks
- Incident posting workflow
- Email subscription option for users
- Integrated with uptime monitoring

**Expected Outcome:** Users know when things are down without contacting support.

**Success Criteria:**
- Status page live
- Test incident posts correctly
- Email subscription works

**Depends On:** Phase 144

---

## Phase 146 — Internal KPI Dashboard

**Purpose:** Founder-only dashboard tracking key business metrics.

**Focus Areas:**
- MRR, churn, ARPU
- Active users
- Funnel metrics
- Custom reports

**Key Deliverables:**
- Internal dashboard at `internal.sherpalabs.dev` (gated to founder)
- Metrics displayed:
  - MRR + trend
  - Active subscriptions by tier
  - Churn (monthly + cohort)
  - DAU / WAU / MAU
  - Audit submissions per day
  - Trial-to-paid conversion
- Powered by combination of PostHog + Paddle webhook data + custom queries

**Expected Outcome:** Founder always knows business state.

**Success Criteria:**
- Dashboard updates within 1 hour of new data
- Metrics accurate
- Gated to founder only

**Depends On:** Phase 145

---

# STAGE X — PRODUCTION DEPLOYMENT

---

## Phase 147 — Production Cloudflare Workers Deployment

**Purpose:** Deploy API to production.

**Focus Areas:**
- Production deployment
- Environment secrets
- Custom routes
- Health checks

**Key Deliverables:**
- `wrangler deploy --env production` deploys API
- Production secrets configured via `wrangler secret put`
- Custom route: `api.sherpalabs.dev/*`
- Health check endpoint returns 200 OK globally
- Wrangler tail for live log access

**Expected Outcome:** Production API live and globally accessible.

**Success Criteria:**
- API responds globally
- Secrets correctly configured
- Logs accessible

**Depends On:** Phase 121

---

## Phase 148 — Production Vercel Deployment (Dashboard)

**Purpose:** Deploy dashboard and marketing site to production.

**Focus Areas:**
- Vercel project setup
- Environment variables
- Custom domain
- Preview deployments

**Key Deliverables:**
- Vercel project linked to GitHub repo
- Environment variables configured for production
- Custom domain: `sherpalabs.dev` and `app.sherpalabs.dev`
- Preview deployments enabled for PRs
- Auto-deploy on push to `main`

**Expected Outcome:** Dashboard live in production.

**Success Criteria:**
- Custom domain resolves
- Auto-deploy triggers on push
- Preview deploys work for PRs

**Depends On:** Phase 147

---

## Phase 149 — DNS Configuration (Cloudflare)

**Purpose:** Configure all DNS records correctly.

**Focus Areas:**
- DNS records
- SSL/TLS
- DNSSEC

**Key Deliverables:**
- DNS records:
  - `sherpalabs.dev` → Vercel (A/AAAA or CNAME)
  - `app.sherpalabs.dev` → Vercel
  - `api.sherpalabs.dev` → Cloudflare Workers route
  - `docs.sherpalabs.dev` → docs hosting
  - `status.sherpalabs.dev` → status page service
  - MX records for email forwarding (Cloudflare Email Routing)
  - TXT records: SPF, DKIM, DMARC
- DNSSEC enabled
- SSL/TLS mode: Full (strict)

**Expected Outcome:** All subdomains resolve correctly with valid SSL.

**Success Criteria:**
- All subdomains accessible
- SSL valid (A+ on SSL Labs)
- Email forwarding works

**Depends On:** Phase 148

---

## Phase 150 — SSL & Custom Domains Setup

**Purpose:** Ensure all SSL certificates valid and auto-renewing.

**Focus Areas:**
- SSL certificates
- HSTS
- Security headers

**Key Deliverables:**
- SSL valid on every subdomain
- HSTS header on all sites
- Security headers: CSP, X-Frame-Options, X-Content-Type-Options
- SSL Labs test: A+ rating

**Expected Outcome:** Maximum HTTPS security.

**Success Criteria:**
- SSL Labs A+ rating
- HSTS preload eligibility
- Security headers present

**Depends On:** Phase 149

---

## Phase 151 — Environment Variable Management

**Purpose:** Audit and document all environment variables.

**Focus Areas:**
- Vercel env vars
- Wrangler secrets
- Local `.env` examples
- Documentation

**Key Deliverables:**
- All Vercel env vars documented in `docs/ENV_VARS.md`
- All Wrangler secrets listed (without values)
- `.env.example` files for local development
- Procedure for rotating secrets

**Expected Outcome:** No mystery environment variables.

**Success Criteria:**
- Every env var documented
- `.env.example` complete
- Rotation procedure works

**Depends On:** Phase 150

---

## Phase 152 — Database Backup Configuration

**Purpose:** Ensure data is recoverable.

**Focus Areas:**
- Neon backups
- Point-in-time recovery
- Manual backups
- Recovery testing

**Key Deliverables:**
- Neon's built-in backup verified
- Point-in-time recovery tested (restore to a known state)
- Manual export schedule (weekly to off-Neon storage)
- Recovery runbook in `docs/DISASTER_RECOVERY.md`

**Expected Outcome:** Database recoverable from any disaster.

**Success Criteria:**
- Test recovery successful
- Runbook complete
- Off-site backup exists

**Depends On:** Phase 151

---

# STAGE Y — BETA & LAUNCH PREPARATION

---

## Phase 153 — Closed Beta Recruitment

**Purpose:** Recruit 20-30 beta users from target segments.

**Focus Areas:**
- Beta criteria
- Recruitment channels
- Onboarding
- Communication

**Key Deliverables:**
- Beta criteria: actively using Claude Code / Cursor / Windsurf at scale
- Recruitment from:
  - Sherpa email waitlist
  - HN comments from early launches
  - Twitter DMs to dev tool builders
  - Cursor / Claude Code Discord communities
- 20-30 beta users signed up
- Beta access via dashboard flag (`is_beta` on user row)
- Private Discord/Slack channel for betas

**Expected Outcome:** Engaged beta cohort ready to provide feedback.

**Success Criteria:**
- 20+ active beta users
- Discord channel active
- Beta users have all features unlocked

**Depends On:** Phase 152

---

## Phase 154 — Beta Feedback Collection System

**Purpose:** Systematically capture and process beta feedback.

**Focus Areas:**
- Feedback form
- In-app feedback
- Survey scheduling
- Triage process

**Key Deliverables:**
- Beta feedback form (Tally or Google Form):
  - NPS question
  - Friction points
  - Missing features
  - Would-pay-after-beta?
- In-app feedback widget (e.g., Featurebase or custom)
- Bi-weekly check-in survey
- Triage spreadsheet for tracking issues

**Expected Outcome:** Structured feedback pipeline.

**Success Criteria:**
- ≥ 50% of beta users respond to surveys
- Feedback categorized within 48 hours
- Top issues identified

**Depends On:** Phase 153

---

## Phase 155 — Bug Triage & Iteration Sprints

**Purpose:** Fix bugs and address feedback in weekly sprints.

**Focus Areas:**
- Bug triage
- Priority scoring
- Fix sprints
- Communication

**Key Deliverables:**
- Bugs triaged into: P0 (blocks launch), P1 (fix before launch), P2 (post-launch)
- Weekly fix sprint for top P0/P1
- Beta release notes shared with cohort
- Regression tests added for fixed bugs

**Expected Outcome:** Significant quality improvement based on real usage.

**Success Criteria:**
- Zero P0 bugs at end of beta
- Top 5 P1s addressed
- Beta NPS improves over time

**Depends On:** Phase 154

---

## Phase 156 — Onboarding Flow Polish

**Purpose:** Refine the onboarding experience based on beta data.

**Focus Areas:**
- First-time user flow
- Time to first value
- Aha moment

**Key Deliverables:**
- Onboarding optimized to:
  - Land on dashboard within 30 seconds of signup
  - First audit run within 2 minutes
  - First repo connected within 5 minutes
- Onboarding checklist on dashboard (gamified)
- Empty states encourage next actions
- Onboarding tooltips for new users

**Expected Outcome:** New users productive within 5 minutes.

**Success Criteria:**
- Beta cohort onboarding completion ≥ 70%
- Time to first audit < 2 minutes for new users
- Drop-off points minimized

**Depends On:** Phase 155

---

## Phase 157 — Customer Support Setup

**Purpose:** Set up channels and processes for customer support.

**Focus Areas:**
- Support email
- Help docs
- Response SLA
- Ticket tracking

**Key Deliverables:**
- Support email `support@sherpalabs.dev` monitored
- Optional: Intercom or Crisp for in-app chat (free tier)
- Help docs prominently linked
- Response SLA documented:
  - Free users: 48h
  - Pro users: 24h
  - Team users: 12h
  - Enterprise: 4h
- Common issues canned responses

**Expected Outcome:** Support requests handled timely.

**Success Criteria:**
- Test support email gets a response
- SLA published in docs
- Canned responses ready

**Depends On:** Phase 156

---

## Phase 158 — Pre-Launch Checklist & Dry Runs

**Purpose:** Verify everything works before public launch.

**Focus Areas:**
- Full system test
- Load testing
- Backup verification
- Team readiness

**Key Deliverables:**
- Pre-launch checklist:
  - All P0 / P1 bugs resolved
  - Database backups working
  - Monitoring active
  - Status page live
  - Pricing page tested
  - Checkout tested (sandbox + small live test)
  - Email automation tested
  - Webhooks reliable
  - Documentation complete
- Light load test (100 concurrent users)
- Dry run of launch day operations
- Announcement assets prepared

**Expected Outcome:** Launch day confidence.

**Success Criteria:**
- All checklist items green
- Load test passes
- Dry run uncovers no major issues

**Depends On:** Phase 157

---

# STAGE Z — PUBLIC LAUNCH

---

## Phase 159 — Show HN Preparation

**Purpose:** Prepare Show HN launch for maximum signal.

**Focus Areas:**
- Title and post body
- Demo asset
- Comment strategy
- Timing

**Key Deliverables:**
- Show HN title drafted (multiple variants tested)
- Post body: founder story + product summary + demo link
- Live demo link with sample data
- Strategy for comment engagement: respond in 30 minutes, technical depth, no marketing-speak
- Launch timing: Wednesday or Thursday, 8-10am EST
- Launch day cleared for full focus

**Expected Outcome:** HN launch ready to execute.

**Success Criteria:**
- Title compelling
- Post drafted
- Demo asset working
- Calendar cleared

**Depends On:** Phase 158

---

## Phase 160 — Product Hunt Preparation

**Purpose:** Prepare Product Hunt launch.

**Focus Areas:**
- Listing assets
- Hunter coordination
- Comment strategy
- Launch day plan

**Key Deliverables:**
- Product Hunt listing drafted: name, tagline, description
- Gallery images (5+): screenshots, demo GIF
- Featured comment (founder's first comment)
- 20-30 hunters/supporters lined up to upvote and comment
- Launch timing: Tuesday for max visibility
- Email sequence to existing users on launch day

**Expected Outcome:** Product Hunt launch ready.

**Success Criteria:**
- Listing complete
- Hunters scheduled
- Email drafted

**Depends On:** Phase 159

---

## Phase 161 — Twitter/X Launch Thread

**Purpose:** Coordinated Twitter launch.

**Focus Areas:**
- Thread structure
- Visual assets
- Engagement
- Influencer DMs

**Key Deliverables:**
- 8-12 tweet launch thread:
  - Hook tweet with surprising stat
  - Demo GIF
  - Key features
  - Personal story / motivation
  - Launch link
- Visual assets: demo GIF, screenshots, before/after
- 20+ personal DMs to dev tool builders + AI dev community
- Scheduled for launch day morning

**Expected Outcome:** Twitter thread drives 100+ retweets.

**Success Criteria:**
- Thread drafted
- DM list ready
- Visual assets ready

**Depends On:** Phase 160

---

## Phase 162 — Reddit Multi-Sub Posts

**Purpose:** Distribute on Reddit communities respectfully.

**Focus Areas:**
- Per-subreddit posts
- Genuine tone
- Engagement

**Key Deliverables:**
- Tailored post for each:
  - r/ClaudeAI
  - r/cursor
  - r/SideProject
  - r/SaaS
- Each post genuine, not copy-paste
- Includes screenshots, asks for feedback
- Comments engaged within 1 hour

**Expected Outcome:** Reddit drives a portion of launch traffic.

**Success Criteria:**
- 4 posts ready
- No flagged for self-promotion
- Comments engaged

**Depends On:** Phase 161

---

## Phase 163 — Newsletter & Outreach

**Purpose:** Reach newsletter audiences and influencers.

**Focus Areas:**
- Newsletter outreach
- Influencer DMs
- Coordinated timing

**Key Deliverables:**
- Outreach emails sent to newsletter editors:
  - The Pragmatic Engineer
  - TLDR.tech
  - JavaScript Weekly
  - Bytes
- Personal DMs to dev tool influencers:
  - @simonw, @karpathy, @swyx, @mitchellh, etc.
- Each outreach personal, not template

**Expected Outcome:** Newsletter mentions in launch week.

**Success Criteria:**
- 10+ outreach sent
- 2+ confirmed mentions
- Influencers aware of launch

**Depends On:** Phase 162

---

## Phase 164 — Launch Day Monitoring & Execution

**Purpose:** Execute launch day flawlessly.

**Focus Areas:**
- Real-time monitoring
- Rapid response
- Bug fixes
- Engagement

**Key Deliverables:**
- Launch day fully focused (no other meetings)
- Real-time monitoring of:
  - Sentry alerts
  - HN post (every 30 min)
  - Twitter notifications (live)
  - Product Hunt rank
  - Email signups
  - Subscription conversions
- Hot patches deployed for any critical bugs
- Personal response to every public comment within 1 hour
- Stats spreadsheet updated hourly

**Expected Outcome:** Launch day captured.

**Success Criteria:**
- Zero outages
- All P0 bugs fixed same day
- Public response < 1 hour
- Daily KPIs tracked

**Depends On:** Phase 163

---

## Phase 165 — Post-Launch Iteration & KPI Review

**Purpose:** Process launch learnings and plan next week.

**Focus Areas:**
- Launch retrospective
- KPI review
- Issue triage
- Next steps

**Key Deliverables:**
- Day-1 retrospective documented
- Week-1 KPI review:
  - Total signups
  - Trial activations
  - Paid conversions
  - Traffic sources
  - Top issues
- Top 5 launch learnings documented
- Week-2 priorities defined
- Thank-you emails to engaged supporters

**Expected Outcome:** Clear post-launch direction.

**Success Criteria:**
- Retrospective written
- KPIs documented
- Week-2 plan in place

**Depends On:** Phase 164

---

## What Comes After Phase 165

This document covers Sherpa Labs from zero to public launch (~165 phases, ~26-30 weeks for solo dev).

Post-launch growth and expansion phases (SEO content strategy, creator partnerships, B2B outreach, intermediate-tier templates, additional language support beyond Hindi, etc.) are documented at a high level in `SHERPA_LABS_MASTER_PLAN.md` under the "Future Features & Expansion Roadmap" section. A separate `SHERPA_LABS_GROWTH.md` can be created later when post-launch direction is clearer based on real user data.

---

*Sherpa Labs Development Plan v1.0.0 — May 2026*
*Better rules. Smarter agents.*
