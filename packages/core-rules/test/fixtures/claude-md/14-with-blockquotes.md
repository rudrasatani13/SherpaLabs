# Blockquote-Driven Conventions

> Important context: this repo serves customer-facing traffic.
> Every change to request handlers MUST be reviewed by an on-call engineer.

## Auth

- MUST verify session tokens server-side; never trust client claims.

> Note: we revoke sessions on password change but NOT on email change.

## Rate Limiting

- MUST enforce per-account quotas at the edge.

> If you change the rate limit values, update the runbook in `docs/runbooks/rate-limits.md`.
