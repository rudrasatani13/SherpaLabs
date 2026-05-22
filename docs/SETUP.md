# Local Development Setup

This document records the local development environment for Sherpa Labs. Any contributor who follows these steps should be able to clone the repo and start working in under 15 minutes.

The pinned versions below were verified working on macOS 26.5 (arm64) on 2026-05-22. Newer patch versions are fine; major-version jumps should be evaluated before adoption.

## Required tooling

| Tool | Pinned version | Install command |
| --- | --- | --- |
| Node.js | v22.22.3 (LTS "Jod") | `nvm install $(cat .nvmrc) && nvm use` |
| nvm | 0.39.7 | `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh \| bash` |
| pnpm | 11.1.3 | `corepack enable && corepack prepare pnpm@11.1.3 --activate` (or `npm i -g pnpm@11`) |
| Git | 2.50.1 | Bundled with Xcode CLT, or `brew install git` |
| GitHub CLI | 2.92.0 | `brew install gh` |
| Cloudflare Wrangler | 4.93.1 | `pnpm add -g wrangler` |
| HTTPie | 3.2.4 | `brew install httpie` |
| curl | 8.7.1 | Pre-installed on macOS |
| Homebrew | 5.1.13 | https://brew.sh |

The Node version is pinned in `.nvmrc` at the repo root. Running `nvm use` inside the project picks it up automatically.

## One-time machine setup

### 1. Install nvm and Node

```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# restart shell, then:
nvm install 22.22.3
nvm alias default 22.22.3
```

After cloning the repo, `cd` into it and run `nvm use` — it reads `.nvmrc`.

### 2. Install pnpm and put its global bin on PATH

```sh
npm install -g pnpm@11
pnpm setup           # appends PNPM_HOME and PATH export to ~/.zshrc
source ~/.zshrc
```

`pnpm setup` is required before any `pnpm add -g <pkg>` command — without it, global binaries land in a directory that isn't on PATH.

### 3. Configure Git and GitHub

```sh
git config --global user.name "Your Name"
git config --global user.email "you@example.com"

# Generate an ed25519 SSH key if you don't already have one
test -f ~/.ssh/id_ed25519 || ssh-keygen -t ed25519 -C "you@example.com"

# Authenticate gh and prefer SSH for git operations
gh auth login        # pick SSH, paste your public key when prompted
gh config set git_protocol ssh

# Verify
ssh -T git@github.com
gh auth status
```

If a repo was cloned with HTTPS, switch it with `git remote set-url origin git@github.com:<org>/<repo>.git`.

### 4. Install Wrangler and authenticate to Cloudflare

```sh
pnpm add -g wrangler
wrangler login       # opens a browser, redirects back to localhost
wrangler whoami      # confirm you're signed in
```

> **Status:** `wrangler login` is interactive and was not run as part of automated setup. Run it manually before any Workers work in later phases.

### 5. Install API testing tools

```sh
brew install httpie
```

`curl` is pre-installed; pick whichever you prefer. Examples elsewhere in this repo use both interchangeably.

## Editor configuration

Sherpa Labs is editor-agnostic. The phase requires the following extensions/plugins regardless of which editor you use. Names match the VS Code marketplace; equivalents exist for Cursor, Zed, JetBrains IDEs, and Neovim.

| Capability | VS Code extension | Why |
| --- | --- | --- |
| Linting | `dbaeumer.vscode-eslint` | Inline ESLint errors as you type |
| Formatting | `esbenp.prettier-vscode` | Format-on-save with shared Prettier config |
| Tailwind | `bradlc.vscode-tailwindcss` | Class-name completion + lint |
| Git history | `eamodio.gitlens` | Inline blame, hover history |
| Tests | `vitest.explorer` | Run/debug Vitest from the gutter |
| Error visibility | `usernamehw.errorlens` | Surfaces TS/ESLint errors next to the code |
| Readable TS errors | `yoavbls.pretty-ts-errors` | Renders complex generic errors as readable diagnostics |

For VS Code specifically, you can install all seven in one shot:

```sh
brew install --cask visual-studio-code
for ext in \
  dbaeumer.vscode-eslint \
  esbenp.prettier-vscode \
  bradlc.vscode-tailwindcss \
  eamodio.gitlens \
  vitest.explorer \
  usernamehw.errorlens \
  yoavbls.pretty-ts-errors; do
  code --install-extension "$ext"
done
```

Cursor users can run the same `code --install-extension` commands (Cursor reuses the VS Code marketplace and ships the `cursor` CLI under the same flag set).

## Verifying the environment

Run these from anywhere; all should succeed:

```sh
node --version            # v22.22.3
pnpm --version            # 11.x
git --version             # 2.50.x or newer
gh auth status            # logged in, SSH protocol
ssh -T git@github.com     # "Hi <user>! You've successfully authenticated"
wrangler --version        # 4.x
http --version            # 3.2.x
```

Inside the repo:

```sh
nvm use                   # reads .nvmrc, switches to Node 22.22.3
```

## What's intentionally not here

- **Project scaffolding** (workspaces, packages, shared configs) belongs to Phase 2 and onward. This document only covers tooling that lives on the developer's machine.
- **CI configuration** is set up in a later phase. The local `gh` CLI is only used here to authenticate against GitHub.
- **Cloudflare account provisioning** (zones, R2 buckets, D1 databases) is handled when the relevant feature phase begins. Only the Wrangler CLI is installed locally now.
