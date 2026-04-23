export interface ColorValue {
  readonly hex: string
  readonly oklch: string
  readonly notes?: string
}

export interface SemanticAlias {
  readonly alias: string
  readonly alpha?: number
  readonly notes?: string
}

export interface FontFamilyEntry {
  readonly className: string
  readonly fontName: string
  readonly weight: number
  readonly style?: 'normal' | 'italic'
  readonly notes?: string
}

export interface FontSizeEntry {
  readonly size: number
  readonly leading: number
  readonly notes?: string
}

export interface SpringConfig {
  readonly damping: number
  readonly stiffness: number
  readonly notes?: string
}

export interface ShadowConfig {
  readonly shadowColorAlias: string
  readonly shadowOpacity: number
  readonly shadowRadius: number
  readonly shadowOffsetWidth: number
  readonly shadowOffsetHeight: number
  readonly notes?: string
}

export interface Tokens {
  readonly primitives: Readonly<Record<string, ColorValue>>
  readonly semanticColors: Readonly<Record<string, SemanticAlias>>
  readonly fontFamilies: Readonly<Record<string, FontFamilyEntry>>
  readonly fontSizes: Readonly<Record<string, FontSizeEntry>>
  readonly spacing: Readonly<Record<string, string>>
  readonly borderRadius: Readonly<Record<string, string>>
  readonly durations: Readonly<Record<string, number>>
  readonly easings: Readonly<Record<string, string>>
  // optional, mobile-only
  readonly springs?: Readonly<Record<string, SpringConfig>>
  readonly shadows?: Readonly<Record<string, ShadowConfig>>
  readonly iconSizes?: Readonly<Record<string, number>>
  readonly overlays?: Readonly<Record<string, { alias: string; alpha: number }>>
}

export type TargetType = 'tailwind-js' | 'theme-ts' | 'globals-css'
export type SentinelStyle = 'js' | 'css'

export interface Target {
  readonly type: TargetType
  readonly path: string
  readonly sentinel: SentinelStyle
}

export interface LintConfig {
  readonly paths: readonly string[]
  readonly ignore: readonly string[]
}

export interface StubConfig {
  readonly platforms: ReadonlyArray<{ name: string; routeDir: string }>
  readonly output: string
}

export interface Config {
  readonly tokens: Tokens
  readonly targets: readonly Target[]
  readonly lint: LintConfig
  readonly genStubs?: StubConfig
}

// backcompat alias for repos that imported the old name
export type DesignSystemConfig = Config
