import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { scanFile, type Violation } from './rules.ts'

const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css'])

function matchesGlob(pattern: string, path: string): boolean {
  if (pattern.includes('**')) {
    const parts = pattern.split('**')
    const [prefix = '', suffix = ''] = parts
    return path.startsWith(prefix) && path.endsWith(suffix)
  }
  if (pattern.includes('*')) {
    const re = new RegExp('^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '$')
    return re.test(path)
  }
  return path === pattern || path.startsWith(pattern + '/')
}

function shouldIgnore(path: string, patterns: readonly string[], cwd: string): boolean {
  const rel = relative(cwd, path)
  for (const p of patterns) {
    const resolved = p.startsWith('..') ? p : join(cwd, p)
    const relPattern = relative(cwd, resolved)
    if (matchesGlob(relPattern, rel)) return true
    if (matchesGlob(p, rel)) return true
    if (p.startsWith('**/')) {
      if (matchesGlob(p.slice(3), rel.split('/').pop() ?? '')) return true
    }
  }
  return false
}

async function walk(dir: string, acc: string[] = [], ignore: readonly string[], cwd: string): Promise<string[]> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return acc
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist' ||
        entry.name === '.expo' || entry.name === '.git') continue
    const full = join(dir, entry.name)
    if (shouldIgnore(full, ignore, cwd)) continue
    if (entry.isDirectory()) {
      await walk(full, acc, ignore, cwd)
    } else if (entry.isFile()) {
      const dot = entry.name.lastIndexOf('.')
      if (dot === -1) continue
      const ext = entry.name.slice(dot)
      if (!EXTENSIONS.has(ext)) continue
      acc.push(full)
    }
  }
  return acc
}

export interface LintRun {
  readonly violations: readonly Violation[]
  readonly filesScanned: number
}

export async function runLintOnPaths(
  paths: readonly string[],
  ignore: readonly string[],
  cwd: string,
): Promise<LintRun> {
  const allViolations: Violation[] = []
  let filesScanned = 0
  for (const p of paths) {
    const abs = p.startsWith('/') ? p : join(cwd, p)
    let stats
    try {
      stats = await stat(abs)
    } catch {
      continue
    }
    const files: string[] = stats.isDirectory()
      ? await walk(abs, [], ignore, cwd)
      : shouldIgnore(abs, ignore, cwd) ? [] : [abs]
    for (const file of files) {
      const content = await readFile(file, 'utf8')
      const violations = scanFile(file, content)
      allViolations.push(...violations)
      filesScanned++
    }
  }
  return { violations: allViolations, filesScanned }
}
