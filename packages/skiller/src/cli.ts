#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { parseArgs, usage } from './args.js'
import { runBuilds } from './build.js'
import { ConfigError, loadConfig } from './config.js'

/** Read from the manifest rather than duplicated here, so it cannot drift from what is published. */
function packageVersion(): string {
  const manifest = readFileSync(new URL('../package.json', import.meta.url), 'utf8')
  return (JSON.parse(manifest) as { version: string }).version
}

function main(): void {
  const command = parseArgs(process.argv.slice(2))

  if (command.kind === 'error') {
    process.stderr.write(`skiller: ${command.message}\n\n${usage(packageVersion())}`)
    process.exit(1)
  }
  if (command.kind === 'version') {
    process.stdout.write(`${packageVersion()}\n`)
    return
  }
  if (command.kind === 'help') {
    process.stdout.write(usage(packageVersion()))
    return
  }

  const configPath = resolve(process.cwd(), '.skiller.json')

  try {
    runBuilds(loadConfig(configPath))
  } catch (error) {
    if (error instanceof ConfigError) {
      process.stderr.write(`skiller: ${error.message}\n`)
      process.exit(1)
    }
    throw error
  }
}

main()
