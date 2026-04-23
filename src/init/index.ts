import { confirm, input, select, checkbox } from '@inquirer/prompts'
import { join, relative, isAbsolute } from 'node:path'
import { detectProject } from './detect.ts'
import { STARTER_TOKENS_TS, buildConfigTs, writeIfMissing, injectSentinels, fileExists, type ConfigTargetSpec } from './scaffold.ts'
import { setupHuskyPreCommit, ensureHuskyInPackageJson } from './husky.ts'
import { writeStandaloneCIWorkflow } from './ci.ts'
import { runGenerate } from '../commands/generate.ts'
import { resolveHost } from '../utils/resolve-host.ts'
import { success, info, warn, bold, dim, error } from '../utils/log.ts'
import type { TargetType } from '../tokens/types.ts'

const TARGET_LABELS: Record<TargetType, string> = {
  'globals-css': 'globals-css   — Tailwind 4 CSS variable block (web)',
  'tailwind-js': 'tailwind-js   — tailwind.config.js theme block (RN / older Tailwind)',
  'theme-ts':    'theme-ts      — TS theme constants (React Native)',
}

function toRelFromDesignSystem(hostRoot: string, absOrRelPath: string): string {
  // design-system/ lives at <hostRoot>/design-system/. paths in config.ts are relative to that.
  const abs = isAbsolute(absOrRelPath) ? absOrRelPath : join(hostRoot, absOrRelPath)
  const dsDir = join(hostRoot, 'design-system')
  return relative(dsDir, abs)
}

