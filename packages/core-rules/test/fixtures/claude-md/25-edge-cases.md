# Edge Cases Mix

Some content with unusual structure: an `inline code span`, a [link to docs](https://example.com),
**bold text**, _italic text_, and a horizontal rule below.

---

## A Section After a Rule

- MUST handle horizontal rules without losing context.
- SHOULD treat `---` outside of frontmatter as a structural separator.

## Section With Empty Subsection

### Empty

### Non-Empty

- MUST not crash when sibling sections are empty.

## A Section With Only Prose

This section has no list items, no code blocks, and no tables. It is just text. The parser
should still recognize it as a section and preserve its content for round-trip serialization.
