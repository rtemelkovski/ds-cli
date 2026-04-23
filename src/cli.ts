import { Command } from 'commander'
import { runGenerate } from './commands/generate.ts'
import { runCheck } from './commands/check.ts'
import { runLint } from './commands/lint.ts'
import { runGenScreenStubs } from './commands/gen-screen-stubs.ts'
import { runInit } from './init/index.ts'
import { error } from './utils/log.ts'

const program = new Command()

program
  .name('ds')
  .description(
    'design-system CLI: walks up cwd to find design-system/config.ts, then runs codegen / drift check / strict lint against the host project.',
  )
  .version('0.1.0')

program
  .command('init')
  .description('Interactive scaffold: creates design-system/{tokens.ts, config.ts}, optionally injects sentinel markers, sets up husky + CI.')
  .action(async (): Promise<void> => {
    process.exit(await runInit())
  })

program
  .command('generate')
  .description('Emit canonical tokens into sentinel-delimited blocks in each target file.')
  .action(async (): Promise<void> => {
    process.exit(await runGenerate())
  })

program
  .command('check')
  .description('Verify target files are in sync with design-system/tokens.ts. Fails on drift.')
  .action(async (): Promise<void> => {
    process.exit(await runCheck())
  })

program
  .command('lint [paths...]')
  .description('Run strict design-system rules on the given paths (or lint.paths from config).')
  .action(async (paths: string[]): Promise<void> => {
    process.exit(await runLint(paths))
  })

program
  .command('gen-screen-stubs')
  .description('Scan platform route dirs and create stub page docs for any route without an existing doc.')
  .action(async (): Promise<void> => {
    process.exit(await runGenScreenStubs())
  })

program.parseAsync(process.argv).catch((err) => {
  error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
