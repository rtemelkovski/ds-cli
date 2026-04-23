import Color from 'colorjs.io'
import type { Config } from '../tokens/types.ts'
import { generateTailwindJs } from '../generators/tailwind-js.ts'
import { generateThemeTs } from '../generators/theme-ts.ts'
import { generateGlobalsCss } from '../generators/globals-css.ts'
import { readBlock } from '../utils/sentinel.ts'
import { success, error, info, bold, red, dim } from '../utils/log.ts'
import { resolveHost, resolveTargetPath } from '../utils/resolve-host.ts'

function render(type: Config['targets'][number]['type'], config: Config): string {
  switch (type) {
    case 'tailwind-js': return generateTailwindJs(config.tokens)
    case 'theme-ts':    return generateThemeTs(config.tokens)
    case 'globals-css': return generateGlobalsCss(config.tokens)
  }
}

function firstDiffLine(a: string, b: string): { lineNo: number; actual: string; expected: string } | null {
  const aLines = a.split('\n')
  const bLines = b.split('\n')
  const max = Math.max(aLines.length, bLines.length)
  for (let i = 0; i < max; i++) {
    if (aLines[i] !== bLines[i]) {
      return { lineNo: i + 1, actual: aLines[i] ?? '(end of file)', expected: bLines[i] ?? '(end of file)' }
    }
  }
  return null
}

function checkHexOklchAgreement(
  primitives: Config['tokens']['primitives'],
): { primitive: string; hex: string; oklch: string; delta: number }[] {
  const failures: { primitive: string; hex: string; oklch: string; delta: number }[] = []
  for (const [name, value] of Object.entries(primitives)) {
    try {
      const fromHex = new Color(value.hex).to('oklch')
      const storedOklch = new Color(value.oklch)
      const delta = fromHex.deltaE(storedOklch, '2000')
      if (delta > 2) {
        failures.push({ primitive: name, hex: value.hex, oklch: value.oklch, delta })
      }
    } catch {
      failures.push({ primitive: name, hex: value.hex, oklch: value.oklch, delta: Infinity })
    }
  }
  return failures
}

export async function runCheck(): Promise<number> {
  const ctx = await resolveHost()
  let hadError = false

  info(bold('Checking hex ↔ oklch agreement on primitives...'))
  const colorFails = checkHexOklchAgreement(ctx.config.tokens.primitives)
  if (colorFails.length > 0) {
    error(`${colorFails.length} primitive(s) have hex/oklch divergence > 2 ΔE (perceptible drift):`)
    for (const f of colorFails) {
      info(`  ${red(f.primitive)}: hex ${f.hex} vs oklch ${f.oklch} — ΔE=${f.delta.toFixed(2)}`)
    }
    hadError = true
  } else {
    success(`${Object.keys(ctx.config.tokens.primitives).length} primitives agree within ΔE 2.`)
  }

  info('')
  info(bold('Checking generated targets against canonical tokens...'))
  for (const target of ctx.config.targets) {
    const absPath = resolveTargetPath(ctx, target.path)
    const expected = render(target.type, ctx.config).trim()
    const actual = (await readBlock(absPath, target.sentinel).catch(() => null))?.trim() ?? null
    if (actual === null) {
      error(`${target.path}: missing or unreadable sentinel block`)
      hadError = true
      continue
    }
    if (actual !== expected) {
      const diff = firstDiffLine(actual, expected)
      error(`${target.path}: out of sync with design-system/tokens.ts`)
      if (diff) {
        info(`  first diff at line ${diff.lineNo}`)
        info(`  ${red('actual  ')} ${dim(diff.actual)}`)
        info(`  ${red('expected')} ${dim(diff.expected)}`)
      }
      info(dim(`  Run: ds generate`))
      hadError = true
    } else {
      success(`${target.path} — ${target.type} in sync`)
    }
  }

  return hadError ? 1 : 0
}
