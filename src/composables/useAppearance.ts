import { computed, reactive, watch } from 'vue'
import type { Appearance, ColorMode, Density, SidebarStyle } from '@/types/appearance'
import { buildNeutralRamp, buildRamp, normalizeHex, readableTextOn, withAlpha } from '@/utils/color'

const STORAGE_KEY = 'zetoo.appearance.v1'
const FONT_LINK_ID = 'zetoo-font-link'

/* ------------------------------------------------------------------ *
 * Catalogues offered in the customiser
 * ------------------------------------------------------------------ */

export interface FontOption {
  /** Google Fonts family name. */
  family: string
  stack: string
  /** Weight axis requested from Google Fonts. */
  weights: string
  category: 'sans' | 'serif' | 'mono' | 'display'
}

export const fontOptions: FontOption[] = [
  {
    family: 'Outfit',
    stack: 'Outfit, ui-sans-serif, system-ui, sans-serif',
    weights: 'wght@100..900',
    category: 'sans',
  },
  {
    family: 'Inter',
    stack: 'Inter, ui-sans-serif, system-ui, sans-serif',
    weights: 'wght@100..900',
    category: 'sans',
  },
  {
    family: 'Manrope',
    stack: 'Manrope, ui-sans-serif, system-ui, sans-serif',
    weights: 'wght@200..800',
    category: 'sans',
  },
  {
    family: 'Plus Jakarta Sans',
    stack: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
    weights: 'wght@200..800',
    category: 'sans',
  },
  {
    family: 'DM Sans',
    stack: "'DM Sans', ui-sans-serif, system-ui, sans-serif",
    weights: 'wght@100..1000',
    category: 'sans',
  },
  {
    family: 'Poppins',
    stack: 'Poppins, ui-sans-serif, system-ui, sans-serif',
    weights: 'wght@300;400;500;600;700',
    category: 'sans',
  },
  {
    family: 'Nunito',
    stack: 'Nunito, ui-sans-serif, system-ui, sans-serif',
    weights: 'wght@200..1000',
    category: 'sans',
  },
  {
    family: 'Work Sans',
    stack: "'Work Sans', ui-sans-serif, system-ui, sans-serif",
    weights: 'wght@100..900',
    category: 'sans',
  },
  {
    family: 'Figtree',
    stack: 'Figtree, ui-sans-serif, system-ui, sans-serif',
    weights: 'wght@300..900',
    category: 'sans',
  },
  {
    family: 'Sora',
    stack: 'Sora, ui-sans-serif, system-ui, sans-serif',
    weights: 'wght@100..800',
    category: 'display',
  },
  {
    family: 'Space Grotesk',
    stack: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
    weights: 'wght@300..700',
    category: 'display',
  },
  {
    family: 'Bricolage Grotesque',
    stack: "'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif",
    weights: 'wght@200..800',
    category: 'display',
  },
  {
    family: 'Merriweather',
    stack: 'Merriweather, Georgia, serif',
    weights: 'wght@300..900',
    category: 'serif',
  },
  { family: 'Lora', stack: 'Lora, Georgia, serif', weights: 'wght@400..700', category: 'serif' },
  {
    family: 'Playfair Display',
    stack: "'Playfair Display', Georgia, serif",
    weights: 'wght@400..900',
    category: 'serif',
  },
  {
    family: 'Source Serif 4',
    stack: "'Source Serif 4', Georgia, serif",
    weights: 'wght@200..900',
    category: 'serif',
  },
  {
    family: 'JetBrains Mono',
    stack: "'JetBrains Mono', ui-monospace, monospace",
    weights: 'wght@100..800',
    category: 'mono',
  },
  {
    family: 'IBM Plex Mono',
    stack: "'IBM Plex Mono', ui-monospace, monospace",
    weights: 'wght@300;400;500;600;700',
    category: 'mono',
  },
  {
    family: 'Fira Code',
    stack: "'Fira Code', ui-monospace, monospace",
    weights: 'wght@300..700',
    category: 'mono',
  },
]

export const fontByFamily = (family: string): FontOption =>
  fontOptions.find((option) => option.family === family) ?? fontOptions[0]

export const brandSwatches = [
  '#465fff',
  '#2563eb',
  '#0ba5ec',
  '#06b6d4',
  '#12b76a',
  '#65a30d',
  '#f79009',
  '#fb6514',
  '#f04438',
  '#ec4899',
  '#7a5af8',
  '#8b5cf6',
  '#64748b',
  '#0f172a',
]

