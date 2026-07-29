## target

Compile skill sources into shipped skills: the `skiller` command reads `.skiller.json`, mirrors each declared `src` into its `dist`, strips every author-only comment from the markdown on the way, and copies everything else through untouched, so notes written for the author never reach the model's context.

## non-goals

- Templating, includes, partials and variables of any kind.
- YAML `#` comments inside the frontmatter block.
- Drift detection on the generated tree.
- CLI flags that override the config.
- Per-build options, or any config key beyond `src` and `dist`.
- Removing stale outputs when a source file is deleted.

## hard-constraints

- Comment detection goes through the mdast AST, never a regex over the raw file.
- Every removed range is computed from the nodes' position offsets and may widen to line or whitespace boundaries; the output is produced by splicing the source string, never by a parse-then-stringify round trip.
- Outside the removed ranges the output is byte-identical to the source.
- The four comment shapes are mutually exclusive: a comment touching a line boundary never leaves a space against that boundary.
- The package imports nothing from tayomi.
- An invalid or colliding config aborts the whole run before any file is written.
- No new runtime dependency beyond the three mdast and micromark packages already installed.
- The build only writes and overwrites; it never deletes a file from a dist tree.

## acceptance

1. Given a comment that occupies its lines entirely, When it is compiled, Then those whole lines are absent from the result and every other byte is unchanged.
2. Given a comment occupying whole lines with a blank line both above and below it, When it is compiled, Then exactly one blank line remains where the comment sat.
3. Given a comment spanning several lines, When it is compiled, Then every one of its lines is absent, not merely the first.
4. Given a comment with visible text both before and after it on the same line, When it is compiled, Then the comment is gone, whitespace that surrounded it collapses to a single space, and when no whitespace surrounded it on either side the adjacent text joins directly with no space inserted.
5. Given a comment starting at the beginning of a line with visible text after its first closing delimiter, When it is compiled, Then that text survives with no leading space left behind.
6. Given a comment ending a line with visible text before it, When it is compiled, Then that text survives with no trailing space left behind.
7. Given a comment written inside a fenced code block, When it is compiled, Then the fence and its content come back unchanged.
8. Given a skill source holding no comment at all, When it is compiled, Then the result is byte-identical to the source, frontmatter, tables, escapes and bullets included.
9. Given the golden fixture folder, When the test suite runs, Then every `in.md` compiles to its `out.md` byte for byte, adding a folder adds a case with no test edit, and the suite refuses to go green on fewer than nine discovered cases or on a folder missing either file.
10. Given a valid `.skiller.json`, When the build runs, Then each declared `src` is mirrored into its own `dist`, with markdown compiled and every other file copied unchanged.
11. Given a `.skiller.json` that is missing, malformed, declares no build, or declares two builds sharing a `dist` or a `dist` nested inside a `src`, When the build runs, Then it exits non-zero naming the file and the problem, and no file has been written.
12. Given a project that depends on the package, When the `skiller` command runs in the folder holding `.skiller.json`, Then the compiled tree is produced, and in `examples/basic` the author notes are gone from `skills/demo/SKILL.md` while the fenced comment survives.

## tasks

- Implement whole-line comment removal, taking the comment's own lines with it (AC: 1)
- Implement the blank-line collapse rule and add the golden fixture that pins it (AC: 2)
- Add the multi-line golden fixture and confirm every line of the comment is removed (AC: 3)
- Implement mid-line comment removal, collapsing surrounding whitespace to one space and inserting no space when the comment had none on either side (AC: 4)
- Add the zero-whitespace golden fixture where two adjacent words join with no space inserted (AC: 4)
- Cut the removal at the first closing delimiter so text after it survives with no leading space (AC: 5)
- Add the end-of-line golden fixture and leave no trailing space before the newline (AC: 6)
- Confirm through the fixture that a fenced comment is a code node and is never removed (AC: 7)
- Guarantee byte-identity outside the removed ranges, with no parse-then-stringify round trip (AC: 8)
- Write the fixture-walking test, self-guarding on at least nine discovered cases each holding both files (AC: 9)
- Implement the config loader and the tree walk that mirrors each src into its dist (AC: 10)
- Unit-test the tree walk on two-build mirroring and on non-markdown copy-through (AC: 10)
- Implement config validation so an invalid or colliding config fails before any write (AC: 11)
- Unit-test the config loader failure paths: missing, malformed, no build, duplicate dist, dist nested in src (AC: 11)
- Add the CLI entry plus the bin field, and wire the example build script (AC: 12)

