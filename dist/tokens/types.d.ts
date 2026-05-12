interface ColorValue {
    readonly hex: string;
    readonly oklch: string;
    readonly notes?: string;
}
interface SemanticAlias {
    readonly alias: string;
    readonly alpha?: number;
    readonly notes?: string;
}
interface FontFamilyEntry {
    readonly className: string;
    readonly fontName: string;
    readonly weight: number;
    readonly style?: 'normal' | 'italic';
    readonly notes?: string;
}
interface FontSizeEntry {
    readonly size: number;
    readonly leading: number;
    readonly notes?: string;
}
interface SpringConfig {
    readonly damping: number;
    readonly stiffness: number;
    readonly notes?: string;
}
interface ShadowConfig {
    readonly shadowColorAlias: string;
    readonly shadowOpacity: number;
    readonly shadowRadius: number;
    readonly shadowOffsetWidth: number;
    readonly shadowOffsetHeight: number;
    readonly notes?: string;
}
interface Tokens {
    readonly primitives: Readonly<Record<string, ColorValue>>;
    readonly semanticColors: Readonly<Record<string, SemanticAlias>>;
    readonly fontFamilies: Readonly<Record<string, FontFamilyEntry>>;
    readonly fontSizes: Readonly<Record<string, FontSizeEntry>>;
    readonly spacing: Readonly<Record<string, string>>;
    readonly borderRadius: Readonly<Record<string, string>>;
    readonly durations: Readonly<Record<string, number>>;
    readonly easings: Readonly<Record<string, string>>;
    readonly springs?: Readonly<Record<string, SpringConfig>>;
    readonly shadows?: Readonly<Record<string, ShadowConfig>>;
    readonly iconSizes?: Readonly<Record<string, number>>;
    readonly overlays?: Readonly<Record<string, {
        alias: string;
        alpha: number;
    }>>;
}
type TargetType = 'tailwind-js' | 'theme-ts' | 'globals-css';
type SentinelStyle = 'js' | 'css';
interface Target {
    readonly type: TargetType;
    readonly path: string;
    readonly sentinel: SentinelStyle;
}
interface LintConfig {
    readonly paths: readonly string[];
    readonly ignore: readonly string[];
}
interface StubConfig {
    readonly platforms: ReadonlyArray<{
        name: string;
        routeDir: string;
    }>;
    readonly output: string;
}
interface Config {
    readonly tokens: Tokens;
    readonly targets: readonly Target[];
    readonly lint: LintConfig;
    readonly genStubs?: StubConfig;
}
type DesignSystemConfig = Config;

export type { ColorValue, Config, DesignSystemConfig, FontFamilyEntry, FontSizeEntry, LintConfig, SemanticAlias, SentinelStyle, ShadowConfig, SpringConfig, StubConfig, Target, TargetType, Tokens };