export async function runInit(cwd: string = process.cwd()): Promise<number> {
  info(bold('ds init — bootstrap design-system/ in this project'))
  info(dim(`cwd: ${cwd}`))
  info('')

  // greenfield-only: refuse if config already exists
  if (await fileExists(join(cwd, 'design-system', 'config.ts'))) {
    error('design-system/config.ts already exists in this project. ds init is greenfield-only.')
    info(dim('Edit design-system/config.ts directly to change settings, or delete the folder to start over.'))
    return 1
  }

  const det = await detectProject(cwd)
  info(`Detected: package manager=${dim(det.packageManager)}, framework=${dim(det.framework)}, husky=${dim(String(det.hasHusky))}, ci=${dim(det.ciProvider)}`)
  info('')

  // 1. targets
  const targetTypes = await checkbox<TargetType>({
    message: 'Which generators do you want?',
    choices: [
      { name: TARGET_LABELS['globals-css'], value: 'globals-css', checked: det.framework === 'next' || det.framework === 'vite' || det.framework === 'unknown' },
      { name: TARGET_LABELS['tailwind-js'], value: 'tailwind-js', checked: det.framework === 'expo' },
      { name: TARGET_LABELS['theme-ts'],    value: 'theme-ts',    checked: det.framework === 'expo' },
    ],
    required: true,
  })

  // 2. for each target, file path
  const targetSpecs: ConfigTargetSpec[] = []
  for (const type of targetTypes) {
    let candidates: readonly string[] = []
    if (type === 'globals-css') candidates = det.globalsCssCandidates
    if (type === 'tailwind-js') candidates = det.tailwindConfigCandidates
    if (type === 'theme-ts')    candidates = det.themeTsCandidates

    let chosen: string
    if (candidates.length > 0) {
      chosen = await select<string>({
        message: `Path for ${type} target (relative to project root):`,
        choices: [
          ...candidates.map((c) => ({ name: c, value: c })),
          { name: 'custom path…', value: '__custom__' },
        ],
        default: candidates[0],
      })
      if (chosen === '__custom__') {
        chosen = await input({ message: `Enter custom path for ${type}:` })
      }
    } else {
      chosen = await input({
        message: `Path for ${type} target (relative to project root, file will be created if missing):`,
      })
    }
    targetSpecs.push({ type, relPath: toRelFromDesignSystem(cwd, chosen) })
  }

  // 3. lint roots
  const defaultLintRoots = det.sourceDirs.length > 0 ? det.sourceDirs.join(', ') : 'src'
  const lintRootsRaw = await input({
    message: 'Comma-separated lint roots (relative to project root):',
    default: defaultLintRoots,
  })
  const lintPaths = lintRootsRaw.split(',').map((s) => s.trim()).filter(Boolean)
    .map((p) => toRelFromDesignSystem(cwd, p))

  // 4. husky?
  const wantHusky = await confirm({
    message: det.hasHusky ? 'Husky detected — append ds check && ds lint to .husky/pre-commit?' : 'Set up husky pre-commit (ds check + ds lint)?',
    default: true,
  })

  // 5. CI?
  const wantCI = det.ciProvider === 'github'
    ? await confirm({ message: 'Write .github/workflows/design-system.yml?', default: true })
    : false
  if (det.ciProvider === 'gitlab') {
    warn('GitLab CI detected — automatic workflow generation not implemented. Add a job manually that runs `ds check && ds lint`.')
  }

  // 6. inject sentinels into existing files?
  const filesToInject: { absPath: string; sentinel: 'css' | 'js' }[] = []
  for (const spec of targetSpecs) {
    const abs = join(cwd, 'design-system', spec.relPath) // resolved from design-system/
    const realAbs = join(cwd, relative(cwd, join(cwd, 'design-system', spec.relPath)))
    // simpler: target paths are stored relative to design-system/, resolve relative to cwd
    const targetAbs = join(cwd, 'design-system', spec.relPath)
    const sentinel = spec.type === 'globals-css' ? 'css' : 'js'
    if (await fileExists(targetAbs)) {
      const ok = await confirm({
        message: `Found existing ${relative(cwd, targetAbs)}. Inject TOKENS markers and run generate now? (preserves everything outside the markers)`,
        default: true,
      })
      if (ok) filesToInject.push({ absPath: targetAbs, sentinel })
    }
  }

  info('')
  info(bold('Writing files...'))

  // tokens.ts + config.ts
  const tokensPath = join(cwd, 'design-system', 'tokens.ts')
  const configPath = join(cwd, 'design-system', 'config.ts')
  const tokensRes = await writeIfMissing(tokensPath, STARTER_TOKENS_TS)
  const configRes = await writeIfMissing(configPath, buildConfigTs({ targets: targetSpecs, lintPaths }))
  success(`design-system/tokens.ts ${tokensRes === 'created' ? 'created' : 'exists, skipped'}`)
  success(`design-system/config.ts ${configRes === 'created' ? 'created' : 'exists, skipped'}`)

  // sentinels
  for (const { absPath, sentinel } of filesToInject) {
    const r = await injectSentinels(absPath, sentinel)
    success(`${relative(cwd, absPath)} — sentinels ${r === 'injected' ? 'injected' : 'already present'}`)
  }

  // husky
  if (wantHusky) {
    const pkgRes = await ensureHuskyInPackageJson(cwd)
    if (pkgRes.added) success('package.json — husky devDep + prepare script added')
    const hookRes = await setupHuskyPreCommit(cwd)
    if (hookRes.wrote) success(`.husky/pre-commit ${hookRes.needsInstall ? 'created' : 'updated'}`)
    if (hookRes.needsInstall) {
      info(dim(`  → run \`${det.packageManager} install\` to activate the hook`))
    }
  }

  // CI
  if (wantCI) {
    const ciRes = await writeStandaloneCIWorkflow(cwd)
    if (ciRes.created) {
      success(`${relative(cwd, ciRes.path)} created`)
      info(dim(`  → edit the workflow's git clone URL to point at your ds-cli fork before pushing`))
    } else {
      info(dim(`  · ${relative(cwd, ciRes.path)} already exists, skipped`))
    }
  }

  // try to run generate now if we have sentinels
  if (filesToInject.length > 0) {
    info('')
    info(bold('Running ds generate...'))
    try {
      const ctx = await resolveHost(cwd)
      await runGenerate(ctx)
    } catch (e) {
      warn(`generate failed: ${e instanceof Error ? e.message : String(e)}`)
      info(dim('Fix the issue and re-run `ds generate`.'))
    }
  }

  info('')
  success('ds init complete.')
  info(dim('Next: edit design-system/tokens.ts to define your palette, then `ds generate`.'))
  if (wantHusky) info(dim(`Then: ${det.packageManager} install (to activate the husky hook).`))
  return 0
}
