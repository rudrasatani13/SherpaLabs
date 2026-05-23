# RFC 2119 Keyword Coverage

## Must

- MUST validate user input at trust boundaries.
- MUST NOT log secrets or PII.

## Should

- SHOULD use feature flags for risky rollouts.
- SHOULD NOT couple modules across feature boundaries.

## May

- MAY use experimental APIs in spike branches.
- MAY skip code review for trivial dependency bumps.

## Required and Recommended

- REQUIRED: every public function has a TSDoc comment.
- RECOMMENDED: keep function bodies under 50 lines.

## Optional and Can

- OPTIONAL: enable strict lint rules in new files.
- CAN: vendor third-party utilities when no maintained package exists.
