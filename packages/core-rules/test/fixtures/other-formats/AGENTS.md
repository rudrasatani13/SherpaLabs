# AGENTS.md

Conventions that apply to any AI coding agent operating on this repository.

## Common Rules

- MUST keep diffs small and focused on a single concern.
- MUST NOT add license headers to new files.
- SHOULD reference the issue number in commit messages.

## Tool-Specific Notes

### Claude Code

- MUST use `Edit` over `Write` for existing files.

### Cursor

- SHOULD prefer the inline edit flow over the chat for tightly scoped changes.

## Stop Conditions

- MUST stop and ask if a single change would touch more than 5 files.
- MUST stop and ask before introducing a new dependency.
