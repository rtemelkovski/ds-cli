const colors = {
  reset: '\x1b[0m',
  dim:   '\x1b[2m',
  red:   '\x1b[31m',
  green: '\x1b[32m',
  yellow:'\x1b[33m',
  blue:  '\x1b[34m',
  cyan:  '\x1b[36m',
  bold:  '\x1b[1m',
}

export function info(msg: string): void {
  process.stdout.write(`${msg}\n`)
}

export function success(msg: string): void {
  process.stdout.write(`${colors.green}✓${colors.reset} ${msg}\n`)
}

export function warn(msg: string): void {
  process.stderr.write(`${colors.yellow}!${colors.reset} ${msg}\n`)
}

export function error(msg: string): void {
  process.stderr.write(`${colors.red}✗${colors.reset} ${msg}\n`)
}

export function dim(msg: string): string {
  return `${colors.dim}${msg}${colors.reset}`
}

export function bold(msg: string): string {
  return `${colors.bold}${msg}${colors.reset}`
}

export function red(msg: string): string {
  return `${colors.red}${msg}${colors.reset}`
}

export function green(msg: string): string {
  return `${colors.green}${msg}${colors.reset}`
}

export function cyan(msg: string): string {
  return `${colors.cyan}${msg}${colors.reset}`
}