export const densities: { value: Density; label: string; hint: string }[] = [
  { value: 'compact', label: 'Compact', hint: 'More rows on screen' },
  { value: 'cozy', label: 'Cozy', hint: 'Balanced default' },
  { value: 'comfortable', label: 'Comfortable', hint: 'Roomy, touch friendly' },
]

export const sidebarStyles: { value: SidebarStyle; label: string }[] = [
  { value: 'light', label: 'Surface' },
  { value: 'brand', label: 'Brand' },
  { value: 'dark', label: 'Contrast' },
]

export const defaultAppearance: Appearance = {
  brand: '#465fff',
  accent: '#7a5af8',
  success: '#12b76a',
  warning: '#f79009',
  error: '#f04438',
  neutralHue: 220,
  neutralSaturation: 14,
  fontBody: 'Outfit',
  fontHeading: 'Outfit',
  fontMono: 'JetBrains Mono',
  fontSize: 16,
  lineHeight: 1,
  headingWeight: 600,
  letterSpacing: 0,
  radius: 1,
  density: 'cozy',
  colorMode: 'light',
  sidebarStyle: 'light',
  shadowIntensity: 1,
  borderIntensity: 55,
  boardCardCovers: true,
  boardCompactCards: false,
  reduceMotion: false,
}

export interface ThemePreset {
  id: string
  name: string
  blurb: string
  values: Partial<Appearance>
}

export const themePresets: ThemePreset[] = [
  {
    id: 'zetoo',
    name: 'Zetoo',
    blurb: 'The default indigo workspace.',
    values: { ...defaultAppearance },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    blurb: 'Dark chrome, electric accent.',
    values: {
      brand: '#6366f1',
      accent: '#22d3ee',
      neutralHue: 225,
      neutralSaturation: 18,
      colorMode: 'dark',
      sidebarStyle: 'dark',
      fontBody: 'Inter',
      fontHeading: 'Sora',
      radius: 1.15,
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    blurb: 'Calm greens, serif headings.',
    values: {
      brand: '#12b76a',
      accent: '#0ba5ec',
      neutralHue: 155,
      neutralSaturation: 9,
      fontBody: 'Work Sans',
      fontHeading: 'Source Serif 4',
      radius: 0.85,
      colorMode: 'light',
      sidebarStyle: 'light',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    blurb: 'Warm brand, generous spacing.',
    values: {
      brand: '#fb6514',
      accent: '#ec4899',
      neutralHue: 25,
      neutralSaturation: 12,
      fontBody: 'Figtree',
      fontHeading: 'Bricolage Grotesque',
      density: 'comfortable',
      radius: 1.35,
      colorMode: 'light',
      sidebarStyle: 'brand',
    },
  },
  {
    id: 'graphite',
    name: 'Graphite',
    blurb: 'Neutral, dense, no distractions.',
    values: {
      brand: '#334155',
      accent: '#0ea5e9',
      neutralHue: 215,
      neutralSaturation: 8,
      fontBody: 'Inter',
      fontHeading: 'Inter',
      density: 'compact',
      radius: 0.6,
      shadowIntensity: 0.5,
      colorMode: 'light',
      sidebarStyle: 'light',
    },
  },
  {
    id: 'candy',
    name: 'Candy',
    blurb: 'Playful pink with soft corners.',
    values: {
      brand: '#ec4899',
      accent: '#8b5cf6',
      neutralHue: 300,
      neutralSaturation: 10,
      fontBody: 'Plus Jakarta Sans',
      fontHeading: 'Plus Jakarta Sans',
      radius: 1.6,
      shadowIntensity: 1.3,
      colorMode: 'light',
      sidebarStyle: 'brand',
    },
  },
]

/* ------------------------------------------------------------------ *
 * State
 * ------------------------------------------------------------------ */

const appearance = reactive<Appearance>({ ...defaultAppearance })

const readStored = (): Partial<Appearance> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Partial<Appearance>) : {}
  } catch {
    return {}
  }
}

Object.assign(appearance, readStored())

const persist = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance))
  } catch {
    // ignore
  }
}

/* ------------------------------------------------------------------ *
 * Applying the theme to the document
 * ------------------------------------------------------------------ */

