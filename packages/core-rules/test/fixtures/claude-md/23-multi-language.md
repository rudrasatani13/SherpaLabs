# Polyglot Repository

This repo ships a TypeScript dashboard, a Python ML pipeline, a Rust packet inspector, and a
Go control plane. The conventions below cross language boundaries.

## Shared Rules

- MUST keep all language toolchains pinned in their lockfiles.
- MUST run language-specific formatters in pre-commit; never bypass with `--no-verify`.

## TypeScript

- MUST target `ES2022`; do not lower for older runtimes without an RFC.

## Python

- MUST use type hints; mypy strict mode is required.

## Rust

- MUST forbid `unsafe` in application crates; only allowed in vetted system crates.

## Go

- MUST keep modules at Go 1.23 or later.

## Cross-Language

- SHOULD prefer ProtoBuf for service-to-service contracts.
- MAY use OpenAPI for browser-facing endpoints when ProtoBuf is overkill.