## done-when

```yaml
# The whole suite passes, including the fixture-walking test, which is self-guarding: it refuses to go green on fewer than nine discovered cases or on a folder missing either file.
- id: tests-green
  verify: pnpm -r test
  pass-if: exit == 0
# Names the fixture-walking test file, symmetric with config-tested and walk-tested, so the criterion fails when that file is absent. Because that test is self-guarding (asserts at least nine discovered cases each holding both files), naming it forces both its existence and the byte-exact compiler acceptances to bite; tests-green alone would stay green on the pre-existing tests.
- id: compile-tested
  verify: pnpm --filter skiller test src/compile.test.ts
  pass-if: exit == 0
# Names the config loader's test file, so the criterion fails when that file is absent (vitest exits non-zero on no test files found). This is what observes the invalid-config acceptance.
- id: config-tested
  verify: pnpm --filter skiller test src/config.test.ts
  pass-if: exit == 0
# Names the tree walk's test file, covering two-build mirroring and non-markdown copy-through, which the single-build example cannot exercise.
- id: walk-tested
  verify: pnpm --filter skiller test src/build.test.ts
  pass-if: exit == 0
# The new compiler, config loader and CLI typecheck under strict nodenext.
- id: typecheck-green
  verify: pnpm -r typecheck
  pass-if: exit == 0
# The package emits dist, which is what the bin field points at.
- id: build-green
  verify: pnpm -r build
  pass-if: exit == 0
# End-to-end through the real command. The build runs before the install so dist/cli.js exists when pnpm links the workspace bin, then the three greps prove the block note and the inline note are gone while the fenced comment survives.
- id: example-compiles
  verify: pnpm -r build && pnpm install && pnpm --filter example-basic build:skills && ! grep -q 'Author note' examples/basic/skills/demo/SKILL.md && ! grep -q 'sitting next to this folder' examples/basic/skills/demo/SKILL.md && grep -q 'this comment is content' examples/basic/skills/demo/SKILL.md
  pass-if: exit == 0
```

## clarifications

- A whole-line comment surrounded by blank lines collapses to exactly one blank line, so the file reads as if the comment had never been typed. A golden fixture pins this, since none of the five original ones cover that shape.
- The build never cleans a dist tree: it writes and overwrites only. A source deleted from its src leaves its compiled copy behind until someone removes it by hand, accepted for v1 rather than having the build delete directories.
- The work happens on branch feat/comment-stripping, created off master while the repo still has zero commits.
- Review pass 1 raised six concerns and all six were arbitrated as fix. The four comment shapes were split into mutually exclusive acceptance items so the end-of-line case leaves no trailing space, multi-line removal was promoted to its own acceptance with a fixture, and the splice hard-constraint was reworded because it contradicted the acceptance it was meant to protect.
- The fixture-walking test is self-guarding rather than the gate naming each fixture: it asserts at least nine discovered cases. The config loader and the tree walk are gated by criteria naming their test files, because the example declares one valid single build and can never exercise a failure path or a second mirror.
- Review pass 2 raised one high and one medium. The high was arbitrated as fix: a compile-tested criterion now names the fixture-walking test file, so the byte-exact compiler acceptances are forced to bite rather than resting on tests-green passing over the pre-existing tests. The medium (config-tested and walk-tested bite on an absent file but not on an empty stub) was rejected: hardening it would require the gate to count assertions, the tasks already name the paths to cover, and an empty stub is visible at post-implementation review.
- Post-implementation code review raised two low concerns. The first is fixed here: a mid-line comment glued to text on both sides (word<!-- -->word) was inserting a space that never existed in the source; the mid-line rule now inserts a space only when whitespace surrounded the comment, and a ninth golden fixture pins the zero-whitespace join, which lifted AC 9's self-guard floor from eight to nine. The second concern (a comment inside a raw HTML block or indented as a code block survives, because the parser does not classify it as a comment node) was accepted as correct-by-construction of the AST-driven detection, the same principle as the fenced case, and documented in the ticket rather than changed.
