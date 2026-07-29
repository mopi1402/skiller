import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { compile } from './compile.js'

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '__fixtures__')

const cases = readdirSync(fixturesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()

describe('compile golden fixtures', () => {
  // Floor, so a deleted fixture cannot make the suite pass by having nothing left to run.
  it('discovers at least nine cases', () => {
    expect(cases.length).toBeGreaterThanOrEqual(9)
  })

  for (const name of cases) {
    it(`${name}: in.md compiles to out.md byte for byte`, () => {
      const inPath = join(fixturesDir, name, 'in.md')
      const outPath = join(fixturesDir, name, 'out.md')
      expect(existsSync(inPath), `${name} is missing in.md`).toBe(true)
      expect(existsSync(outPath), `${name} is missing out.md`).toBe(true)

      const input = readFileSync(inPath, 'utf8')
      const expected = readFileSync(outPath, 'utf8')
      expect(compile(input)).toBe(expected)
    })
  }
})
