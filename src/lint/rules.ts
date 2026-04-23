export interface Violation {
  readonly file: string
  readonly line: number
  readonly column: number
  readonly rule: string
  readonly snippet: string
  readonly hint: string
}

const VARIANT_PREFIXES = new Set([
  'data', 'aria', 'has', 'group', 'peer', 'not', 'supports',
  'group-data', 'group-has', 'peer-data', 'peer-has',
  'before', 'after', 'placeholder', 'selection', 'first', 'last',
  'odd', 'even', 'motion-safe', 'motion-reduce',
])

const RAW_PALETTE = [
  'slate', 'gray', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime',
  'green', 'emerald', 'teal', 'cyan', 'sky',
  'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
].join('|')

const RAW_PALETTE_RE = new RegExp(
  `\\b(bg|text|border|ring|shadow|divide|placeholder|accent|caret|fill|stroke|outline|decoration|from|via|to)-(${RAW_PALETTE})-(50|100|200|300|400|500|600|700|800|900|950)(?:/\\d+)?\\b`,
  'g',
)

const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g
const COLOR_FN_RE = /\b(rgb|rgba|hsl|hsla|oklch|lab|lch)\s*\([^)]*\d[^)]*\)/gi
const ARBITRARY_TW_RE = /\b([a-z][a-z0-9]*(?:-[a-z0-9]+)*)-\[([^\]]+)\]/g
const TEMPLATE_WITH_HEX_RE = /`[^`]*#[0-9a-fA-F]{3,8}[^`]*`/g

const INLINE_STYLE_LAYOUT_RE =
  /(padding|margin|borderRadius|width|height|fontSize|lineHeight|letterSpacing|top|bottom|left|right|gap|paddingTop|paddingBottom|paddingLeft|paddingRight|paddingHorizontal|paddingVertical|marginTop|marginBottom|marginLeft|marginRight|marginHorizontal|marginVertical)\s*:\s*(\d+(?:\.\d+)?)\b/g

function isNonZeroNumeric(str: string): boolean {
  const n = Number(str)
  return Number.isFinite(n) && n !== 0
}

const ALLOW_RAW_RE = /\/\/\s*design-system:allow-raw/
const BLOCK_ALLOW_RE = /\/\*\s*design-system:allow-raw/

function stripLineComment(line: string): string {
  let inString: '"' | "'" | '`' | null = null
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    const prev = line[i - 1]
    if (inString) {
      if (ch === inString && prev !== '\\') inString = null
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = ch
      continue
    }
    if (ch === '/' && line[i + 1] === '/') {
      return line.slice(0, i)
    }
  }
  return line
}

function lineAllowsRaw(line: string, prevLine: string | undefined): boolean {
  return ALLOW_RAW_RE.test(line) || (prevLine !== undefined && ALLOW_RAW_RE.test(prevLine)) ||
         BLOCK_ALLOW_RE.test(line)
}

function isVariantMatch(prefix: string): boolean {
  return VARIANT_PREFIXES.has(prefix.toLowerCase())
}

function looksLikeCssValue(content: string): boolean {
  return /\d/.test(content) || /#[0-9a-fA-F]/.test(content) ||
         /(px|rem|em|%|vh|vw|deg|turn|fr)\b/.test(content)
}

export function scanFile(file: string, content: string): Violation[] {
  const violations: Violation[] = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] ?? ''
    const prev = i > 0 ? lines[i - 1] : undefined
    if (lineAllowsRaw(rawLine, prev)) continue
    const line = stripLineComment(rawLine)
    const lineNo = i + 1

    HEX_RE.lastIndex = 0
    for (const m of line.matchAll(HEX_RE)) {
      const col = (m.index ?? 0) + 1
      violations.push({
        file, line: lineNo, column: col,
        rule: 'no-hex-literal',
        snippet: rawLine.trim(),
        hint: 'Use a semantic token: `bg-primary`, `text-foreground`, `colors.X`, or `var(--primary)`.',
      })
    }

    COLOR_FN_RE.lastIndex = 0
    for (const m of line.matchAll(COLOR_FN_RE)) {
      const col = (m.index ?? 0) + 1
      violations.push({
        file, line: lineNo, column: col,
        rule: 'no-color-function-literal',
        snippet: rawLine.trim(),
        hint: 'Use a semantic token. If the alpha variant is repeated, add it to tokens.ts as an overlay.',
      })
    }

    if (/className\s*[=:]/.test(line) || /cn\s*\(/.test(line) || /clsx\s*\(/.test(line) ||
        /tw`/.test(line) || /["'`]/.test(line)) {
      ARBITRARY_TW_RE.lastIndex = 0
      for (const m of line.matchAll(ARBITRARY_TW_RE)) {
        const prefix = m[1] ?? ''
        const content = m[2] ?? ''
        if (isVariantMatch(prefix)) continue
        if (!looksLikeCssValue(content)) continue
        if (content.startsWith('&') || content.startsWith('@') || content.includes('=')) continue
        const col = (m.index ?? 0) + 1
        violations.push({
          file, line: lineNo, column: col,
          rule: 'no-arbitrary-tailwind-value',
          snippet: rawLine.trim(),
          hint: 'Use a value from the scale (e.g. `p-4`, `rounded-lg`, `h-11`). If the value is truly missing from the scale, add it to tokens.ts.',
        })
      }
    }

    RAW_PALETTE_RE.lastIndex = 0
    for (const m of line.matchAll(RAW_PALETTE_RE)) {
      const col = (m.index ?? 0) + 1
      violations.push({
        file, line: lineNo, column: col,
        rule: 'no-raw-palette-class',
        snippet: rawLine.trim(),
        hint: 'Use a semantic token: `bg-primary`, `text-muted-foreground`, `border-border-strong`.',
      })
    }

    if (/style\s*=\s*\{\{/.test(line) || /StyleSheet\.create/.test(line) ||
        /^\s*\w+\s*:\s*\{/.test(line)) {
      INLINE_STYLE_LAYOUT_RE.lastIndex = 0
      for (const m of line.matchAll(INLINE_STYLE_LAYOUT_RE)) {
        const value = m[2] ?? ''
        if (!isNonZeroNumeric(value)) continue
        const col = (m.index ?? 0) + 1
        violations.push({
          file, line: lineNo, column: col,
          rule: 'no-inline-numeric-layout',
          snippet: rawLine.trim(),
          hint: 'Use a Tailwind class (`p-4`, `rounded-lg`, `h-11`). If a native prop requires a number, import from theme.ts.',
        })
      }
    }

    TEMPLATE_WITH_HEX_RE.lastIndex = 0
    for (const m of rawLine.matchAll(TEMPLATE_WITH_HEX_RE)) {
      const col = (m.index ?? 0) + 1
      violations.push({
        file, line: lineNo, column: col,
        rule: 'no-template-literal-hex',
        snippet: rawLine.trim(),
        hint: 'Template literal contains a hex color. Use a semantic token — template literals bypass the no-hex rule.',
      })
    }
  }

  return violations
}
