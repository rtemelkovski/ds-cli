# ds-cli

Portable design-token CLI. One canonical source per project (`design-system/tokens.ts`) generates Tailwind config, React Native theme constants, and Tailwind 4 CSS variable blocks. Strict `lint` command catches drift in app code.

## One-time setup

```bash
git clone <this-repo> ~/workspace/solo-coding-projects/ds-cli
cd ds-cli
npm install
npm link              # exposes `ds` as a global command
```

## In a host project

```bash
cd <your-project>
npm link ds-cli       # so `import type { Config } from 'ds-cli'` resolves
ds init               # interactive setup: ~6 prompts
```

`ds init` creates `design-system/tokens.ts` and `design-system/config.ts`, optionally injects sentinel markers into your CSS file, optionally sets up husky, optionally writes a CI workflow.

## Daily commands

Run from any directory inside a configured host (CLI walks up to find `design-system/config.ts`).

```bash
ds generate                     # rewrite the sentinel-delimited block in each target
ds check                        # verify targets in sync with tokens.ts; non-zero on drift
ds lint                         # strict scan of app code; non-zero on violation
ds lint src/components/events   # lint a specific path
ds gen-screen-stubs             # scaffold per-page design docs for new routes
```

## Migrating a pre-existing fork (e.g. baila-base, dance-weekly)

```bash
cd <repo>
git rm -r design-system/{src,bin,scripts,node_modules,package.json,package-lock.json,pnpm-lock.yaml,tsconfig.json,README.md}
git mv design-system/design-system.config.ts design-system/config.ts
# in design-system/config.ts:
#   replace `import type { DesignSystemConfig } from './src/tokens/types.ts'`
#   with    `import type { Config } from 'ds-cli/types'`
#   (and rename the local type alias if needed)
npm link ds-cli
ds check
```

Update CI: drop the `working-directory: design-system` + `pnpm install` setup; just call `ds check && ds lint`.
Update husky `.husky/pre-commit`: drop `--prefix design-system`; just call `ds check && ds lint`.

## Tokens schema

`design-system/tokens.ts` exports a `Config['tokens']` object. Required fields: `primitives`, `semanticColors`, `fontFamilies`, `fontSizes`, `spacing`, `borderRadius`, `durations`, `easings`. Optional (mobile-only): `springs`, `shadows`, `iconSizes`, `overlays`.

## Lint rules (all strict; per-line escape hatch only)

1. `no-hex-literal` — `#E63946` outside generated blocks.
2. `no-color-function-literal` — `rgb(...)` / `oklch(...)` etc. with literal values.
3. `no-arbitrary-tailwind-value` — `p-[13px]`, `bg-[#fff]`. Use the scale.
4. `no-raw-palette-class` — `bg-red-500`, `text-zinc-400`. Use semantic tokens.
5. `no-inline-numeric-layout` — single-line `style={{ padding: 16 }}`.
6. `no-template-literal-hex` — `` `#${...}` `` template literals with hex inside.

Per-line escape hatch:

```tsx
// design-system:allow-raw <reason>
<View style={{ opacity: 0.025 }} />
```

The reason after the colon is mandatory. Use sparingly.

## Computing oklch from hex

When adding a new primitive, fill any best-guess `oklch` and run:

```bash
cd ~/workspace/solo-coding-projects/ds-cli
npx tsx scripts/recompute-oklch.ts <path-to-host>/design-system/tokens.ts
```

It prints corrected `oklch(...)` strings for any primitive whose stored value drifts more than ΔE 2 from the hex. Paste those into the host's `tokens.ts`.
