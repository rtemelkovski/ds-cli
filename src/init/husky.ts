import { readFile, writeFile, mkdir, chmod } from 'node:fs/promises'
import { join } from 'node:path'
import { fileExists } from './scaffold.ts'

const PRE_COMMIT = `#!/usr/bin/env sh

# design-system: verify generated CSS is in sync with tokens.ts, then run strict lint.
# Lint is advisory until the codebase is clean of legacy violations — flip the
# \`|| true\` to a hard fail once \`ds lint\` returns 0.
ds check || exit 1
ds lint  || true
`

export async function setupHuskyPreCommit(cwd: string): Promise<{ wrote: boolean; preCommitPath: string; needsInstall: boolean }> {
  const huskyDir = join(cwd, '.husky')
  await mkdir(huskyDir, { recursive: true })
  const preCommitPath = join(huskyDir, 'pre-commit')

  if (await fileExists(preCommitPath)) {
    // append the ds lines if not already present
    const existing = await readFile(preCommitPath, 'utf8')
    if (existing.includes('ds check')) {
      return { wrote: false, preCommitPath, needsInstall: !existing.includes('#!/') }
    }
    const merged = existing.trimEnd() + '\n\n' + PRE_COMMIT.split('\n').slice(1).join('\n')
    await writeFile(preCommitPath, merged, 'utf8')
    await chmod(preCommitPath, 0o755)
    return { wrote: true, preCommitPath, needsInstall: false }
  }

  await writeFile(preCommitPath, PRE_COMMIT, 'utf8')
  await chmod(preCommitPath, 0o755)
  return { wrote: true, preCommitPath, needsInstall: true }
}

export async function ensureHuskyInPackageJson(cwd: string): Promise<{ added: boolean }> {
  const pkgPath = join(cwd, 'package.json')
  if (!(await fileExists(pkgPath))) return { added: false }
  const raw = await readFile(pkgPath, 'utf8')
  const pkg = JSON.parse(raw) as Record<string, unknown>
  const scripts = (pkg.scripts ?? {}) as Record<string, string>
  const dev = (pkg.devDependencies ?? {}) as Record<string, string>
  let touched = false
  if (!scripts.prepare?.includes('husky')) {
    scripts.prepare = 'husky'
    pkg.scripts = scripts
    touched = true
  }
  if (!dev.husky) {
    dev.husky = '^9.1.7'
    pkg.devDependencies = dev
    touched = true
  }
  if (touched) {
    await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')
  }
  return { added: touched }
}
