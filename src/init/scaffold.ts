import { mkdir, writeFile, readFile, access } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import type { TargetType } from '../tokens/types.ts'

export async function fileExists(p: string): Promise<boolean> {
  try { await access(p); return true } catch { return false }
}

export const STARTER_TOKENS_TS = `import type { Tokens } from 'ds-cli/types'

// TODO: replace these placeholders with your project's palette.
// Run \`ds generate\` after editing to refresh the generated CSS block.
export const tokens: Tokens = {
  primitives: {
    'zinc-50':  { hex: '#FAFAFA', oklch: 'oklch(0.9851 0.0000 89.88)',  notes: 'Foreground' },
    'zinc-500': { hex: '#71717A', oklch: 'oklch(0.5520 0.0136 286.04)', notes: 'Muted' },
    'zinc-900': { hex: '#18181B', oklch: 'oklch(0.2103 0.0059 285.89)', notes: 'Background' },
    'blue-500': { hex: '#3B82F6', oklch: 'oklch(0.6232 0.1879 259.84)', notes: 'Accent — replace with your brand color' },
  },
  semanticColors: {
    background: { alias: 'zinc-900' },
    foreground: { alias: 'zinc-50' },
    muted:      { alias: 'zinc-500' },
    primary:    { alias: 'blue-500' },
  },
  fontFamilies: {
    sans: { className: 'font-sans', fontName: 'system-ui', weight: 400 },
  },
  fontSizes: {
    sm:   { size: 14, leading: 20 },
    base: { size: 16, leading: 24 },
    lg:   { size: 18, leading: 28 },
    xl:   { size: 20, leading: 28 },
    '2xl':{ size: 24, leading: 32 },
  },
  spacing: {
    '0': '0',
    '1': '4px',
    '2': '8px',
    '3': '12px',
    '4': '16px',
    '6': '24px',
    '8': '32px',
  },
  borderRadius: {
    sm: '4px',
    DEFAULT: '8px',
    lg: '12px',
    full: '9999px',
  },
  durations: {
    fast: 150,
    base: 250,
    slow: 400,
  },
  easings: {
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
}
`

export interface ConfigTargetSpec {
  readonly type: TargetType
  readonly relPath: string  // relative to design-system/ (e.g. '../src/app/globals.css')
}

export function buildConfigTs(args: {
  targets: readonly ConfigTargetSpec[]
  lintPaths: readonly string[]   // each relative to design-system/
}): string {
  const targetsBlock = args.targets.map((t) => {
    const sentinel = t.type === 'globals-css' ? 'css' : 'js'
    return `    { type: '${t.type}', path: '${t.relPath}', sentinel: '${sentinel}' },`
  }).join('\n')

  const lintPathsBlock = args.lintPaths.map((p) => `      '${p}',`).join('\n')

  return `import { tokens } from './tokens.ts'
import type { Config } from 'ds-cli/types'

const config: Config = {
  tokens,

  targets: [
${targetsBlock}
  ],

  lint: {
    paths: [
${lintPathsBlock}
    ],
    ignore: [
${args.targets.map((t) => `      '${t.relPath}',`).join('\n')}
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
    ],
  },
}

export default config
`
}

export async function writeIfMissing(path: string, content: string): Promise<'created' | 'exists'> {
  if (await fileExists(path)) return 'exists'
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content, 'utf8')
  return 'created'
}

const SENTINEL_BLOCK_CSS = `
/* Design tokens are owned by design-system/tokens.ts.
   Run \`ds generate\` to refresh the block below.
   Do not hand-edit anything between TOKENS:START and TOKENS:END. */
/* TOKENS:START */
/* TOKENS:END */
`

const SENTINEL_BLOCK_JS = `
// Design tokens are owned by design-system/tokens.ts.
// Run \`ds generate\` to refresh the block below.
// Do not hand-edit anything between TOKENS:START and TOKENS:END.
// TOKENS:START
// TOKENS:END
`

export async function injectSentinels(path: string, sentinel: 'css' | 'js'): Promise<'injected' | 'already-present'> {
  const content = await readFile(path, 'utf8')
  const startMarker = sentinel === 'css' ? '/* TOKENS:START */' : '// TOKENS:START'
  if (content.includes(startMarker)) return 'already-present'
  const block = sentinel === 'css' ? SENTINEL_BLOCK_CSS : SENTINEL_BLOCK_JS
  // append after the first @import or ASCII top, then the body. Simplest: prepend after the first line.
  const lines = content.split('\n')
  // find a sensible insertion point: after the last import / @import line
  let insertAt = 0
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i] ?? ''
    if (l.startsWith('@import') || l.startsWith('import ') || l.startsWith("'use ")) insertAt = i + 1
  }
  lines.splice(insertAt, 0, block)
  await writeFile(path, lines.join('\n'), 'utf8')
  return 'injected'
}
