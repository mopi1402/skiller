import { readFileSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve } from 'node:path'

/** One src/dist pair, with paths resolved absolute against the config file. */
export interface Build {
  src: string
  dist: string
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}

/**
 * Read and fully validate a `.skiller.json`. Every problem is caught here, so
 * an invalid config aborts the run before anything is written.
 */
export function loadConfig(configPath: string): Build[] {
  const where = configPath

  let raw: string
  try {
    raw = readFileSync(configPath, 'utf8')
  } catch {
    throw new ConfigError(`${where}: config file not found`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new ConfigError(`${where}: not valid JSON`)
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new ConfigError(`${where}: must be a JSON object holding a "builds" array`)
  }

  const builds = (parsed as Record<string, unknown>).builds
  if (!Array.isArray(builds)) {
    throw new ConfigError(`${where}: "builds" must be an array`)
  }
  if (builds.length === 0) {
    throw new ConfigError(`${where}: declares no build`)
  }

  const baseDir = dirname(configPath)
  const resolved: Build[] = []
  const raws: Array<{ src: string; dist: string }> = []

  for (let i = 0; i < builds.length; i++) {
    const entry = builds[i]
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      throw new ConfigError(`${where}: build ${i} is not an object`)
    }
    const { src, dist } = entry as Record<string, unknown>
    if (typeof src !== 'string' || src === '') {
      throw new ConfigError(`${where}: build ${i} is missing a string "src"`)
    }
    if (typeof dist !== 'string' || dist === '') {
      throw new ConfigError(`${where}: build ${i} is missing a string "dist"`)
    }
    raws.push({ src, dist })
    resolved.push({ src: resolve(baseDir, src), dist: resolve(baseDir, dist) })
  }

  for (let i = 0; i < resolved.length; i++) {
    for (let j = i + 1; j < resolved.length; j++) {
      if (resolved[i].dist === resolved[j].dist) {
        throw new ConfigError(
          `${where}: builds ${i} and ${j} share a dist "${raws[j].dist}"`,
        )
      }
    }
  }

  // Both loops run over every build, i === j included: a dist nested inside its
  // OWN src is the case that would make the build eat its own output.
  for (let i = 0; i < resolved.length; i++) {
    for (let j = 0; j < resolved.length; j++) {
      if (isInside(resolved[i].dist, resolved[j].src)) {
        throw new ConfigError(
          `${where}: build ${i} dist "${raws[i].dist}" is nested inside build ${j} src "${raws[j].src}"`,
        )
      }
    }
  }

  return resolved
}

/** True when `childPath` is `parentPath` itself or lives under it. */
function isInside(childPath: string, parentPath: string): boolean {
  const rel = relative(parentPath, childPath)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}
