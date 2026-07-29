import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ConfigError, loadConfig } from './config.js'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'skiller-config-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

function writeConfig(contents: string): string {
  const path = join(dir, '.skiller.json')
  writeFileSync(path, contents)
  return path
}

describe('loadConfig', () => {
  it('loads a valid config and resolves paths against the file', () => {
    const path = writeConfig(
      JSON.stringify({ builds: [{ src: 'skills-src', dist: 'skills' }] }),
    )

    const builds = loadConfig(path)

    expect(builds).toEqual([
      { src: join(dir, 'skills-src'), dist: join(dir, 'skills') },
    ])
  })

  it('fails naming the missing file', () => {
    const path = join(dir, '.skiller.json')

    expect(() => loadConfig(path)).toThrow(ConfigError)
    expect(() => loadConfig(path)).toThrow(path)
    expect(() => loadConfig(path)).toThrow(/not found/)
  })

  it('fails on malformed JSON', () => {
    const path = writeConfig('{ "builds": [ ')

    expect(() => loadConfig(path)).toThrow(ConfigError)
    expect(() => loadConfig(path)).toThrow(/not valid JSON/)
  })

  it('fails when no build is declared', () => {
    const path = writeConfig(JSON.stringify({ builds: [] }))

    expect(() => loadConfig(path)).toThrow(ConfigError)
    expect(() => loadConfig(path)).toThrow(/no build/)
  })

  it('fails when two builds share a dist', () => {
    const path = writeConfig(
      JSON.stringify({
        builds: [
          { src: 'a', dist: 'out' },
          { src: 'b', dist: 'out' },
        ],
      }),
    )

    expect(() => loadConfig(path)).toThrow(ConfigError)
    expect(() => loadConfig(path)).toThrow(/share a dist/)
  })

  it('fails when a dist is nested inside a src', () => {
    const path = writeConfig(
      JSON.stringify({ builds: [{ src: 'a', dist: 'a/inner' }] }),
    )

    expect(() => loadConfig(path)).toThrow(ConfigError)
    expect(() => loadConfig(path)).toThrow(/nested inside/)
  })
})
