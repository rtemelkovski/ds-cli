import { relative } from 'node:path'
import type { Violation } from '../lint/rules.ts'
import { runLintOnPaths } from '../lint/runner.ts'
import { error, success, info, red, bold, dim } from '../utils/log.ts'
import { resolveHost } from '../utils/resolve-host.ts'

export async function runLint(targetPaths: readonly string[]): Promise<number> {
  const ctx = await resolveHost()
  const paths = targetPaths.length > 0 ? targetPaths : ctx.config.lint.paths
  const { violations, filesScanned } = await runLintOnPaths(
    paths,
    ctx.config.lint.ignore,
    ctx.designSystemDir,
  )

  if (violations.length === 0) {
    success(`Scanned ${filesScanned} file(s) — no design-system violations.`)
    return 0
  }

  const byFile = new Map<string, Violation[]>()
  for (const v of violations) {
    const list = byFile.get(v.file) ?? []
    list.push(v)
    byFile.set(v.file, list)
  }

  info('')
  for (const [file, fileViolations] of byFile) {
    const rel = relative(ctx.hostRoot, file)
    info(bold(rel))
    for (const v of fileViolations) {
      info(`  ${red(`${v.line}:${v.column}`)}  ${v.rule}`)
      info(`    ${dim(v.snippet.slice(0, 140))}`)
      info(`    ↳ ${v.hint}`)
    }
    info('')
  }

  error(`${violations.length} violation(s) across ${byFile.size} file(s). Scanned ${filesScanned} file(s) total.`)
  return 1
}
