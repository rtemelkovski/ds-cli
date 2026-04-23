#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const cli = join(here, '..', 'src', 'cli.ts')
const tsx = join(here, '..', 'node_modules', '.bin', 'tsx')

const args = process.argv.slice(2)
const child = spawn(tsx, [cli, ...args], { stdio: 'inherit' })
child.on('exit', (code) => process.exit(code ?? 0))
