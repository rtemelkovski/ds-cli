import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileExists } from './scaffold.ts'

const STANDALONE_WORKFLOW = `name: design-system

on:
  push:
    branches: [main]
  pull_request:

jobs:
  check-and-lint:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      # ds-cli is a sibling repo — clone and link it.
      # In a CI environment without sibling-repo access, vendor or publish ds-cli.
      - name: install ds-cli
        run: |
          git clone --depth=1 https://github.com/REPLACE_ME/ds-cli.git /tmp/ds-cli
          cd /tmp/ds-cli && npm ci && npm link
          cd \${{ github.workspace }} && npm link ds-cli
      - run: ds check
      # advisory until codebase is clean
      - run: ds lint
        continue-on-error: true
`

export async function writeStandaloneCIWorkflow(cwd: string): Promise<{ path: string; created: boolean }> {
  const dir = join(cwd, '.github', 'workflows')
  await mkdir(dir, { recursive: true })
  const path = join(dir, 'design-system.yml')
  if (await fileExists(path)) return { path, created: false }
  await writeFile(path, STANDALONE_WORKFLOW, 'utf8')
  return { path, created: true }
}
