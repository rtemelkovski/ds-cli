import { readFile, writeFile } from 'node:fs/promises'
import type { SentinelStyle } from '../tokens/types.ts'

const MARKERS: Readonly<Record<SentinelStyle, { start: string; end: string }>> = {
  js:  { start: '// TOKENS:START',  end: '// TOKENS:END'  },
  css: { start: '/* TOKENS:START */', end: '/* TOKENS:END */' },
}

export function markers(style: SentinelStyle): { start: string; end: string } {
  return MARKERS[style]
}

export async function readBlock(path: string, style: SentinelStyle): Promise<string | null> {
  const content = await readFile(path, 'utf8')
  const { start, end } = MARKERS[style]
  const startIdx = content.indexOf(start)
  if (startIdx === -1) return null
  const endIdx = content.indexOf(end, startIdx + start.length)
  if (endIdx === -1) return null
  return content.slice(startIdx + start.length, endIdx).trim()
}

export async function writeBlock(
  path: string,
  style: SentinelStyle,
  newBlockContent: string,
): Promise<{ action: 'updated' | 'unchanged' }> {
  const content = await readFile(path, 'utf8')
  const { start, end } = MARKERS[style]
  const startIdx = content.indexOf(start)
  if (startIdx === -1) {
    throw new Error(
      `Sentinel "${start}" not found in ${path}. ` +
      `Add "${start}" and "${end}" markers to the file and re-run ds generate.`,
    )
  }
  const endIdx = content.indexOf(end, startIdx + start.length)
  if (endIdx === -1) {
    throw new Error(
      `Sentinel "${end}" not found in ${path} after "${start}". ` +
      `Ensure both markers are present.`,
    )
  }
  const before = content.slice(0, startIdx + start.length)
  const after = content.slice(endIdx)
  const assembled = `${before}\n${newBlockContent.trim()}\n${after}`
  if (assembled === content) {
    return { action: 'unchanged' }
  }
  await writeFile(path, assembled, 'utf8')
  return { action: 'updated' }
}

export async function ensureSentinels(path: string, style: SentinelStyle): Promise<boolean> {
  const content = await readFile(path, 'utf8')
  const { start, end } = MARKERS[style]
  return content.includes(start) && content.includes(end)
}
