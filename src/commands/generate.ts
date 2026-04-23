import type { Config } from '../tokens/types.ts'
import { generateTailwindJs } from '../generators/tailwind-js.ts'
import { generateThemeTs } from '../generators/theme-ts.ts'
import { generateGlobalsCss } from '../generators/globals-css.ts'
import { writeBlock, ensureSentinels } from '../utils/sentinel.ts'
import { success, info, error, dim } from '../utils/log.ts'
import { resolveHost, resolveTargetPath, type HostContext } from '../utils/resolve-host.ts'

function renderBlock(type: Config['targets'][number]['type'], config: Config): string {
  switch (type) {
    case 'tailwind-js': return generateTailwindJs(config.tokens)
    case 'theme-ts':    return generateThemeTs(config.tokens)
    case 'globals-css': return generateGlobalsCss(config.tokens)
  }
}

export async function runGenerate(host?: HostContext): Promise<number> {
  const ctx = host ?? await resolveHost()
  let hadError = false
  for (const target of ctx.config.targets) {
    const absPath = resolveTargetPath(ctx, target.path)
    const hasSentinels = await ensureSentinels(absPath, target.sentinel).catch(() => false)
    if (!hasSentinels) {
      error(`${target.path}: missing sentinel markers.`)
      const startMarker = target.sentinel === 'css' ? '/* TOKENS:START */' : '// TOKENS:START'
      const endMarker   = target.sentinel === 'css' ? '/* TOKENS:END */'   : '// TOKENS:END'
      info(dim(`   Add these markers somewhere in the file, then re-run:`))
      info(dim(`     ${startMarker}`))
      info(dim(`     ${endMarker}`))
      hadError = true
      continue
    }
    const block = renderBlock(target.type, ctx.config)
    const { action } = await writeBlock(absPath, target.sentinel, block)
    if (action === 'updated') {
      success(`${target.path} — ${target.type} block updated`)
    } else {
      info(`${dim('·')} ${target.path} — already up to date`)
    }
  }
  return hadError ? 1 : 0
}
