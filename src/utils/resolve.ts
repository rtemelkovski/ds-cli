import type { ColorValue, SemanticAlias, Tokens } from '../tokens/types.ts'

export interface ResolvedColor {
  readonly name: string
  readonly hex: string
  readonly oklch: string
  readonly rgba?: string
  readonly alpha?: number
}

function hexToRgba(hex: string, alpha: number): string {
  const cleaned = hex.replace('#', '')
  const r = parseInt(cleaned.slice(0, 2), 16)
  const g = parseInt(cleaned.slice(2, 4), 16)
  const b = parseInt(cleaned.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function oklchWithAlpha(oklch: string, alpha: number): string {
  const inside = oklch.replace(/^oklch\(/, '').replace(/\)$/, '')
  return `oklch(${inside} / ${alpha})`
}

export function resolveSemantic(name: string, tokens: Tokens): ResolvedColor {
  const semantic = tokens.semanticColors[name]
  if (!semantic) {
    throw new Error(`Unknown semantic token: ${name}`)
  }
  return resolveAlias(name, semantic, tokens)
}

export function resolveAlias(name: string, semantic: SemanticAlias, tokens: Tokens): ResolvedColor {
  const primitive = tokens.primitives[semantic.alias]
  if (!primitive) {
    throw new Error(`Semantic "${name}" references unknown primitive "${semantic.alias}"`)
  }
  if (semantic.alpha !== undefined) {
    return {
      name,
      hex: primitive.hex,
      oklch: oklchWithAlpha(primitive.oklch, semantic.alpha),
      rgba: hexToRgba(primitive.hex, semantic.alpha),
      alpha: semantic.alpha,
    }
  }
  return { name, hex: primitive.hex, oklch: primitive.oklch }
}

export function resolvePrimitive(name: string, tokens: Tokens): ColorValue {
  const primitive = tokens.primitives[name]
  if (!primitive) {
    throw new Error(`Unknown primitive: ${name}`)
  }
  return primitive
}

export function resolveOverlay(
  overlayName: string,
  tokens: Tokens,
): { hex: string; oklch: string; rgba: string } {
  const overlays = tokens.overlays ?? {}
  const overlay = overlays[overlayName]
  if (!overlay) {
    throw new Error(`Unknown overlay: ${overlayName}`)
  }
  const primitive = resolvePrimitive(overlay.alias, tokens)
  return {
    hex: primitive.hex,
    oklch: oklchWithAlpha(primitive.oklch, overlay.alpha),
    rgba: hexToRgba(primitive.hex, overlay.alpha),
  }
}
