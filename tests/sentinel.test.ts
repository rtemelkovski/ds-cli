import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ensureSentinels, readBlock, writeBlock } from '../src/utils/sentinel.ts'

let dir: string

beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'ds-test-')) })
afterEach(async () => { await rm(dir, { recursive: true, force: true }) })

describe('ensureSentinels', () => {
  it('returns true when both markers present (css)', async () => {
    const f = join(dir, 'g.css')
    await writeFile(f, '/* TOKENS:START */\n/* TOKENS:END */')
    expect(await ensureSentinels(f, 'css')).toBe(true)
  })
  it('returns false when start marker missing', async () => {
    const f = join(dir, 'g.css')
    await writeFile(f, '/* TOKENS:END */')
    expect(await ensureSentinels(f, 'css')).toBe(false)
  })
  it('returns true when both markers present (js)', async () => {
    const f = join(dir, 't.ts')
    await writeFile(f, '// TOKENS:START\n// TOKENS:END')
    expect(await ensureSentinels(f, 'js')).toBe(true)
  })
})

describe('readBlock', () => {
  it('reads content between markers, trimmed', async () => {
    const f = join(dir, 'g.css')
    await writeFile(f, '/* TOKENS:START */\n  hello world  \n/* TOKENS:END */')
    expect(await readBlock(f, 'css')).toBe('hello world')
  })
  it('returns null when start marker missing', async () => {
    const f = join(dir, 'g.css')
    await writeFile(f, 'no markers')
    expect(await readBlock(f, 'css')).toBeNull()
  })
})

describe('writeBlock', () => {
  it('writes new content between markers, preserves outside', async () => {
    const f = join(dir, 'g.css')
    await writeFile(f, 'BEFORE\n/* TOKENS:START */\nold\n/* TOKENS:END */\nAFTER')
    const r = await writeBlock(f, 'css', 'new content')
    expect(r.action).toBe('updated')
    const result = await readFile(f, 'utf8')
    expect(result).toContain('BEFORE')
    expect(result).toContain('AFTER')
    expect(result).toContain('new content')
    expect(result).not.toContain('old')
  })
  it('returns unchanged when content matches', async () => {
    const f = join(dir, 'g.css')
    await writeFile(f, '/* TOKENS:START */\nsame\n/* TOKENS:END */')
    const r = await writeBlock(f, 'css', 'same')
    expect(r.action).toBe('unchanged')
  })
  it('throws when start marker missing', async () => {
    const f = join(dir, 'g.css')
    await writeFile(f, 'no markers')
    await expect(writeBlock(f, 'css', 'x')).rejects.toThrow(/Sentinel/)
  })
  it('js style markers work', async () => {
    const f = join(dir, 't.ts')
    await writeFile(f, '// TOKENS:START\nold\n// TOKENS:END')
    const r = await writeBlock(f, 'js', 'new')
    expect(r.action).toBe('updated')
    expect(await readFile(f, 'utf8')).toContain('new')
  })
})
