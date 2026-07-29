## target

The skiller workspace never lands red: whenever it is touched, its tests pass, its types check under strict nodenext, and it builds.

## non-goals

- Linting and formatting are not gated: no lint oracle is wired yet, typecheck is the only static gate.
- End-to-end compilation of the example is gated per-spec, not as a standing invariant.
- Coverage of the whole workspace: pnpm -r silently skips a package that declares no such script, so these criteria observe whatever declares it, packages/skiller alone today. A package added tomorrow declares the scripts or is covered by nothing.
- Commit-time enforcement: this repo wires no git hook, so the oracles run at the end of a turn and a commit made by hand is outside their reach.
- The publishable artifact: no criterion here observes that the packed tarball carries a bin that resolves once installed, nor that pack-time steps produced what they claim.

## hard-constraints

- The three oracles run from the repo root via pnpm -r, never package by package.

## done-when

```yaml
# The test suite passes, including the byte-for-byte fixture-walking test that pins the compiler's comment-stripping behaviour.
- id: tests-pass
  verify: pnpm -r test
  pass-if: exit == 0
# Typechecks under strict nodenext (tsc --noEmit), so a type error never survives the turn that introduced it.
- id: typecheck-green
  verify: pnpm -r typecheck
  pass-if: exit == 0
# Compiles to dist, including the dist/cli.js the bin field points at; a stale or broken build fails here. That the bin also RESOLVES from an installed tarball is a separate claim, and nothing here observes it.
- id: build-green
  verify: pnpm -r build
  pass-if: exit == 0
```
