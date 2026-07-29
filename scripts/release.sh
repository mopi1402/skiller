#!/usr/bin/env bash
#
# Guarded manual publish for @tayomi/skiller.
#
# It never publishes blind: it refuses on a dirty tree, refuses if a changeset
# is still pending (you bumped nothing), replays the core.md invariants, shows
# the exact tarball, and asks before pushing to npm. Publishing is close to
# irreversible (a version cannot be republished), so every check is a gate.
#
# Prerequisite, run BEFORE this script and reviewed by you:
#   pnpm changeset          # describe the change and the bump
#   pnpm changeset version  # apply the version + CHANGELOG, then commit it
#
# Then: pnpm release
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PKG_DIR="$ROOT/packages/skiller"
cd "$ROOT"

fail() { printf '\033[31mrelease: %s\033[0m\n' "$1" >&2; exit 1; }
info() { printf '\033[36m==> %s\033[0m\n' "$1"; }

# 1. Clean working tree: never publish uncommitted or half-staged state.
if ! git diff --quiet || ! git diff --cached --quiet; then
  fail "working tree is dirty. Commit or stash before releasing."
fi

# 2. No changeset left pending: an unconsumed changeset means the version was
#    not bumped, so you would republish the current (already published) version.
if compgen -G "$ROOT/.changeset/*.md" > /dev/null; then
  for f in "$ROOT"/.changeset/*.md; do
    [ "$(basename "$f")" = "README.md" ] && continue
    fail "a pending changeset exists ($(basename "$f")). Run 'pnpm changeset version' and commit first."
  done
fi

# 3. Replay the standing invariants (the same three core.md oracles).
info "typecheck"; pnpm -r typecheck
info "build";     pnpm -r build
info "test";      pnpm -r test

# 4. Show exactly what would ship, and confirm the version.
VERSION="$(node -p "require('$PKG_DIR/package.json').version")"
NAME="$(node -p "require('$PKG_DIR/package.json').name")"
info "dry-run of the tarball"
( cd "$PKG_DIR" && npm publish --dry-run )

# Confirmation. Pass the version as an argument (pnpm release 0.1.0) for a
# non-interactive run; otherwise prompt when a terminal is attached. A non-TTY
# run with no argument fails loudly rather than publishing unconfirmed.
answer="${1:-}"
if [ -z "$answer" ]; then
  if [ -t 0 ]; then
    printf '\033[33mAbout to publish %s@%s to npm. Type the version to confirm: \033[0m' "$NAME" "$VERSION"
    read -r answer
  else
    fail "no terminal to confirm on. Re-run as: pnpm release $VERSION"
  fi
fi
[ "$answer" = "$VERSION" ] || fail "confirmation did not match ($answer != $VERSION). Aborted, nothing published."

# 5. Publish. prepack (in the package) copies the README and rebuilds.
#    When the account enforces 2FA, pass the one-time code as the second
#    argument: pnpm release <version> <otp>.
OTP="${2:-}"
info "publishing"
if [ -n "$OTP" ]; then
  ( cd "$PKG_DIR" && npm publish --otp="$OTP" )
else
  ( cd "$PKG_DIR" && npm publish )
fi

# 6. Push the version commit and its tag, if a remote is configured.
if git remote | grep -q .; then
  info "pushing commit and tags"
  git push --follow-tags
else
  info "no git remote configured, skipping push (do it by hand when the repo exists)"
fi

info "done: $NAME@$VERSION"
