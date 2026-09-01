export type ColorMode = 'light' | 'dark' | 'system'

export type Density = 'compact' | 'cozy' | 'comfortable'

export type SidebarStyle = 'light' | 'brand' | 'dark'

export interface Appearance {
  /** Brand hex; the full 25–950 ramp is generated from it. */
  brand: string
  /** Accent hex used for highlights, charts and secondary actions. */
  accent: string
  /** Success / warning / error overrides. */
  success: string
  warning: string
  error: string
  /** Hue applied to the neutral gray ramp, 0–360, plus its saturation. */
  neutralHue: number
  neutralSaturation: number
  /** Google font families. */
  fontBody: string
  fontHeading: string
  fontMono: string
  /** Root font size in px. */
  fontSize: number
  /** Multiplier applied to line heights. */
  lineHeight: number
  /** Heading weight, 400–900. */
  headingWeight: number
  letterSpacing: number
  /** Corner radius scale multiplier. */
  radius: number
  /** Spacing scale multiplier. */
  density: Density
  colorMode: ColorMode
  sidebarStyle: SidebarStyle
  /** Card and page chrome. */
  shadowIntensity: number
  borderIntensity: number
  /** Board specific. */
  boardCardCovers: boolean
  boardCompactCards: boolean
  reduceMotion: boolean
}