/** Base line heights (px) for the template's text tokens. */
const TEXT_TOKENS: Record<string, number> = {
  'title-2xl': 90,
  'title-xl': 72,
  'title-lg': 60,
  'title-md': 44,
  'title-sm': 38,
  'theme-xl': 30,
  'theme-sm': 20,
  'theme-xs': 18,
}

/** Tailwind's default radius scale in rem. */
const RADIUS_TOKENS: Record<string, number> = {
  xs: 0.125,
  sm: 0.25,
  md: 0.375,
  lg: 0.5,
  xl: 0.75,
  '2xl': 1,
  '3xl': 1.5,
  '4xl': 2,
}

const DENSITY_SPACING: Record<Density, number> = {
  compact: 0.215,
  cozy: 0.25,
  comfortable: 0.29,
}

const prefersDark = (): boolean => {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

export const resolvedDark = (mode: ColorMode = appearance.colorMode): boolean =>
  mode === 'dark' || (mode === 'system' && prefersDark())

const applyRamp = (root: HTMLElement, name: string, hex: string) => {
  const ramp = buildRamp(hex)
  for (const [step, value] of Object.entries(ramp)) {
    root.style.setProperty(`--color-${name}-${step}`, value)
  }
}

const loadFonts = () => {
  const families = Array.from(
    new Set([appearance.fontBody, appearance.fontHeading, appearance.fontMono]),
  ).map((family) => {
    const option = fontByFamily(family)
    return `family=${option.family.replace(/ /g, '+')}:${option.weights}`
  })

  const href = `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`
  let link = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.id = FONT_LINK_ID
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }
  if (link.href !== href) link.href = href
}

export const applyAppearance = () => {
  if (typeof document === 'undefined') return
  const root = document.documentElement

  /* Colour ramps ---------------------------------------------------- */
  applyRamp(root, 'brand', appearance.brand)
  applyRamp(root, 'accent', appearance.accent)
  applyRamp(root, 'success', appearance.success)
  applyRamp(root, 'warning', appearance.warning)
  applyRamp(root, 'error', appearance.error)
  // The template's "blue-light" family doubles as a secondary accent.
  applyRamp(root, 'blue-light', appearance.accent)

  const neutral = buildNeutralRamp(appearance.neutralHue, appearance.neutralSaturation)
  for (const [step, value] of Object.entries(neutral)) {
    root.style.setProperty(`--color-gray-${step}`, value)
  }
  root.style.setProperty('--color-gray-dark', neutral[800])
  root.style.setProperty('--color-black', neutral[950])
  root.style.setProperty('--color-theme-purple-500', appearance.accent)

  /* Brand-derived helpers ------------------------------------------- */
  const brandRamp = buildRamp(appearance.brand)
  root.style.setProperty('--brand-contrast', readableTextOn(appearance.brand))
  root.style.setProperty(
    '--shadow-focus-ring',
    `0px 0px 0px 4px ${withAlpha(appearance.brand, 0.12)}`,
  )

  /* Sidebar --------------------------------------------------------- */
  const sidebar =
    appearance.sidebarStyle === 'brand'
      ? {
          bg: brandRamp[600],
          fg: readableTextOn(brandRamp[600]),
          muted: withAlpha('#ffffff', 0.72),
        }
      : appearance.sidebarStyle === 'dark'
        ? { bg: neutral[900], fg: '#ffffff', muted: withAlpha('#ffffff', 0.66) }
        : { bg: '', fg: '', muted: '' }
  root.style.setProperty('--sidebar-bg', sidebar.bg)
  root.style.setProperty('--sidebar-fg', sidebar.fg)
  root.style.setProperty('--sidebar-muted', sidebar.muted)
  root.dataset.sidebar = appearance.sidebarStyle

  /* Typography ------------------------------------------------------ */
  const body = fontByFamily(appearance.fontBody)
  const heading = fontByFamily(appearance.fontHeading)
  const mono = fontByFamily(appearance.fontMono)
  root.style.setProperty('--font-outfit', body.stack)
  root.style.setProperty('--font-body', body.stack)
  root.style.setProperty('--font-heading', heading.stack)
  root.style.setProperty('--font-mono', mono.stack)
  root.style.setProperty('--heading-weight', String(appearance.headingWeight))
  root.style.setProperty('--heading-tracking', `${appearance.letterSpacing}em`)
  root.style.setProperty('--app-font-size', `${appearance.fontSize}px`)
  root.style.setProperty('--app-line-height', String(1.5 * appearance.lineHeight))

  for (const [token, base] of Object.entries(TEXT_TOKENS)) {
    root.style.setProperty(
      `--text-${token}--line-height`,
      `${Math.round(base * appearance.lineHeight)}px`,
    )
  }

  /* Shape and rhythm ------------------------------------------------ */
  for (const [token, rem] of Object.entries(RADIUS_TOKENS)) {
    root.style.setProperty(`--radius-${token}`, `${(rem * appearance.radius).toFixed(4)}rem`)
  }
  root.style.setProperty('--spacing', `${DENSITY_SPACING[appearance.density]}rem`)
  root.style.setProperty('--app-border-strength', String(appearance.borderIntensity))

  const shadowAlpha = (value: number) => Math.min(value * appearance.shadowIntensity, 1).toFixed(3)
  const ink = (alpha: number) => withAlpha(neutral[900], Number(shadowAlpha(alpha)))
  root.style.setProperty('--shadow-theme-xs', `0px 1px 2px 0px ${ink(0.05)}`)
  root.style.setProperty(
    '--shadow-theme-sm',
    `0px 1px 3px 0px ${ink(0.1)}, 0px 1px 2px 0px ${ink(0.06)}`,
  )
  root.style.setProperty(
    '--shadow-theme-md',
    `0px 4px 8px -2px ${ink(0.1)}, 0px 2px 4px -2px ${ink(0.06)}`,
  )
  root.style.setProperty(
    '--shadow-theme-lg',
    `0px 12px 16px -4px ${ink(0.08)}, 0px 4px 6px -2px ${ink(0.03)}`,
  )
  root.style.setProperty(
    '--shadow-theme-xl',
    `0px 20px 24px -4px ${ink(0.08)}, 0px 8px 8px -4px ${ink(0.03)}`,
  )

  /* Modes ----------------------------------------------------------- */
  root.classList.toggle('dark', resolvedDark())
  root.classList.toggle('reduce-motion', appearance.reduceMotion)
  root.style.colorScheme = resolvedDark() ? 'dark' : 'light'

  loadFonts()
}

