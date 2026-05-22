# SHERPA LABS — Master Plan (Product & Business)

---

**Version:** 2.0.0
**Last Updated:** May 2026
**Status:** Active — Pre-MVP
**Brand:** Sherpa Labs
**Flagship Product:** Sherpa — AI Agent Rules Optimizer
**Tagline:** Better rules. Smarter agents.
**Companion Doc:** `SHERPA_LABS_DEVELOPMENT.md` (phase-by-phase development guide)

---

## About This Document

This is the **product and business** master plan for Sherpa Labs. It contains the why, the what, and the who — but **not the how-to-build**. For step-by-step development instructions, see `SHERPA_LABS_DEVELOPMENT.md`.

This document covers:
- What Sherpa Labs is and why it exists
- Product scope and MVP definition
- Target users
- Pricing, monetization, and business model
- Distribution and launch strategy (high level)
- Future expansion roadmap
- Risks and founding principles

---

## Table of Contents

1. [Product Overview](#product-overview)
2. [Strategic Context](#strategic-context)
3. [Core Product Identity](#core-product-identity)
4. [Product Principles](#product-principles)
5. [Target Users & Use Cases](#target-users--use-cases)
6. [MVP Scope](#mvp-scope)
7. [Tech Stack Summary](#tech-stack-summary)
8. [Monetization & Pricing](#monetization--pricing)
9. [Distribution Strategy](#distribution-strategy)
10. [Future Roadmap](#future-roadmap)
11. [Risks & Mitigation](#risks--mitigation)
12. [Founding Principles](#founding-principles)

---

## Product Overview

Sherpa Labs is an indie-bootstrapped umbrella brand building developer tools for the AI coding era. Every modern dev team uses Cursor, Claude Code, Cline, Windsurf, or Continue — and every team produces config artifacts (CLAUDE.md, .cursorrules, AGENTS.md, MCP server configs) that directly determine whether their AI agents succeed or fail. These artifacts are written by hand, copy-pasted from blog posts, drift across repositories, and have no quality bar. Bad rules silently degrade output. Inconsistent MCP servers break in production. There is no tool that treats agent configuration as first-class infrastructure.

The Sherpa Labs flagship product, **Sherpa**, treats AI agent configuration as a continuously-audited, version-controlled, team-synchronized asset. A free CLI scores and improves your CLAUDE.md and .cursorrules locally. A paid SaaS dashboard tracks audit scores over time, syncs canonical rules across a team's repos, and runs CI checks that flag rule regressions before they hit production.

A second product, **aimcp-lint**, is a focused MCP server linter. It runs deterministic checks (protocol compliance, schema validity, security, performance) and emits CI-friendly scores. This product targets the most active growth area of the ecosystem — MCP servers — where 17,000+ servers exist (as of late 2025) and tooling is still immature.

Both CLIs are MIT-licensed and free forever. Cloud features (history, sync, team workspaces, GitHub App, PR comments) are paid SaaS. The line between free and paid is workflow, not features.

Future products in the umbrella are explicitly **features added to the Sherpa dashboard**, not standalone CLIs. AI-assisted commit messages, rule-aware changelogs, and similar conveniences become Pro-tier dashboard features instead of separate npm packages competing in saturated commodity spaces (where free alternatives like `git-cliff` already dominate).

The MVP targets serious solo developers and 3–10 person engineering teams running multiple AI coding tools, with India-friendly pricing via Paddle as Merchant of Record handling global tax and currency compliance.

---

## Strategic Context

### Why Now

AI coding tools have crossed mainstream adoption. Independent research (March 2026):

- Cursor: 7 million MAU, 1 million DAU, 50,000 paying teams, ~$2B ARR
- Claude Code: ~4.2 million WAU, ~$2.5B annual run-rate revenue, doubling
- Windsurf: ~$100M ARR, 700,000 individual users, 1,000 enterprise customers
- 73% of engineering teams use AI tools daily
- MCP ecosystem: 17,000+ servers, 97M+ SDK downloads, supported by Claude, ChatGPT, Gemini, Cursor, Windsurf

Every team using these tools generates configuration artifacts that determine output quality. The pain is real and growing.

### Why Indie / Solo-Buildable

This is not a venture-scale opportunity that requires a large team. It is an indie-scale opportunity where:

- The core insight (configuration as infrastructure) is small enough to build solo
- The technical moat is in the team layer (sync, history, dashboard), not raw compute
- The MIT-licensed CLI distribution path is a single-founder GTM motion
- Realistic revenue targets ($5K-15K MRR within 12 months) are achievable solo

### Why The Plan Looks Different From The First Draft

The initial Sherpa Labs concept proposed shipping `aicommit` first as audience builder, then Sherpa, then more tools — with shared "umbrella infrastructure" built upfront. Independent research from both Claude and Perplexity flagged three problems with that plan:

1. **`aicommit` is the wrong wedge.** The space is saturated (`aicommits` ~8.9k stars, `opencommit` ~7.2k stars, both free, no paid tier). Nobody pays for AI commit messages. Distribution value: yes. Revenue: no.

2. **Free competitors already exist for Sherpa's core audit.** `claudex-setup` (npx) already does "score 0-100, auto-fix CLAUDE.md, 972 techniques" for free. `claudecode-harness`, `ruleprobe`, `ECC/agentshield`, and others overlap. **The audit logic is not the moat.** The moat is the team layer.

3. **The umbrella brand trap.** Building shared auth + Stripe + dashboard infra before any product has MRR is classic solo-founder scope creep disguised as architecture. It takes 4–6 weeks and validates nothing.

The current plan corrects all three:

- **aimcp-lint and Sherpa are both built**, with aimcp-lint targeting the least crowded niche (MCP) and Sherpa targeting the highest-value niche (team rule sync)
- **The Sherpa moat is the team layer** (sync, versioning, multi-repo dashboard) — not the audit. Free CLIs handle audit; SaaS handles workflow.
- **No umbrella infra until product 2** — shared auth/billing/dashboard is extracted only after the first product proves traction. (In the merged development plan, both products share infra from the start since they're built sequentially under one brand, but the same minimalism applies: build the simplest thing that works first.)

---

## Core Product Identity

| Attribute | Value |
|-----------|-------|
| Brand | Sherpa Labs |
| Flagship Product | Sherpa |
| Tagline | Better rules. Smarter agents. |
| Category | Developer Tools / AI Coding Infrastructure |
| Platform | TypeScript CLI (npm) + Web Dashboard + Edge API |
| Core Hook | Treat AI agent config as version-controlled, team-synchronized infrastructure |
| Primary Differentiator | The team layer — multi-repo sync, audit history, cross-tool consistency. Free CLIs handle audit. SaaS handles workflow. |
| Privacy Promise | Local-first by default. CLI works offline. Cloud sync is opt-in and stores only rule content + scores, never user source code. |
| License | MIT for CLI packages and core libraries. Closed for dashboard and API. |
| Founder Constraint | Solo developer, India-based, < $50/month infra budget |

---

## Product Principles

1. **The CLI is the product. The dashboard is the business.** Both must be excellent. The CLI must work fully offline with zero account required. The dashboard is what justifies $49/month.

2. **Local-first by default.** No telemetry without explicit opt-in. No source code leaves the developer's machine. Source files are read locally; only audit scores and rule artifacts touch the network when sync is enabled.

3. **One painkiller beats five vitamins.** Rule audit is a vitamin for individuals; team sync is a painkiller for teams. Build for teams; price for individuals as an entry tier.

4. **Speed of first value.** A user must see a real audit score for their repo within 60 seconds of running `npx sherpa audit`. No account. No signup. No friction.

5. **Defaults matter more than configuration.** Most users will never touch a config file. Defaults must produce useful output on the first run.

6. **Ship narrow, validate deeply.** Two products done excellently beats five products done poorly. Aimcp-lint and Sherpa are the only standalone products for the first 12 months.

7. **Don't build umbrella infra prematurely.** Shared auth, billing, and dashboards are extracted only after the first product has paying customers — not built upfront on the assumption of future scale.

8. **Cross-tool neutrality.** Cursor, Claude Code, Cline, Windsurf, Continue — all are first-class. Single-tool features are a strategic mistake.

9. **OSS as distribution, SaaS as revenue.** CLIs are MIT-licensed and free forever. Cloud infrastructure is paid. The line between them is workflow, not features.

10. **Brutal scope discipline.** Solo dev capacity is the binding constraint. If a feature does not directly produce MRR or unblock acquisition, it is cut.

11. **India-first compliance.** Paddle as Merchant of Record from day one. No Stripe direct until a US entity exists. GST and international tax handled by MoR, not the founder.

---

## Target Users & Use Cases

### Primary Segments

| Segment | Core Need | Market Fit |
|---------|-----------|------------|
| Solo senior devs running Claude Code daily | Better rules → better agent output. Pay $9/mo for individual Pro. | Strong — large addressable population, low decision friction |
| 3–10 person AI-heavy startups | Consistent rules across team repos, audit history, onboarding new devs. Pay $49/mo team tier. | Very strong — primary revenue target |
| MCP server authors | Validate servers before publishing. Catch protocol and security issues in CI. | Strong — emerging market, no incumbent |
| Indie hackers building with AI agents | Cheaper than Cursor team plan, complementary to it. | Medium — price-sensitive, willing to try OSS |
| Platform / DevEx teams at scale-ups (50+ devs) | Standardize AI tool usage across orgs. Pay $99-200/seat enterprise. | Latent — post-MVP target |

### Secondary Segments (Post-MVP)

- DevRel teams at AI infrastructure companies wanting to certify their MCP servers
- Open-source maintainers shipping CLAUDE.md templates
- Agencies building AI features for clients (template marketplace play)
- Education / bootcamp programs teaching AI-assisted development

### Use Case Scenarios

- A 26-year-old senior engineer at a 12-person YC startup running `npx sherpa audit` on the team monorepo, getting a 47/100 score, fixing the top 5 issues, and seeing agent suggestions improve immediately
- A platform lead at a 40-dev fintech wanting all repos to use the same canonical CLAUDE.md, with CI checks that fail PRs introducing rule drift
- An MCP server author at an AI startup running `aimcp-lint` against their dev server before publishing to mcp.so, catching a missing schema field and a stdio protocol violation
- A solo indie hacker switching between Cursor and Claude Code on the same project, frustrated that .cursorrules and CLAUDE.md keep diverging, paying $9/mo for cross-tool sync
- A DevRel engineer at an LLM company maintaining the canonical "best practices" CLAUDE.md template, using Sherpa to validate it against real repos before publishing
- A Bangalore-based 5-person SaaS team paying ₹2,999/month for Sherpa Team (Paddle's Razorpay rails for India), syncing rules across their 3 product repos

---

## MVP Scope

The MVP delivers two products under one brand: aimcp-lint and Sherpa (CLI + Cloud Dashboard).

### Sherpa MVP — Must-Have Features

| Layer | Features |
|-------|----------|
| **CLI (Free, OSS)** | `sherpa init` (stack-aware template generation), `sherpa audit` (scores rule files 0-100 with specific suggestions), `sherpa convert` (cross-tool conversion), multi-format support (CLAUDE.md, .cursorrules, AGENTS.md, .cursor/rules/, .windsurfrules, .continue/config.yaml) |
| **Cloud Dashboard (Paid)** | Sign in with GitHub via Clerk, connect repos via GitHub PAT, audit history with trends and charts, workspace + team management, canonical rules editor with version history |
| **Team Sync (Paid)** | `sherpa sync` CLI command pulls canonical rules from workspace, sync modes (overwrite / merge / check), CI integration for rule drift detection |
| **GitHub Integration (Paid)** | GitHub App for PR-time audits, PR comments with score and violations, commit status checks, optional GitHub Action alternative |
| **AI-Augmented Audit (BYO Key)** | Optional `--ai` flag uses user's Anthropic/OpenAI API key for deeper LLM-driven analysis. Sherpa never absorbs LLM cost. |
| **Multi-Tool Support** | Cursor, Claude Code, Cline, Windsurf, Continue all first-class. Cross-tool consistency checks. |

### aimcp-lint MVP — Must-Have Features

| Layer | Features |
|-------|----------|
| **CLI (Free, OSS)** | Connect to MCP servers via stdio + SSE, 20+ deterministic lint rules across Protocol/Schema/Security/Performance categories, composite scoring, JSON + Markdown + terminal output, CI integration via `--fail-under` |
| **GitHub Action** | Drop-in composite action posting PR comments with lint results and commit status checks |

### Cut From MVP (Not Built In V1)

- A/B testing of rules — too complex, defer to v2
- VS Code / Cursor / Claude Code IDE extensions — distribution via npx is faster; extensions are post-revenue work
- MCP server marketplace — separate company-worthy product
- Self-hosted dashboard — cloud-only for v1; on-prem after enterprise contracts
- SSO / SCIM / SAML — added when first enterprise lead appears, not before
- Multi-region data residency — single region for v1
- Standalone aicommit / aichangelog CLIs — these become Sherpa Pro features in Phase 2

### Out of Scope Entirely

- Building or hosting MCP servers (Smithery's territory)
- Code-search or codebase chat features (Greptile / Sourcegraph)
- Agent orchestration platforms (Vibe Kanban)
- Direct competition with Cursor / Claude Code as IDEs
- Replacing GitHub Copilot or Cursor as the agent itself

---

## Tech Stack Summary

The technical stack is optimized for solo dev productivity and < $50/month infra cost. Full implementation details are in `SHERPA_LABS_DEVELOPMENT.md`.

| Layer | Choice | Why |
|-------|--------|-----|
| Monorepo | pnpm workspaces (no Turborepo for v1) | Lowest overhead for solo dev |
| Language | TypeScript (strict mode everywhere) | Type safety critical for CLI + API contracts |
| CLI framework | Commander.js + tsup | Mature, small, no surprises |
| Backend runtime | Hono on Cloudflare Workers | Global edge, zero cold start, generous free tier |
| Database | Neon Postgres + Drizzle ORM | Serverless, branch-per-PR support, edge-friendly |
| Auth | Clerk | Best DX, $0 to 10k MAU, native Organizations = team tier |
| Payments | Paddle (Merchant of Record) | Non-negotiable for Indian founder — handles global tax + compliance |
| Frontend | Next.js 14 App Router + shadcn/ui + Tailwind | Standard, fast, large ecosystem |
| Charts | Recharts | React-native, declarative, small bundle |
| Email | Resend | Cheapest transactional email with great DX |
| Hosting (dashboard) | Vercel | Best Next.js integration, generous free tier |
| Hosting (API) | Cloudflare Workers | $5/month for 10M requests; free below |
| Docs | Mintlify | Best free tier for indie devs |
| Analytics | PostHog | Privacy-respecting, cookie-free option |
| Error tracking | Sentry | Free 5k events/month |

### Estimated Infra Cost At Launch

| Component | Cost |
|-----------|------|
| Cloudflare Workers | $0–5/month |
| Neon Postgres | $0 (free tier) |
| Vercel | $0 (free tier) |
| Clerk | $0 (free tier up to 10k MAU) |
| Sentry | $0 (free tier) |
| PostHog | $0 (free tier) |
| Resend | $0 (free tier) |
| Paddle | 5% + $0.50/transaction (only on revenue) |
| Domain | $12/year |
| **Total fixed cost** | **< $25/month** |

---

## Monetization & Pricing

### Pricing Tiers

| Feature | Free | Pro Individual ($9/mo) | Pro Team ($49/mo) | Enterprise (Custom) |
|---------|------|------------------------|--------------------|---------------------|
| CLI (aimcp-lint + sherpa) | ✓ | ✓ | ✓ | ✓ |
| Local audits | Unlimited | Unlimited | Unlimited | Unlimited |
| Cloud audit storage | 7 days | 90 days | Unlimited | Unlimited |
| Repos connected | 3 | 10 | Unlimited | Unlimited |
| Audit submissions / month | 50 | Unlimited | Unlimited | Unlimited |
| GitHub Action / App | ✓ | ✓ | ✓ | ✓ |
| Workspace seats | 1 | 1 | 5 (then $7/seat/mo) | Unlimited |
| Canonical rules (sync) | ✗ | ✗ | ✓ | ✓ |
| AI-powered audits (BYO key) | ✗ | ✓ | ✓ | ✓ |
| Slack / Discord notifications | ✗ | ✓ | ✓ | ✓ |
| Multi-tool sync (Cursor + Claude + Windsurf) | Basic | ✓ | ✓ | ✓ |
| SSO / SAML | ✗ | ✗ | ✗ | ✓ |
| Audit logs | ✗ | ✗ | 30 days | Unlimited |
| Dedicated support | ✗ | Email | Email + Slack | Slack + on-call |
| SLA | ✗ | ✗ | ✗ | 99.9% |
| Annual discount | — | 17% (~2 months free) | 17% | Negotiated |

### India Pricing (via Paddle's Razorpay rails)

| Tier | India Pricing |
|------|---------------|
| Pro Individual | ₹499/mo or ₹4,990/yr |
| Pro Team | ₹2,999/mo or ₹29,990/yr |

### Why Paddle (Merchant of Record) for Indian Founder

| Factor | Stripe Direct | Paddle MoR |
|--------|---------------|------------|
| Indian founder support | Limited (invite-only, US entity preferred) | Full support, KYC-friendly |
| Global tax compliance | Founder's burden | Paddle handles 100% |
| GST registration in EU/UK/AU | Required at low thresholds | Paddle covers |
| INR payouts to Indian bank | Possible but complex | Net wire transfer, no friction |
| Transaction fee | 2.9% + $0.30 | 5% + $0.50 |
| Setup time | Weeks (with US LLC) | Days (Paddle KYC) |

**The 2% fee delta is cheap insurance against months of tax compliance work.**

### Revenue Projections

| MAU | Conservative MRR | Base MRR | Strong MRR |
|-----|------------------|----------|------------|
| 100 | $50 | $150 | $400 |
| 500 | $250 | $750 | $2,000 |
| 2,000 | $1,000 | $3,000 | $8,000 |
| 5,000 | $2,500 | $7,500 | $20,000 |
| 10,000 | $5,000 | $15,000 | $40,000 |

*Assumptions:*
- *Conservative: 2% paid conversion, $20 ARPPU (mostly $9 Individual)*
- *Base: 5% paid conversion, $25 ARPPU (mix shifts to Team)*
- *Strong: 8% paid conversion, $40 ARPPU (mostly Team + some Enterprise)*

### Reality Check (From Research)

- Median solo dev tools reach $1K MRR within 12–18 months
- Top quartile reaches $5K MRR in 12 months
- $10K MRR in 6 months is top 5% scenario
- 30% of indie SaaS attempts abandon before $1K MRR; 50% plateau between $1K-10K (SoftwareSeni Jan 2026 data)

**Honest year-1 target: $5K-15K MRR if execution is strong. $1K-3K MRR is the median path.**

### Pricing Principles

1. **Free tier delivers real value** — not a crippled demo. CLI is fully usable, just limited cloud features.
2. **Team tier is the real product** — Individual is a funnel. Pricing reflects that.
3. **No dark patterns** — clear cancel, prorated refunds, easy export.
4. **Annual discount = 17%** (2 months free) — drives LTV without giving away margin.
5. **India pricing is mandatory** — $9/mo is a non-starter for mass India adoption.
6. **Enterprise priced custom** — never publish enterprise prices; let conversations set value.
7. **30-day refund** — Paddle supports this. Reduces friction to first payment.

---

## Distribution Strategy

### Acquisition Channel Priority

1. **Hacker News Show HN posts** (highest leverage for dev tools)
2. **Twitter / X presence** (founder brand)
3. **Claude Code / Cursor / Windsurf Discord communities** (highest-intent audience)
4. **SEO content** (6-month payoff but compounds)
5. **Creator partnerships** (organic + high trust)
6. **Newsletter mentions** (paid + organic)
7. **Reddit** (specific subs, careful tone)
8. **Cold outreach** (low ROI early, useful later for B2B)
9. **Product Hunt** (badge value, low conversion)

### Hacker News Tactics (2026)

- "Show HN" titles with surprising data or specific numbers
- Wednesday or Thursday, 8-10am EST launch time
- Live demo link in post body
- Active in comments for 8+ hours
- Founder narrative beats marketing copy

### Twitter Strategy

- Target accounts to engage with genuinely: @simonw, @karpathy, @swyx, @mitchellh, @thorstenball, @continuedev
- Post format: concrete technical finding + screenshot
- Build in public (#buildinpublic) with honest MRR updates

### Reddit Subs That Matter

- r/ClaudeAI (high signal)
- r/cursor (Cursor community)
- r/SideProject (indie hackers)
- r/programming (larger, harder to convert)
- r/ExperiencedDevs (opinionated but pays)

### Channels NOT to Pursue Early

- Paid ads (Google, Meta, Twitter) — burn cash before product-market fit
- LinkedIn cold outreach — wrong audience for dev tools
- Tech conferences — expensive, slow payoff
- Affiliate networks — premature

---

## Future Roadmap

### Phase 2 (Months 7–18 Post-Launch)

| Feature | Description | Priority |
|---------|-------------|----------|
| CLAUDE.md template marketplace | Curated, community-ranked templates ($5–15 one-time) | High — strong adjacent revenue |
| MCP server marketplace integration | Browse, install, lint MCP servers from one dashboard | High — extends aimcp-lint moat |
| VS Code extension | Inline rule audit + suggestions | Medium — distribution play |
| Cursor extension | Same idea, Cursor-native | Medium |
| Custom rule authoring | Teams write their own audit rules in JS | High — extensibility |
| AI-augmented sync conflict resolution | LLM helps merge canonical rules with local edits | Medium |
| Audit comparison across teams | Anonymized benchmarks ("Your team is in top 20%") | Low — vanity feature |
| Public rule library | Searchable database of best-in-class CLAUDE.md files | High — SEO + community |
| Mobile app | Read-only audit history on mobile | Low — most users won't use |
| Agent run replay | Capture agent runs, audit retrospectively | Medium — research-y |

### Phase 3 (Months 19–36 Post-Launch)

| Feature | Description |
|---------|-------------|
| Full Agent QA Platform | Test agent runs end-to-end, including MCP server tests, output quality, cost tracking |
| Rule effectiveness measurement | A/B test rules against agent task completion rates |
| Custom audit rule SDK | Public SDK so power users can ship their own rules |
| White-label dashboard | Sell to other dev tools as their audit infrastructure |
| Compliance certifications | SOC 2, HIPAA-eligible (for healthcare-adjacent customers) |
| Self-hosted enterprise | On-prem deployment for security-sensitive companies |
| Multi-language support | Tamil, Spanish, Portuguese (after Hindi proves out) |
| API access for power users | Programmatic audits, custom integrations |
| Plugin ecosystem | Sherpa Plugin Store for community-contributed audit rules |
| Acquisition target | Position for acquisition by GitHub / Anthropic / Cursor / Datadog |

### Languages Roadmap (Post-Hindi)

| Language | Priority | Rationale |
|----------|----------|-----------|
| Hindi | V1 (Phase 112 of dev plan) | India is major market for AI dev tools |
| Tamil | Phase 2 | South India underserved |
| Spanish | Phase 2-3 | Latin America dev tool growth |
| Portuguese | Phase 2-3 | Brazil dev tool growth |
| Japanese | Phase 3 | Premium dev tool market |
| German | Phase 3 | Enterprise market in Europe |

---

## Risks & Mitigation

### Technical Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| MCP protocol changes break aimcp-lint | High | Medium | Pin SDK version; subscribe to MCP spec updates; test against new releases weekly |
| Heuristic audit produces false positives | High | Medium | Confidence thresholds; user feedback loop (👍/👎 on each violation); regular tuning |
| LLM API costs spiral on AI audits | Medium | Low | BYO API key model — Sherpa never absorbs cost |
| Cloudflare Workers limits hit at scale | Medium | Low | Hono is portable — can switch to Hono on Node + Fly.io if needed |
| Neon database limits at scale | Medium | Low | Free tier good for 100k+ rows; upgrade to $19/mo when needed |
| Paddle KYC rejected | High | Low | Apply early; have LemonSqueezy or Dodo Payments as backup |

### Business Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| **claudex-setup / claudecode-harness improve faster** | High | High | Speed strategy: ship team layer (sync, dashboard) before they can. Focus moat where SaaS infra is required. |
| **Anthropic adds `claude doctor` native command** | High | Medium | Cross-tool neutrality (Cursor + Windsurf + Cline) is the moat. Anthropic builds for Claude Code only. |
| **Cursor adds rules validator** | Medium | Medium | Same — Cursor builds for Cursor. Team layer + cross-tool play is harder. |
| **Demand doesn't exist at $9 price point** | High | Medium | Test with DMs in beta before public pricing. Move to Team-tier-first messaging if Individual flops. |
| **Solo dev burnout** | Very High | High | Strict scope: one product at a time. Take a week off after each major launch. |
| **Indian tax / payments complexity** | Medium | Medium | Paddle handles 90% of this. CA for the rest. ₹15-25K/yr is the price of compliance peace. |
| **OSS contributors fork and compete** | Low | Low | MIT license assumes this risk. SaaS revenue model means forks don't hurt. |
| **Cursor / Cognition acquires direct competitor** | Medium | Low | Move fast. Establish brand before market consolidates. |

### Product Risks

| Risk | Mitigation |
|------|------------|
| Free tier too generous → no upgrades | Limit cloud audit storage to 7 days; gate team features and sync hard |
| Free tier too stingy → no signups | Local CLI fully functional; only cloud features gated |
| Trial too short → no conversions | 14-day Team trial without credit card; multiple touchpoints during trial |
| Trial too long → no urgency | 14-day cap; clear "ends in N days" countdown |
| Onboarding too complex → drop-off | First value (an audit score) within 60 seconds; no signup required for CLI |
| Cloud sync feels invasive → trust loss | Make it crystal clear: rules go to cloud, code never does. Document at every touchpoint. |

### UX Risks

| Risk | Mitigation |
|------|------------|
| CLI feels generic | Polished output, helpful errors, fast startup |
| Dashboard feels generic | Strong visual identity, clear data viz, opinionated defaults |
| Setup takes > 5 minutes | "No account required" path; cloud sync is opt-in second step |
| Users don't understand the team value | Explicit before/after demo on landing: "Without Sherpa: rules drift across repos. With Sherpa: synced canonical rules everywhere." |
| Error messages are confusing | Write errors as: what / why / what to try |

### Founder Risks (Solo, India-Based)

| Risk | Mitigation |
|------|------------|
| Tax structure complexity | Paddle handles global tax. Indian CA for domestic compliance. Budget ₹15-25K/yr. |
| Time zone gap for US customers | Clear async support SLA. Personal touch in first responses. Document expected response times. |
| Solo dev burnout | Validation gates, scope discipline, planned breaks after launches. |
| Cash flow before revenue | < $50/month infra cost means runway extends indefinitely. Don't quit day job until $2K+ MRR. |
| Trademark / branding | Don't spend money on trademark filing until $5K MRR. Basic name search sufficient for now. |

---

## Founding Principles

These principles should never be violated, regardless of market pressure or competitive moves:

1. **The CLI works fully offline without an account.** Sign-in is opt-in for cloud features only. Never paywall the CLI itself.

2. **Source code never leaves the developer's machine.** Only rule files and audit scores touch the network. Document this prominently in privacy policy and marketing.

3. **No tracking without consent.** Telemetry is opt-in (default NO) and only sends version + platform info.

4. **Cross-tool neutrality.** Cursor, Claude Code, Cline, Windsurf, Continue — all are first-class. No favorites, no preferred tools.

5. **Free tier delivers real value.** Not a crippled demo. Solo devs can use Sherpa free forever for personal projects.

6. **No umbrella infra before paying customers.** Shared auth + Stripe + dashboard is extracted only after the first product has MRR.

7. **Ship MIT-licensed.** OSS is the distribution strategy. Cloud infrastructure is the revenue strategy.

8. **Paddle from day one.** No Stripe direct, no LemonSqueezy, no Indian payment gateway gymnastics. Paddle handles compliance.

9. **Honest pricing, no dark patterns.** Easy cancel. Pro-rated refunds. Clear annual discount math. Cancellation in 2 clicks, not 10.

10. **Brutal scope discipline.** Solo dev capacity is the binding constraint. If a feature does not directly produce MRR or unblock acquisition, it is cut.

---

## Companion Documents

- **`SHERPA_LABS_DEVELOPMENT.md`** — Phase-by-phase development guide (~165 phases from foundation to public launch)
- **`sherpa-labs-claude.md`** — Original Claude research report (market validation, competitor analysis, risks)
- **`sherpa-labs-perplexity.md`** — Perplexity research report (live web data, citations, additional context)

---

*Sherpa Labs Master Plan v2.0.0 — May 2026*
*Better rules. Smarter agents.*
