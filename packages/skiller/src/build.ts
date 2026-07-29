import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { compile } from './compile.js'
import { ConfigError, type Build } from './config.js'

/**
 * Run every declared build. Every `src` is checked first, so one bad entry
 * aborts before ANY file is written rather than leaving a half-built tree.
 */
export function runBuilds(builds: Build[]): void {
  for (const build of builds) {
    let isDirectory: boolean
    try {
      isDirectory = statSync(build.src).isDirectory()
    } catch {
      throw new ConfigError(`src "${build.src}" does not exist`)
    }
    if (!isDirectory) {
      throw new ConfigError(`src "${build.src}" is not a directory`)
    }
  }

  for (const build of builds) runBuild(build)
}

/**
 * Mirror one src tree into its dist, compiling markdown and copying the rest.
 * It only writes and overwrites, never deletes: a source removed from src
 * leaves its compiled copy behind until someone removes it by hand.
 */
export function runBuild(build: Build): void {
  mirror(build.src, build.dist)
}

function mirror(srcDir: string, distDir: string): void {
  // Read before creating, so a src that cannot be read leaves no empty dist behind.
  const entries = readdirSync(srcDir, { withFileTypes: true })
  mkdirSync(distDir, { recursive: true })
  for (const entry of entries) {
    const srcPath = join(srcDir, entry.name)
    const distPath = join(distDir, entry.name)
    if (entry.isDirectory()) {
      mirror(srcPath, distPath)
    } else if (entry.isFile()) {
      if (entry.name.endsWith('.md')) {
        writeFileSync(distPath, compile(readFileSync(srcPath, 'utf8')))
      } else {
        copyFileSync(srcPath, distPath)
      }
    }
  }
}
