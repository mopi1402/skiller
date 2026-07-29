/**
 * Argv parsing, kept free of effects so it is testable: `cli.ts` calls `main()`
 * at import time, so a test importing it would run a real build.
 *
 * An unrecognised argument is an error, never a silent build. Swallowing it
 * would rewrite a dist tree for someone who only asked a question.
 */
export type Command =
  | { kind: 'build' }
  | { kind: 'version' }
  | { kind: 'help' }
  | { kind: 'error'; message: string }

export function parseArgs(argv: readonly string[]): Command {
  if (argv.length === 0) return { kind: 'build' }
  if (argv.length > 1) {
    return { kind: 'error', message: `unexpected arguments: ${argv.slice(1).join(' ')}` }
  }

  const arg = argv[0]
  if (arg === '--version' || arg === '-v') return { kind: 'version' }
  if (arg === '--help' || arg === '-h') return { kind: 'help' }
  return { kind: 'error', message: `unknown argument: ${arg}` }
}

export function usage(version: string): string {
  return `skiller ${version}

Compile skill sources into the files that ship, stripping author-only comments.

Usage:
  skiller            compile every build declared in .skiller.json
  skiller --version  print the version
  skiller --help     print this message

The config is read from .skiller.json in the current directory. It declares the
src/dist pairs to compile, and there is no flag to override it.
`
}
