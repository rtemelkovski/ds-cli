import { readdir, writeFile, stat, access } from 'node:fs/promises'
import { join, resolve, relative } from 'node:path'
import { success, info, dim, warn } from '../utils/log.ts'
import { resolveHost } from '../utils/resolve-host.ts'

const ROUTE_FILE_RE = /^(page|index|\[.+\]|[a-z][a-z0-9-]*)\.tsx?$/
const LAYOUT_RE = /^_layout\.tsx?$/
const EXCLUDED_FILES = new Set(['_layout.tsx', '_layout.ts', '+not-found.tsx', '+html.tsx'])

interface RouteFile {
  readonly absPath: string
  readonly segments: readonly string[]
}

async function walkRoutes(dir: string, rel: string[], acc: RouteFile[]): Promise<void> {
  let entries
  try { entries = await readdir(dir, { withFileTypes: true }) } catch { return }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) { await walkRoutes(full, [...rel, entry.name], acc); continue }
    if (!ROUTE_FILE_RE.test(entry.name)) continue
    if (EXCLUDED_FILES.has(entry.name)) continue
    if (LAYOUT_RE.test(entry.name)) continue

    const fileName = entry.name.replace(/\.tsx?$/, '')
    const isIndexLike = fileName === 'page' || fileName === 'index'
    const segments = isIndexLike ? rel : [...rel, fileName]
    acc.push({ absPath: full, segments })
  }
}

function segmentsToSlug(platform: string, segments: readonly string[]): string {
  const cleaned = segments
    .filter((s) => !s.startsWith('(') || !s.endsWith(')'))
    .map((s) => {
      if (s.startsWith('[') && s.endsWith(']')) {
        const inner = s.slice(1, -1).replace(/^\.\.\./, '')
        return inner === 'id' ? 'detail' : inner
      }
      return s
    })
  if (cleaned.length === 0) return `${platform}-root`
  return [platform, ...cleaned].join('-')
}

function segmentsToRoute(segments: readonly string[]): string {
  const cleaned = segments.filter((s) => !(s.startsWith('(') && s.endsWith(')')))
  return '/' + cleaned.join('/')
}

function stubContent(args: { title: string; platform: string; route: string }): string {
  const dateStr = new Date().toISOString().slice(0, 10)
  return `---
title: ${args.title}
type: design-system-override
derives_from: ../MASTER.md
platform: ${args.platform}
route: ${args.route}
status: stub
created: ${dateStr}
updated: ${dateStr}
tags: [design, ${args.platform}, stub]
---

# ${args.title}

<!-- TODO: describe this screen's role in the product. -->

Derives from [[../MASTER]]. This is a stub — replace TODO sections with real prescriptive content.

## Role
TODO

## Deviations from MASTER
TODO

## Layout
TODO

## Zones
TODO

## Motion
TODO

## Loading state
TODO

## Error state
TODO

## Empty state
TODO

## Accessibility
TODO

## Copy patterns

| Surface | String |
|---|---|
| TODO | \`TODO\` |

## Inherits from MASTER
TODO

## Connections

- [[../MASTER]]
- [[../brand]]
`
}

async function fileExists(p: string): Promise<boolean> {
  try { await access(p); return true } catch { return false }
}

export async function runGenScreenStubs(): Promise<number> {
  const ctx = await resolveHost()
  if (!ctx.config.genStubs) {
    warn('genStubs is not configured in design-system/config.ts — nothing to do.')
    return 0
  }
  const outputDir = resolve(ctx.designSystemDir, ctx.config.genStubs.output)
  let created = 0
  let skipped = 0

  for (const platform of ctx.config.genStubs.platforms) {
    const routeDir = resolve(ctx.designSystemDir, platform.routeDir)
    let dirStat
    try { dirStat = await stat(routeDir) } catch {
      info(`${dim('·')} ${platform.name}: route dir ${platform.routeDir} not found, skipping`); continue
    }
    if (!dirStat.isDirectory()) continue

    const acc: RouteFile[] = []
    await walkRoutes(routeDir, [], acc)

    for (const route of acc) {
      const slug = segmentsToSlug(platform.name, route.segments)
      const outputPath = join(outputDir, `${slug}.md`)
      if (await fileExists(outputPath)) { skipped++; continue }
      const title = route.segments
        .filter((s) => !(s.startsWith('(') && s.endsWith(')')))
        .map((s) => s.startsWith('[') ? s.replace(/[\[\]]/g, '') : s)
        .map((s) => s[0]?.toUpperCase() + s.slice(1))
        .join(' ') || (platform.name === 'mobile' ? 'Root' : 'Home')
      await writeFile(
        outputPath,
        stubContent({
          title: `${title} (${platform.name})`,
          platform: platform.name,
          route: segmentsToRoute(route.segments),
        }),
        'utf8',
      )
      success(`${relative(ctx.hostRoot, outputPath)} created`)
      created++
    }
  }

  info('')
  info(`Created ${created} new stub(s). Skipped ${skipped} existing page doc(s).`)
  return 0
}
