# Rust CLI Project

## Toolchain

- Rust 1.83.0 stable
- `cargo-nextest` for tests
- `clippy` runs on every PR

## Style

- MUST run `cargo fmt --all` before committing.
- MUST resolve every `clippy::pedantic` warning or annotate `#[allow]` with a reason.
- SHOULD use `anyhow::Result` at the binary boundary, `thiserror` for library errors.
- MAY use `unsafe` only inside a module documented with a SAFETY block.

## Error Handling

- MUST NOT use `unwrap()` outside of tests and `main()`.
- MUST propagate errors with `?`; never silently discard.

## Performance

- SHOULD avoid heap allocations in hot loops.
- SHOULD use `&str` over `String` for read-only arguments.
