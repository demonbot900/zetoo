/**
 * Colour helpers for the runtime theme engine.
 *
 * Tailwind v4 emits every `@theme` token as a CSS variable on `:root`, so the
 * whole palette can be re-pointed at runtime by setting those same variables on
 * `document.documentElement` — no rebuild, no extra stylesheet.
 */

export interface Hsl {
  h: number
  s: number
  l: number
}

export interface Rgb {
  r: number
  g: number
  b: number
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export const normalizeHex = (hex: string): string => {
  let value = hex.trim().replace(/^#/, '')
  if (value.length === 3) {
    value = value
      .split('')
      .map((char) => char + char)
      .join('')
  }
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return '#465fff'
  return `#${value.toLowerCase()}`
}

export const isValidHex = (hex: string): boolean =>
  /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex.trim())

export const hexToRgb = (hex: string): Rgb => {
  const value = normalizeHex(hex).slice(1)
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  }
}

export const rgbToHex = ({ r, g, b }: Rgb): string =>
  `#${[r, g, b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`

export const hexToHsl = (hex: string): Hsl => {
  const { r, g, b } = hexToRgb(hex)
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min
  const l = (max + min) / 2

  if (delta === 0) return { h: 0, s: 0, l: l * 100 }

  const s = delta / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === rn) h = ((gn - bn) / delta) % 6
  else if (max === gn) h = (bn - rn) / delta + 2
  else h = (rn - gn) / delta + 4

  h = Math.round(h * 60)
  if (h < 0) h += 360

  return { h, s: s * 100, l: l * 100 }
}

export const hslToHex = ({ h, s, l }: Hsl): string => {
  const sn = clamp(s, 0, 100) / 100
  const ln = clamp(l, 0, 100) / 100
  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const hp = (((h % 360) + 360) % 360) / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  const m = ln - c / 2

  let rgb: [number, number, number]
  if (hp < 1) rgb = [c, x, 0]
  else if (hp < 2) rgb = [x, c, 0]
  else if (hp < 3) rgb = [0, c, x]
  else if (hp < 4) rgb = [0, x, c]
  else if (hp < 5) rgb = [x, 0, c]
  else rgb = [c, 0, x]

  return rgbToHex({
    r: (rgb[0] + m) * 255,
    g: (rgb[1] + m) * 255,
    b: (rgb[2] + m) * 255,
  })
}

/** Tailwind-style ramp steps and the lightness each one targets. */
export const RAMP_STEPS = [25, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const

const RAMP_LIGHTNESS: Record<number, number> = {
  25: 97.5,
  50: 95,
  100: 90,
  200: 82,
  300: 72,
  400: 63,
  500: 55,
  600: 47,
  700: 39,
  800: 32,
  900: 26,
  950: 16,
}

/** Saturation is pulled in at the pale end so tints do not look neon. */
const RAMP_SATURATION_SCALE: Record<number, number> = {
  25: 0.55,
  50: 0.65,
  100: 0.75,
  200: 0.85,
  300: 0.92,
  400: 0.97,
  500: 1,
  600: 1,
  700: 0.98,
  800: 0.94,
  900: 0.9,
  950: 0.85,
}

/**
 * Builds a 12-step ramp around `hex`. The 500 step keeps the exact colour the
 * user picked so the palette always matches the swatch they clicked.
 */
export const buildRamp = (hex: string): Record<number, string> => {
  const base = hexToHsl(hex)
  const ramp: Record<number, string> = {}

  for (const step of RAMP_STEPS) {
    if (step === 500) {
      ramp[step] = normalizeHex(hex)
      continue
    }
    ramp[step] = hslToHex({
      h: base.h,
      s: clamp(base.s * RAMP_SATURATION_SCALE[step], 0, 100),
      l: RAMP_LIGHTNESS[step],
    })
  }

  return ramp
}

/** Neutral ramp with a configurable hue so the whole UI can be warmed or cooled. */
const NEUTRAL_LIGHTNESS: Record<number, number> = {
  25: 99,
  50: 98,
  100: 96,
  200: 91,
  300: 84,
  400: 68,
  500: 52,
  600: 40,
  700: 30,
  800: 21,
  900: 13,
  950: 9,
}

export const buildNeutralRamp = (hue: number, saturation: number): Record<number, string> => {
  const ramp: Record<number, string> = {}
  for (const step of RAMP_STEPS) {
    const lightness = NEUTRAL_LIGHTNESS[step]
    // Deep neutrals carry a touch more colour, which reads as intentional.
    const scale = lightness < 40 ? 1.4 : 1
    ramp[step] = hslToHex({ h: hue, s: clamp(saturation * scale, 0, 100), l: lightness })
  }
  return ramp
}

export const relativeLuminance = (hex: string): number => {
  const { r, g, b } = hexToRgb(hex)
  const channel = (value: number) => {
    const v = value / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export const contrastRatio = (a: string, b: string): number => {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [light, dark] = la > lb ? [la, lb] : [lb, la]
  return (light + 0.05) / (dark + 0.05)
}

/** Black or white, whichever stays readable on `hex`. */
export const readableTextOn = (hex: string): string =>
  contrastRatio(hex, '#ffffff') >= 4.5 ? '#ffffff' : '#101828'

export const withAlpha = (hex: string, alpha: number): string => {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`
}

/** Deterministic pleasant colour for a name — used for member monograms. */
export const colorFromString = (value: string): string => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return hslToHex({ h: hue, s: 62, l: 52 })
}
