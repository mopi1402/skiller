import { describe, expect, it } from 'vitest'
import { parseArgs, usage } from './args.js'

describe('parseArgs', () => {
  it('builds when no argument is given', () => {
    expect(parseArgs([])).toEqual({ kind: 'build' })
  })

  it('recognises the version flag in both forms', () => {
    expect(parseArgs(['--version'])).toEqual({ kind: 'version' })
    expect(parseArgs(['-v'])).toEqual({ kind: 'version' })
  })

  it('recognises the help flag in both forms', () => {
    expect(parseArgs(['--help'])).toEqual({ kind: 'help' })
    expect(parseArgs(['-h'])).toEqual({ kind: 'help' })
  })

  // The point of the whole module: an argument we do not know must never fall
  // through to a build, which would rewrite a dist tree for someone who was
  // only asking a question.
  it('refuses an unknown argument instead of building', () => {
    expect(parseArgs(['--dry-run'])).toEqual({
      kind: 'error',
      message: 'unknown argument: --dry-run',
    })
  })

  it('refuses a recognised flag carrying extra arguments', () => {
    expect(parseArgs(['--version', 'build'])).toEqual({
      kind: 'error',
      message: 'unexpected arguments: build',
    })
  })
})

describe('usage', () => {
  it('names the version and the config file it reads', () => {
    const text = usage('9.9.9')

    expect(text).toContain('skiller 9.9.9')
    expect(text).toContain('.skiller.json')
  })
})
