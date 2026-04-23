import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun'
export type Framework = 'next' | 'expo' | 'vite' | 'unknown'
export type CIProvider = 'github' | 'gitlab' | 'none'

async function exists(p: string): Promise<boolean> {
  try { await stat(p); return true } catch { return false }
}

async function readJson(p: string): Promise<Record<string, unknown> | null> {
  try { return JSON.parse(await readFile(p, 'utf8')) } catch { return null }
}

export async function detectPackageManager(cwd: string): Promise<PackageManager> {
  if (await exists(join(cwd, 'pnpm-lock.yaml'))) return 'pnpm'
  if (await exists(join(cwd, 'yarn.lock')))      return 'yarn'
  if (await exists(join(cwd, 'bun.lockb')))      return 'bun'
  return 'npm' // default — package-lock.json or no lockfile yet
}

export async function detectFramework(cwd: string): Promise<Framework> {
  const pkg = await readJson(join(cwd, 'package.json'))
  const deps = { ...(pkg?.dependencies as Record<string, string> ?? {}), ...(pkg?.devDependencies as Record<string, string> ?? {}) }
  if ('next' in deps) return 'next'
  if ('expo' in deps) return 'expo'
  if ('vite' in deps) return 'vite'
  return 'unknown'
}

export async function detectHusky(cwd: string): Promise<boolean> {
  if (await exists(join(cwd, '.husky'))) return true
  const pkg = await readJson(join(cwd, 'package.json'))
  const deps = { ...(pkg?.dependencies as Record<string, string> ?? {}), ...(pkg?.devDependencies as Record<string, string> ?? {}) }
  return 'husky' in deps
}

export async function detectCI(cwd: string): Promise<CIProvider> {
  if (await exists(join(cwd, '.github', 'workflows'))) return 'github'
  if (await exists(join(cwd, '.gitlab-ci.yml')))       return 'gitlab'
  return 'none'
}

export async function findGlobalsCss(cwd: string): Promise<string[]> {
  const results: string[] = []
  const candidates = [
    'src/app/globals.css',
    'app/globals.css',
    'src/styles/globals.css',
    'styles/globals.css',
    'src/index.css',
    'src/main.css',
  ]
  for (const c of candidates) {
    if (await exists(join(cwd, c))) results.push(c)
  }
  return results
}

export async function findTailwindConfig(cwd: string): Promise<string[]> {
  const results: string[] = []
  for (const name of ['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.mjs', 'tailwind.config.cjs']) {
    if (await exists(join(cwd, name))) results.push(name)
  }
  return results
}

export async function findThemeTs(cwd: string): Promise<string[]> {
  const results: string[] = []
  for (const c of ['src/theme.ts', 'src/core/config/theme.ts', 'src/styles/theme.ts', 'app/theme.ts']) {
    if (await exists(join(cwd, c))) results.push(c)
  }
  return results
}

export async function findSourceDirs(cwd: string): Promise<string[]> {
  // top-level dirs that likely contain app code
  const candidates = ['src', 'app', 'components', 'lib', 'pages', 'hooks', 'actions']
  const found: string[] = []
  for (const c of candidates) {
    if (await exists(join(cwd, c))) {
      const s = await stat(join(cwd, c))
      if (s.isDirectory()) found.push(c)
    }
  }
  // if `src/` exists, prefer just it (most projects nest everything there)
  if (found.includes('src')) return ['src']
  return found
}

export interface ProjectDetection {
  readonly packageManager: PackageManager
  readonly framework: Framework
  readonly hasHusky: boolean
  readonly ciProvider: CIProvider
  readonly globalsCssCandidates: readonly string[]
  readonly tailwindConfigCandidates: readonly string[]
  readonly themeTsCandidates: readonly string[]
  readonly sourceDirs: readonly string[]
}

export async function detectProject(cwd: string): Promise<ProjectDetection> {
  const [packageManager, framework, hasHusky, ciProvider, globalsCssCandidates, tailwindConfigCandidates, themeTsCandidates, sourceDirs] =
    await Promise.all([
      detectPackageManager(cwd),
      detectFramework(cwd),
      detectHusky(cwd),
      detectCI(cwd),
      findGlobalsCss(cwd),
      findTailwindConfig(cwd),
      findThemeTs(cwd),
      findSourceDirs(cwd),
    ])
  return { packageManager, framework, hasHusky, ciProvider, globalsCssCandidates, tailwindConfigCandidates, themeTsCandidates, sourceDirs }
}