let systemListenerAttached = false

const attachSystemListener = () => {
  if (systemListenerAttached || typeof window === 'undefined') return
  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (appearance.colorMode === 'system') applyAppearance()
    })
    systemListenerAttached = true
  } catch {
    // Older browsers: system mode simply resolves at load time.
  }
}

watch(
  appearance,
  () => {
    persist()
    applyAppearance()
  },
  { deep: true },
)

/* ------------------------------------------------------------------ *
 * Store
 * ------------------------------------------------------------------ */

export function useAppearance() {
  const isDark = computed(() => resolvedDark(appearance.colorMode))

  const setColorMode = (mode: ColorMode) => {
    appearance.colorMode = mode
  }

  const toggleColorMode = () => {
    appearance.colorMode = resolvedDark(appearance.colorMode) ? 'light' : 'dark'
  }

  const update = (patch: Partial<Appearance>) => {
    Object.assign(appearance, patch)
  }

  const applyPreset = (presetId: string) => {
    const preset = themePresets.find((item) => item.id === presetId)
    if (!preset) return
    Object.assign(appearance, { ...defaultAppearance, ...preset.values })
  }

  const reset = () => {
    Object.assign(appearance, defaultAppearance)
  }

  /** Shareable snapshot, used by export / import in the customiser. */
  const exportTheme = (): string => JSON.stringify(appearance, null, 2)

  const importTheme = (payload: string): boolean => {
    try {
      const parsed = JSON.parse(payload) as Partial<Appearance>
      if (typeof parsed !== 'object' || parsed === null) return false
      if (parsed.brand) parsed.brand = normalizeHex(parsed.brand)
      if (parsed.accent) parsed.accent = normalizeHex(parsed.accent)
      Object.assign(appearance, parsed)
      return true
    } catch {
      return false
    }
  }

  const brandRamp = computed(() => buildRamp(appearance.brand))

  attachSystemListener()

  return {
    appearance,
    isDark,
    brandRamp,
    setColorMode,
    toggleColorMode,
    update,
    applyPreset,
    reset,
    exportTheme,
    importTheme,
    applyAppearance,
  }
}
