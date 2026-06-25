/**
 * Seeded pseudo-randomness + color math.
 *
 * The mascots and the ambient field are *generative*: every team gets a stable
 * seed derived from its 3-letter code, so its mascot looks the same on every
 * visit but different from every other team's. Same seed → identical output.
 */

/** Deterministic 32-bit string hash (FNV-1a-ish). */
export function hashString(str: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** mulberry32 PRNG — tiny, fast, good enough for art. Returns a () => [0,1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A small bundle of seeded helpers built from a string seed. */
export function rngFromString(seed: string) {
  const rand = mulberry32(hashString(seed))
  return {
    /** float in [min, max) */
    range: (min: number, max: number) => min + rand() * (max - min),
    /** integer in [min, max] inclusive */
    int: (min: number, max: number) => Math.floor(min + rand() * (max - min + 1)),
    /** true with probability p */
    chance: (p: number) => rand() < p,
    /** pick one element */
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)],
    raw: rand,
  }
}

/* ----------------------------- color helpers ------------------------------ */

export interface RGB {
  r: number
  g: number
  b: number
}

export function hexToRgb(hex: string): RGB {
  let h = hex.replace('#', '').trim()
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  }
  const n = parseInt(h, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function rgbToHex({ r, g, b }: RGB): string {
  const to = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

/** Relative luminance (WCAG) of an sRGB color, 0..1. */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const ch = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)
}

/** Readable ink color (#fff or near-black) to sit on top of a given color. */
export function readableInkOn(hex: string): string {
  return luminance(hex) > 0.45 ? '#15150f' : '#ffffff'
}

/** Mix two hex colors; t=0 → a, t=1 → b. */
export function mixHex(a: string, b: string, t: number): string {
  const ca = hexToRgb(a)
  const cb = hexToRgb(b)
  return rgbToHex({
    r: ca.r + (cb.r - ca.r) * t,
    g: ca.g + (cb.g - ca.g) * t,
    b: ca.b + (cb.b - ca.b) * t,
  })
}

/** An rgba() string from a hex + alpha. */
export function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Lighten a color toward white by amount t (0..1). */
export function lighten(hex: string, t: number): string {
  return mixHex(hex, '#ffffff', t)
}

/** Darken a color toward black by amount t (0..1). */
export function darken(hex: string, t: number): string {
  return mixHex(hex, '#000000', t)
}

/**
 * Adjust a team color into a readable *accent* for text/lines on the current
 * background. Light colors (yellow, white) get darkened for the gallery-white
 * canvas; dark colors (black, navy) get lightened for dark mode. The team's true
 * color is preserved separately (for fills like the mascot and bond bar).
 */
export function accentOn(hex: string, dark: boolean): string {
  let c = hex
  let guard = 0
  if (!dark) {
    while (luminance(c) > 0.42 && guard++ < 24) c = mixHex(c, '#000000', 0.1)
  } else {
    while (luminance(c) < 0.46 && guard++ < 24) c = mixHex(c, '#ffffff', 0.1)
  }
  return c
}
