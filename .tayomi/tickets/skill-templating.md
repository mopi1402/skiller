# Skill sources compiled to shipped skills

As a skill author, I want to write author-only comments in my skill sources and have them stripped at build time, so that notes meant for me never reach the model's context.

## Problem to solve
A `SKILL.md` is loaded verbatim into the model's context. Any note written for the author (why a step exists, a parked alternative, a reminder) is text the model pays for, so today the choice is to omit the note or to ship it. Markdown has no comment syntax of its own: CommonMark passes `<!-- ... -->` through as raw HTML, so the comment is invisible in rendered HTML but perfectly present in the file Claude Code reads. There is no build step between what is written and what ships.

## Proposal
Split the skills in two: an editable source tree, and a generated tree that ships. A build script parses each markdown source with mdast, removes every comment, and writes the result to the generated tree.

- **Config**: a `.skiller.json` file at the repo root declares one or more builds, each a `src`/`dist` pair, and nothing else:
  ```json
  {
    "builds": [
      { "src": "skills-src/core", "dist": "plugins/core/skills" },
      { "src": "skills-src/observability", "dist": "plugins/observability/skills" }
    ]
  }
  ```
  An object holding the array rather than a bare array, so a global option can be added later without breaking the format. Paths are relative to the config file. JSON so no parsing dependency is needed. The build reads it from the current directory and fails with a clear message when it is missing, malformed, or declares no build. Every build is independent and follows the same rules.
- **Layout**: the source tree mirrors the dist tree, path for path (`<src>/research/SKILL.md` becomes `<dist>/research/SKILL.md`). No destination metadata inside the files.
- **Parsing**: `mdast-util-from-markdown` (already a dependency), with the frontmatter extension so the YAML block is a `yaml` node and never mistaken for content.
- **What a comment is**: mdast has no comment node. A comment is an `html` node whose value opens with `<!--`. Both block and inline comments land on that same node type. The predicate is `value.trimStart().startsWith('<!--')`, no regex.
- **Output fidelity**: comments are removed by splicing the source string on the nodes' position offsets. Everything else is byte-identical. No `parse` then `stringify` round trip, which would rewrite escapes, bullets and tables and make every diff unreadable.
- **Non-markdown files** under `<src>` are copied unchanged.
- **Placement**: `skiller` is its own repo and its own npm package, sitting beside tayomi rather than inside it. It imports nothing from tayomi, and tayomi imports nothing from it: tayomi only holds a `.skiller.json` and calls the CLI. Nothing to add to `pnpm-workspace.yaml`.

### Two traps, both measured on the real parser
1. A `<!-- -->` written inside a fenced code block is a `code` node, never an `html` node, so it survives for free. This is why the AST is used rather than a regex over the file.
2. CommonMark ends an HTML block at the end of the line holding `-->`. So `<!-- note --> visible text` parses as a single `html` node whose value is the whole line. Removing the node would delete the visible text. The cut is made at the first `-->`, keeping what follows. The reference plugin `remark-remove-comments` has this bug.

### Known limitations of the AST-driven detection
Because a comment is only recognised when a top-level `html` node's value opens with `<!--`, two author-facing cases survive on purpose, both by the same principle as the fence above:

- A comment nested inside a raw HTML block (`<div>` ... `<!-- note -->` ... `</div>`) is part of the surrounding `html` node, whose value opens with `<div>`, so it is not recognised as a comment.
- A comment indented as an indented code block (a tab, or four or more spaces) is a `code` node, so it survives verbatim. Three-space indentation and comments continuing a list item are still stripped.

These are consequences of the AST choice, not defects. An author who needs such a comment stripped should write it as a plain top-level `<!-- -->`.

### Out of scope for v1
Includes, partials, variables, any templating beyond comment removal. YAML `#` comments in the frontmatter. Drift detection on the generated tree. CLI arguments overriding the config. Per-build options, and any config key beyond `src` and `dist`.

## Acceptance Criteria
- [ ] A block comment in a source file is absent from the built file
- [ ] An inline comment mid-sentence is removed without breaking the sentence
- [ ] A multi-line comment is removed entirely
- [ ] Text following `-->` on the same line survives in the built file
- [ ] A `<!-- -->` inside a fenced code block survives verbatim
- [ ] A source file holding no comment builds byte-identical to its source
- [ ] Outside the removed ranges the output is byte-identical: frontmatter, tables, escapes and bullets are untouched
- [ ] No blank line is left orphaned where a whole-line comment was
- [ ] The directory structure is mirrored, and non-markdown files are copied unchanged
- [ ] The `src` and `dist` folders come from `.skiller.json`, with paths resolved relative to it
- [ ] Every build declared in the config is processed, each mirroring its own `src` into its own `dist`
- [ ] Two builds writing into the same `dist`, or a `dist` sitting inside a `src`, fail before any file is written
- [ ] A missing or malformed `.skiller.json`, or one declaring no build, fails with a message naming the file and what is wrong
- [ ] The package imports nothing from tayomi

## Feature flag
NO. Build-time tool, no runtime behaviour.

## Scenario Testing
- [ ] Is backwards compatible? YES. The existing skills move to `<src>` unchanged and rebuild identical, minus the comments they do not have yet.

```gherkin
Scenario: A block comment does not ship
  Given a source skill holding a comment on its own line
  When the build runs
  Then the built skill holds no comment
  And every other byte is unchanged

Scenario: A comment sharing its line with content
  Given a source line "<!-- note --> visible text"
  When the build runs
  Then the built line is "visible text"

Scenario: A comment inside a code fence is content
  Given a source skill holding "<!-- x -->" inside a fenced code block
  When the build runs
  Then that code block is unchanged

Scenario: A source with no comment is passed through
  Given a source skill holding no comment
  When the build runs
  Then the built file is byte-identical to the source

Scenario: The config drives the folders
  Given a ".skiller.json" declaring one build with its src and its dist
  When the build runs
  Then the sources of that src are built into that dist

Scenario: Several builds in one run
  Given a ".skiller.json" declaring two builds with distinct src and dist folders
  When the build runs
  Then each src is built into its own dist
  And neither build writes into the other's dist

Scenario: Colliding builds are refused
  Given a ".skiller.json" declaring two builds sharing the same dist
  When the build runs
  Then it fails naming the collision
  And no file is written

Scenario: A missing config stops the build
  Given no ".skiller.json" at the root
  When the build runs
  Then it fails with a message naming the missing file
  And no file is written

Scenario: Companion files are copied
  Given a source skill folder holding a script and a reference file
  When the build runs
  Then both are present in the output, unchanged
```
