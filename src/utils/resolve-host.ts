import { stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import type { Config } from '../tokens/types.ts'

const CONFIG_BASENAME = 'config.ts'
const HOST_DIR = 'design-system'

export interface HostContext {
  readonly hostRoot: string         // absolute path to project root (parent of design-system/)
  readonly designSystemDir: string  // absolute path to design-system/
  readonly configPath: string       // absolute path to design-system/config.ts
  readonly tokensPath: string       // absolute path to design-system/tokens.ts
  readonly config: Config
}

async function exists(p: string): Promise<boolean> {
  try { await stat(p); return true } catch { return false }
}

async function findUp(start: string): Promise<string | null> {
  let current = resolve(start)
  while (true) {
    const candidate = join(current, HOST_DIR, CONFIG_BASENAME)
    if (await exists(candidate)) return candidate
    const parent = dirname(current)
    if (parent === current) return null
    current = parent
  }
}

export async function resolveHost(cwd: string = process.cwd()): Promise<HostContext> {
  const configPath = await findUp(cwd)
  if (!configPath) {
    throw new Error(
      `No design-system/config.ts found walking up from ${cwd}. ` +
      `Run \`ds init\` from your project root to scaffold one.`,
    )
  }
  const designSystemDir = dirname(configPath)
  const hostRoot = dirname(designSystemDir)
  const tokensPath = join(designSystemDir, 'tokens.ts')

  // dynamic import; tsx executes the .ts file in-process
  const mod = await import(configPath)
  const config: Config = mod.default ?? mod.config
  if (!config) {
    throw new Error(`${configPath} must \`export default\` a Config object.`)
  }
  return { hostRoot, designSystemDir, configPath, tokensPath, config }
}

export function resolveTargetPath(host: HostContext, targetPath: string): string {
  // target paths in config.ts are relative to design-system/
  return resolve(host.designSystemDir, targetPath)
}
