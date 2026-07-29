import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { runBuild, runBuilds } from './build.js'
import { ConfigError } from './config.js'

let root: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'skiller-build-'))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

function write(path: string, contents: string): void {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, contents)
}

describe('runBuild', () => {
  it('mirrors two builds, each src into its own dist', () => {
    write(join(root, 'src-a', 'SKILL.md'), 'A <!-- note --> ships.\n')
    write(join(root, 'src-b', 'SKILL.md'), 'B <!-- note --> ships.\n')

    runBuild({ src: join(root, 'src-a'), dist: join(root, 'dist-a') })
    runBuild({ src: join(root, 'src-b'), dist: join(root, 'dist-b') })

    expect(readFileSync(join(root, 'dist-a', 'SKILL.md'), 'utf8')).toBe('A ships.\n')
    expect(readFileSync(join(root, 'dist-b', 'SKILL.md'), 'utf8')).toBe('B ships.\n')
  })

  it('compiles markdown and copies every other file through unchanged', () => {
    write(join(root, 'src', 'SKILL.md'), 'Keep this. <!-- drop this -->\n')
    write(join(root, 'src', 'nested', 'run.sh'), '#!/bin/sh\necho <!-- keep -->\n')
    write(join(root, 'src', 'data.json'), '{ "note": "<!-- keep -->" }\n')

    runBuild({ src: join(root, 'src'), dist: join(root, 'dist') })

    expect(readFileSync(join(root, 'dist', 'SKILL.md'), 'utf8')).toBe('Keep this.\n')
    expect(readFileSync(join(root, 'dist', 'nested', 'run.sh'), 'utf8')).toBe(
      '#!/bin/sh\necho <!-- keep -->\n',
    )
    expect(readFileSync(join(root, 'dist', 'data.json'), 'utf8')).toBe(
      '{ "note": "<!-- keep -->" }\n',
    )
  })

  it('creates no dist directory when the src cannot be read', () => {
    expect(() => runBuild({ src: join(root, 'missing'), dist: join(root, 'dist') })).toThrow()

    expect(existsSync(join(root, 'dist'))).toBe(false)
  })
})

describe('runBuilds', () => {
  it('names the folder and writes nothing when a declared src does not exist', () => {
    write(join(root, 'src-a', 'SKILL.md'), 'A <!-- note --> ships.\n')

    expect(() =>
      runBuilds([
        { src: join(root, 'src-a'), dist: join(root, 'dist-a') },
        { src: join(root, 'missing'), dist: join(root, 'dist-b') },
      ]),
    ).toThrow(ConfigError)

    // The valid build must not have run either: one bad entry aborts the whole run.
    expect(existsSync(join(root, 'dist-a'))).toBe(false)
    expect(existsSync(join(root, 'dist-b'))).toBe(false)
  })

  it('rejects a src that is a file rather than a directory', () => {
    write(join(root, 'not-a-dir'), 'plain file\n')

    expect(() =>
      runBuilds([{ src: join(root, 'not-a-dir'), dist: join(root, 'dist') }]),
    ).toThrow(/not a directory/)
  })
})
