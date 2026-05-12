import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: { cli: 'src/cli.ts' },
    format: ['esm'],
    target: 'node18',
    outDir: 'dist',
    clean: true,
    banner: { js: '#!/usr/bin/env node' },
  },
  {
    entry: {
      index: 'src/index.ts',
      'tokens/types': 'src/tokens/types.ts',
    },
    format: ['esm'],
    target: 'node18',
    outDir: 'dist',
    dts: true,
    clean: false,
  },
])
