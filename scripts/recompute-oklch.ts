// Usage: npx tsx scripts/recompute-oklch.ts <path-to-host>/design-system/tokens.ts
// Prints corrected oklch(...) strings for any primitive whose stored value drifts > 2 ΔE.

import Color from 'colorjs.io'
import { resolve } from 'node:path'

const arg = process.argv[2]
if (!arg) {
  console.error('Usage: tsx scripts/recompute-oklch.ts <path-to-tokens.ts>')
  process.exit(1)
}

const absPath = resolve(arg)
const mod = await import(absPath)
const tokens = mod.tokens ?? mod.default
if (!tokens?.primitives) {
  console.error(`No \`tokens.primitives\` exported from ${absPath}`)
  process.exit(1)
}

const tolerance = 2
let hadDrift = false
for (const [name, value] of Object.entries(tokens.primitives) as [string, { hex: string; oklch: string }][]) {
  const computed = new Color(value.hex).to('oklch')
  const stored = new Color(value.oklch)
  const delta = computed.deltaE(stored, '2000')
  const [l, c, h] = computed.coords
  const hue = Number.isNaN(h) ? 0 : h
  const correct = `oklch(${l.toFixed(4)} ${c.toFixed(4)} ${hue.toFixed(2)})`
  if (delta > tolerance) {
    hadDrift = true
    console.log(`${name}  hex=${value.hex}`)
    console.log(`  stored:   ${value.oklch}  ΔE=${delta.toFixed(2)}`)
    console.log(`  computed: ${correct}`)
    console.log('')
  }
}

if (!hadDrift) {
  console.log('All primitives within ΔE 2 tolerance.')
}
