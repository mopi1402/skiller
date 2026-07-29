# @tayomi/skiller

The missing build step for agent skills: the file that ships is compiled from sources you maintain,
instead of being the file you hand-write.

A `SKILL.md` has **no imports**. The Agent Skills format has companion files the model loads on
demand, but nothing that assembles a file from pieces before the host reads it. Two consequences,
and skiller exists for both:

- **A rule that must hold across several skills exists in as many hand-written copies**, with no
  single place to correct it. Not a style problem, an authority problem: you cannot prove the rule
  says the same thing everywhere, and copies drift silently.
- **A note written for the author ships with the skill.** Markdown has no comment syntax of its own,
  and CommonMark passes `<!-- ... -->` straight through, so the file the host loads carries it. The
  incentive is backwards: traceability in a skill costs context, so you ration it down to an opaque
  reference number that helps nobody. Compiled from a source, the "why" costs nothing at render
  time, so you write the reason instead of the number.

## Status

Comment stripping is implemented and covered by golden fixtures. **Composable blocks with slots, the
answer to the first point above, are not implemented yet**: the minimum that would solve it is not
"include a file" but "include a file with slots", since a plain include serves the near-identical
copies and leaves out exactly the ones where the wording legitimately diverges per role.

## Install

```sh
pnpm add -D @tayomi/skiller
```

Requires Node 22 or later.

## Use

Declare one or more `src`/`dist` pairs in a `.skiller.json` at your project root:

```json
{
  "builds": [
    { "src": "skills-src/core", "dist": "plugins/core/skills" },
    { "src": "skills-src/observability", "dist": "plugins/observability/skills" }
  ]
}
```

Then run the command from the directory holding that file:

```sh
pnpm skiller
```

Each `src` tree is mirrored into its `dist`, path for path. Markdown files are compiled, every other
file is copied unchanged. Paths are resolved relative to the config file.

The build only writes and overwrites. It never deletes, so a source removed from a `src` tree leaves
its compiled copy behind until you remove it by hand.

## What counts as a comment

Detection runs on the markdown AST, never on a regex over the raw file. A comment is an `html` node
whose value opens with `<!--`, which covers both the block and the inline form.

Removal is a splice on the source string, computed from the node offsets. Outside the removed ranges
the output is byte-identical: frontmatter, tables, escapes and bullets come back exactly as written.

Four shapes, and a comment touching a line boundary never leaves a space against it:

| Source | Compiled |
| --- | --- |
| a whole line, blank line above and below | the line is gone, one blank line remains |
| `text <!-- note --> more` | `text more` |
| `word<!-- note -->word` | `wordword` |
| `text <!-- note -->` at end of line | `text`, no trailing space |

Text after the first `-->` always survives: CommonMark ends an HTML block at the end of the line
holding `-->`, so `<!-- note --> visible text` is a single node, and cutting the whole node would
delete the visible text.

## What survives on purpose

A `<!-- -->` inside a fenced code block is a `code` node, not an `html` node, so it is content and
comes back untouched. Two further cases survive by the same principle:

- a comment nested inside a raw HTML block, since it belongs to the surrounding node
- a comment indented as an indented code block (a tab, or four or more spaces at the top level)

If you need such a comment stripped, write it as a plain top-level `<!-- -->`.

## Not here yet

Composable blocks with slots, as described under Status. Until they land, a shared rule is still
copied by hand into every skill that needs it.

A sync check on the generated tree also has to come: nothing today stops you from editing a compiled
file, and the next build overwrites that edit in silence.

## Out of scope

`#` comments inside the YAML frontmatter, and CLI flags that override the config.

## Repo layout

A pnpm workspace holding one published package.

```
packages/skiller/   the package, published as @tayomi/skiller
examples/basic/     a project consuming it through the real command
```

Three oracles run from the root over every package, so a change never lands red:

```sh
pnpm -r test        # includes the fixture walk, byte for byte
pnpm -r typecheck
pnpm -r build
```

Comment-stripping behaviour is pinned by golden fixtures rather than by hand-written assertions: each
folder under `packages/skiller/src/__fixtures__` holds an `in.md` and the `out.md` it must compile to.
Adding a case is adding a folder, with no test to edit.

This file is the npm page as well: it is copied into the package at pack time, so edit it here.

## License

MIT
