import { describe, it, expect } from 'vitest'
import { scanFile } from '../src/lint/rules.ts'

function rules(content: string): string[] {
  return scanFile('test.tsx', content).map((v) => v.rule)
}

describe('no-hex-literal', () => {
  it('flags a hex literal in source', () => {
    expect(rules(`const c = '#E63946'`)).toContain('no-hex-literal')
  })
  it('flags 8-digit hex (with alpha)', () => {
    expect(rules(`const c = '#E63946FF'`)).toContain('no-hex-literal')
  })
  it('does not flag inside a // line comment', () => {
    expect(rules(`// e.g. #E63946 — sample`)).not.toContain('no-hex-literal')
  })
  it('escape hatch on same line suppresses', () => {
    expect(rules(`const c = '#E63946' // design-system:allow-raw legacy import`)).not.toContain('no-hex-literal')
  })
  it('escape hatch on previous line suppresses', () => {
    const src = [`// design-system:allow-raw token cleanup pending`, `const c = '#E63946'`].join('\n')
    expect(rules(src)).not.toContain('no-hex-literal')
  })
})

describe('no-color-function-literal', () => {
  it('flags rgba with literals', () => {
    expect(rules(`background: rgba(255, 0, 0, 0.5)`)).toContain('no-color-function-literal')
  })
  it('flags oklch with literals', () => {
    expect(rules(`color: oklch(0.5 0.2 30)`)).toContain('no-color-function-literal')
  })
  it('does not flag rgb() with no digits (unlikely but defensive)', () => {
    expect(rules(`color: rgb(var(--r), var(--g), var(--b))`)).not.toContain('no-color-function-literal')
  })
})

describe('no-arbitrary-tailwind-value', () => {
  it('flags p-[13px]', () => {
    expect(rules(`<div className="p-[13px]" />`)).toContain('no-arbitrary-tailwind-value')
  })
  it('flags bg-[#fff]', () => {
    expect(rules(`<div className="bg-[#fff]" />`)).toContain('no-arbitrary-tailwind-value')
  })
  it('does not flag data-[state=open]', () => {
    expect(rules(`<div className="data-[state=open]:bg-primary" />`)).not.toContain('no-arbitrary-tailwind-value')
  })
  it('does not flag aria-[checked=true]', () => {
    expect(rules(`<div className="aria-[checked=true]:underline" />`)).not.toContain('no-arbitrary-tailwind-value')
  })
})

describe('no-raw-palette-class', () => {
  it('flags bg-red-500', () => {
    expect(rules(`<div className="bg-red-500" />`)).toContain('no-raw-palette-class')
  })
  it('flags text-zinc-400 with opacity', () => {
    expect(rules(`<div className="text-zinc-400/60" />`)).toContain('no-raw-palette-class')
  })
  it('does not flag bg-primary', () => {
    expect(rules(`<div className="bg-primary" />`)).not.toContain('no-raw-palette-class')
  })
})

describe('no-inline-numeric-layout', () => {
  it('flags style={{ padding: 16 }}', () => {
    expect(rules(`<div style={{ padding: 16 }} />`)).toContain('no-inline-numeric-layout')
  })
  it('does not flag padding: 0 (structural)', () => {
    expect(rules(`<div style={{ padding: 0 }} />`)).not.toContain('no-inline-numeric-layout')
  })
  it('does not flag outside style block', () => {
    expect(rules(`const obj = { padding: 16 }`)).not.toContain('no-inline-numeric-layout')
  })
})

describe('no-template-literal-hex', () => {
  it('flags backtick string with raw hex literal', () => {
    expect(rules('const c = `border: 1px solid #fff`')).toContain('no-template-literal-hex')
  })
  it('flags template with raw hex even when other interpolations are present', () => {
    expect(rules('const c = `${prefix} #aabbcc ${suffix}`')).toContain('no-template-literal-hex')
  })
  it('does not flag pure `#${expr}` interpolation (no literal hex digits)', () => {
    // by design — runtime-computed values are out of scope for static lint
    expect(rules('const c = `#${hex}`')).not.toContain('no-template-literal-hex')
  })
})
