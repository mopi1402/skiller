# Golden fixtures

Each folder is one case: `in.md` is the source as an author writes it, `out.md` is the
expected compiled result, byte for byte. A case passes only when compiling `in.md`
produces `out.md` exactly.

Two conventions these fixtures encode:

- A comment occupying whole lines takes its lines with it, leaving no orphan blank line.
- An inline comment collapses the whitespace that surrounded it down to a single space,
  so the sentence reads as if the comment had never been typed.
